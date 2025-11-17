import connectToDatabase from "@/lib/db/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send notification to user(s)
 */
export async function sendNotification({
  user,
  type,
  title,
  message,
  actor,
  refType,
  refId,
  metadata = {},
}) {
  await connectToDatabase();

  const notification = await Notification.create({
    user,
    type,
    title,
    message,
    actor,
    refType,
    refId,
    metadata,
  });

  return notification;
}

/**
 * Send email notification
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = "ZPB <noreply@yourdomain.com>",
}) {
  try {
    await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

/**
 * Notify admins about new onboarding submission
 */
export async function notifyAdminsOnboardingSubmitted(newUser) {
  await connectToDatabase();

  // Get all admin and HR users
  const admins = await User.find({
    roles: { $in: ["admin", "hr"] },
    isActive: { $ne: false },
  }).select("_id username email");

  if (admins.length === 0) {
    console.log("No admins found to notify");
    return;
  }

  // Create notifications for each admin
  const notifications = admins.map((admin) => ({
    user: admin._id,
    type: "onboarding_submitted",
    title: "New Employee Application",
    message: `${newUser.username} has submitted their onboarding application and is waiting for approval.`,
    actor: newUser._id,
    refType: "User",
    refId: newUser._id,
    metadata: {
      userId: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
    },
  }));

  await Notification.insertMany(notifications);

  // Send email notifications
  const adminEmails = admins.map((admin) => admin.email);
  const emailHtml = `
    <h2>New Employee Application Submitted</h2>
    <p><strong>${newUser.username}</strong> (${newUser.email}) has submitted their onboarding application.</p>
    <p>Please review their profile and assign appropriate roles.</p>
    <p><a href="${process.env.NEXTAUTH_URL}/admin/users/${newUser._id}">Review Application</a></p>
    <p>Thanks,<br>ZPB System</p>
  `;

  await sendEmail({
    to: adminEmails,
    subject: `New Employee Application: ${newUser.username}`,
    html: emailHtml,
  });

  console.log(
    `Notified ${admins.length} admins about new user ${newUser.username}`
  );
}

/**
 * Notify user about approval/rejection
 */
export async function notifyUserAboutDecision(user, decision, admin) {
  await connectToDatabase();

  const isApproved = decision === "approved";
  const notificationType = isApproved ? "user_approved" : "user_rejected";
  const title = isApproved ? "Account Approved" : "Account Access Update";
  const message = isApproved
    ? `Your account has been approved by ${admin.username}. You now have access to the system.`
    : `Your account access has been updated by ${admin.username}.`;

  // Create notification for user
  await sendNotification({
    user: user._id,
    type: notificationType,
    title,
    message,
    actor: admin._id,
    refType: "User",
    refId: user._id,
  });

  // Send email to user
  const emailHtml = `
    <h2>${title}</h2>
    <p>${message}</p>
    ${
      isApproved
        ? "<p>You can now log in and access the system.</p>"
        : "<p>Please contact your administrator for more information.</p>"
    }
    <p><a href="${process.env.NEXTAUTH_URL}/auth/login">Login to ZPB</a></p>
    <p>Thanks,<br>The ZPB Team</p>
  `;

  await sendEmail({
    to: user.email,
    subject: `ZPB Account ${isApproved ? "Approved" : "Update"}`,
    html: emailHtml,
  });
}

/**
 * Send productivity report email (weekly / monthly) to all admins + HR
 */
export async function sendProductivityReportEmail({ period, report, summary }) {
  await connectToDatabase();

  const admins = await User.find({
    roles: { $in: ["admin", "hr"] },
    isActive: { $ne: false },
  })
    .select("username email")
    .lean();

  if (!admins.length) {
    console.log("No admins found to email productivity report");
    return;
  }

  const adminEmails = admins.map((a) => a.email).filter(Boolean);
  if (!adminEmails.length) {
    console.log(
      "Admins found but none have email addresses for productivity report"
    );
    return;
  }

  const label =
    report?.label ||
    (period === "weekly"
      ? "This Week"
      : period === "monthly"
      ? "This Month"
      : "This Period");
  const rangeFrom = report?.range?.from ? new Date(report.range.from) : null;
  const rangeTo = report?.range?.to ? new Date(report.range.to) : null;
  const metrics = report?.metrics || {};
  const comparison = report?.comparison || {};
  const deltas = report?.deltas || {};

  const formattedRange =
    rangeFrom && rangeTo
      ? `${rangeFrom.toLocaleDateString()} – ${rangeTo.toLocaleDateString()}`
      : "(range not available)";

  const completionRate = metrics.completionRate ?? 0;
  const completed = metrics.completed ?? 0;
  const created = metrics.created ?? 0;
  const avgCompletedPerDay = metrics.avgCompletedPerDay ?? 0;

  const prevCompleted = comparison.completed ?? 0;
  const prevCreated = comparison.created ?? 0;
  const prevCompletionRate = comparison.completionRate ?? 0;

  const deltaCompleted = deltas.completed ?? 0;
  const deltaCompletedPct = deltas.completedPct ?? 0;
  const deltaCompletionRate = deltas.completionRate ?? 0;

  const subjectPrefix =
    period === "weekly"
      ? "Weekly"
      : period === "monthly"
      ? "Monthly"
      : "Productivity";
  const subject = `${subjectPrefix} Productivity Report - ${formattedRange}`;

  const summaryText = summary || "No AI summary available for this period.";

  const html = `
    <h2>${subjectPrefix} Productivity Report</h2>
    <p><strong>Period:</strong> ${label} (${formattedRange})</p>
    <h3>AI Summary</h3>
    <p>${summaryText}</p>
    <h3>Key Metrics</h3>
    <ul>
      <li><strong>Completion Rate:</strong> ${completionRate}% (${
    deltaCompletionRate >= 0 ? "+" : ""
  }${deltaCompletionRate} pts vs prev)</li>
      <li><strong>Completed Tasks:</strong> ${completed} (${
    deltaCompleted >= 0 ? "+" : ""
  }${deltaCompleted}, ${
    deltaCompletedPct >= 0 ? "+" : ""
  }${deltaCompletedPct}% vs prev)</li>
      <li><strong>Created Tasks:</strong> ${created} (prev: ${prevCreated})</li>
      <li><strong>Avg Completed / Day:</strong> ${avgCompletedPerDay}</li>
    </ul>
    <h3>Previous Period</h3>
    <ul>
      <li><strong>Completed Tasks (prev):</strong> ${prevCompleted}</li>
      <li><strong>Completion Rate (prev):</strong> ${prevCompletionRate}%</li>
    </ul>
    <p>
      <a href="${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/admin/analytics">
        View full analytics dashboard
      </a>
    </p>
    <p>Thanks,<br/>ZPB System</p>
  `;

  await sendEmail({
    to: adminEmails,
    subject,
    html,
  });

  console.log(
    `Sent ${subjectPrefix.toLowerCase()} productivity report email to ${
      adminEmails.length
    } admins`
  );
}

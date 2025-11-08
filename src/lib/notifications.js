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
  metadata = {}
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
  from = "ZPB <noreply@yourdomain.com>"
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
    isActive: { $ne: false }
  }).select("_id username email");

  if (admins.length === 0) {
    console.log("No admins found to notify");
    return;
  }

  // Create notifications for each admin
  const notifications = admins.map(admin => ({
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
    }
  }));

  await Notification.insertMany(notifications);

  // Send email notifications
  const adminEmails = admins.map(admin => admin.email);
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

  console.log(`Notified ${admins.length} admins about new user ${newUser.username}`);
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
    ${isApproved ? '<p>You can now log in and access the system.</p>' : '<p>Please contact your administrator for more information.</p>'}
    <p><a href="${process.env.NEXTAUTH_URL}/auth/login">Login to ZPB</a></p>
    <p>Thanks,<br>The ZPB Team</p>
  `;

  await sendEmail({
    to: user.email,
    subject: `ZPB Account ${isApproved ? 'Approved' : 'Update'}`,
    html: emailHtml,
  });
}

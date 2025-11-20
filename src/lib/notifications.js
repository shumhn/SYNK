import connectToDatabase from "@/lib/db/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import Task from "@/models/Task";
import { Resend } from "resend";
import webpush from "web-push";

const resend = new Resend(process.env.RESEND_API_KEY);

// Configure web-push (requires VAPID keys in env)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@zalient.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send push notification to user
 */
async function sendPushNotification(userId, payload) {
  try {
    const PushSubscription = (await import("@/models/PushSubscription"))
      .default;

    const subscriptions = await PushSubscription.find({
      user: userId,
      active: true,
    }).lean();

    if (!subscriptions.length) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.message,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: {
        url: payload.url || "/notifications",
        ...payload.data,
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            pushPayload
          );
        } catch (error) {
          // If subscription expired (410), mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.updateOne(
              { _id: sub._id },
              { $set: { active: false } }
            );
          }
          throw error;
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    console.log(
      `Sent push notification to ${successCount}/${subscriptions.length} subscription(s)`
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Send notification to user(s) (in-app + optional email + push) respecting user preferences
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
  sendEmail: shouldSendEmail = false,
  sendPush: shouldSendPush = true,
}) {
  await connectToDatabase();

  const UserNotificationPreferences = (
    await import("@/models/UserNotificationPreferences")
  ).default;

  // Get user preferences
  const preferences = await UserNotificationPreferences.findOne({
    user,
  }).lean();
  const defaultPrefs = {
    email: { enabled: true, types: {} },
    push: { enabled: true, types: {} },
    inApp: { enabled: true, types: {} },
  };
  const prefs = { ...defaultPrefs, ...preferences };

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

  // Send push notification if enabled and type allowed
  if (sendPush && prefs.push.enabled && prefs.push.types[type] !== false) {
    sendPushNotification(user, {
      title,
      message,
      data: {
        notificationId: notification._id.toString(),
        type,
        refType,
        refId,
      },
    }).catch((err) => console.error("Push notification failed:", err));
  }

  // Optionally send email for critical notifications if enabled and type allowed
  if (
    shouldSendEmail &&
    prefs.email.enabled &&
    prefs.email.types[type] !== false
  ) {
    const userDoc = await User.findById(user).select("email username").lean();
    if (userDoc && userDoc.email) {
      await sendEmail({
        to: userDoc.email,
        subject: title,
        html: `
          <h2>${title}</h2>
          <p>${message}</p>
          <p><a href="${
            process.env.NEXTAUTH_URL || "http://localhost:3000"
          }/notifications">View in ZPB</a></p>
          <p>Thanks,<br/>ZPB System</p>
        `,
      }).catch((err) => console.error("Email notification failed:", err));
    }
  }

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

/**
 * Send deadline reminders for tasks due in the next 24/48 hours
 */
export async function sendDeadlineReminders() {
  await connectToDatabase();

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Find tasks due in next 24-48h that are not completed
  const upcomingTasks = await Task.find({
    dueDate: { $gte: now, $lte: in48Hours },
    status: { $nin: ["completed"] },
  })
    .populate("assignee", "username email")
    .populate("assignees", "username email")
    .populate("project", "title")
    .lean();

  if (!upcomingTasks.length) {
    console.log("No upcoming deadlines to remind about");
    return;
  }

  // Group tasks by assignee
  const userTasksMap = new Map();

  for (const task of upcomingTasks) {
    const assigneeList = [];
    if (task.assignee) assigneeList.push(task.assignee);
    if (task.assignees && task.assignees.length) {
      assigneeList.push(...task.assignees);
    }

    for (const user of assigneeList) {
      if (!user || !user.email) continue;
      const userId = user._id.toString();
      if (!userTasksMap.has(userId)) {
        userTasksMap.set(userId, { user, tasks: [] });
      }
      userTasksMap.get(userId).tasks.push(task);
    }
  }

  // Send email and in-app notification to each user
  for (const [userId, { user, tasks }] of userTasksMap) {
    const dueSoon24 = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) <= in24Hours
    );
    const dueSoon48 = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) > in24Hours &&
        new Date(t.dueDate) <= in48Hours
    );

    const subject = `Upcoming Deadlines: ${tasks.length} task${
      tasks.length > 1 ? "s" : ""
    } due soon`;

    let html = `
      <h2>Upcoming Deadline Reminder</h2>
      <p>Hi <strong>${user.username}</strong>,</p>
      <p>You have <strong>${tasks.length}</strong> task${
      tasks.length > 1 ? "s" : ""
    } with upcoming deadlines:</p>
    `;

    if (dueSoon24.length) {
      html += `<h3>Due in the next 24 hours (${dueSoon24.length})</h3><ul>`;
      for (const t of dueSoon24) {
        const dueStr = new Date(t.dueDate).toLocaleString();
        const projectName = t.project?.title || "No project";
        html += `<li><strong>${t.title}</strong> - ${projectName}<br/><small>Due: ${dueStr}</small></li>`;
      }
      html += `</ul>`;
    }

    if (dueSoon48.length) {
      html += `<h3>Due in 24-48 hours (${dueSoon48.length})</h3><ul>`;
      for (const t of dueSoon48) {
        const dueStr = new Date(t.dueDate).toLocaleString();
        const projectName = t.project?.title || "No project";
        html += `<li><strong>${t.title}</strong> - ${projectName}<br/><small>Due: ${dueStr}</small></li>`;
      }
      html += `</ul>`;
    }

    html += `
      <p><a href="${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/tasks">View your tasks</a></p>
      <p>Thanks,<br/>ZPB System</p>
    `;

    // Send email
    await sendEmail({
      to: user.email,
      subject,
      html,
    });

    // Create in-app notification for each task
    for (const task of tasks) {
      const dueStr = new Date(task.dueDate).toLocaleDateString();
      await sendNotification({
        user: user._id,
        type: "deadline_reminder",
        title: "Upcoming Deadline",
        message: `Task "${task.title}" is due on ${dueStr}`,
        refType: "Task",
        refId: task._id,
        metadata: {
          taskId: task._id.toString(),
          taskTitle: task.title,
          dueDate: task.dueDate,
        },
      });
    }

    console.log(
      `Sent deadline reminder to ${user.email} for ${tasks.length} task(s)`
    );
  }

  console.log(
    `Deadline reminders sent to ${userTasksMap.size} user(s) for ${upcomingTasks.length} task(s)`
  );
}

/**
 * Auto-archive completed projects after X days of completion
 */
export async function autoArchiveCompletedProjects(daysAfterCompletion = 30) {
  await connectToDatabase();
  const Project = (await import("@/models/Project")).default;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAfterCompletion);

  // Find completed projects not yet archived, last updated before cutoff
  const projectsToArchive = await Project.find({
    status: "completed",
    archived: { $ne: true },
    updatedAt: { $lte: cutoffDate },
  }).lean();

  if (!projectsToArchive.length) {
    console.log("No completed projects to auto-archive");
    return;
  }

  const projectIds = projectsToArchive.map((p) => p._id);

  await Project.updateMany(
    { _id: { $in: projectIds } },
    { $set: { archived: true } }
  );

  console.log(
    `Auto-archived ${projectsToArchive.length} completed project(s) after ${daysAfterCompletion} days`
  );
}

/**
 * Escalate overdue tasks to manager/HR
 */
export async function escalateOverdueTasks() {
  await connectToDatabase();

  const now = new Date();

  // Find overdue tasks (dueDate passed, not completed)
  const overdueTasks = await Task.find({
    dueDate: { $lt: now },
    status: { $nin: ["completed"] },
  })
    .populate("assignee", "username email")
    .populate("assignees", "username email")
    .populate("project", "title managers")
    .populate({
      path: "project",
      populate: { path: "managers", select: "username email" },
    })
    .lean();

  if (!overdueTasks.length) {
    console.log("No overdue tasks to escalate");
    return;
  }

  // Notify assignees directly about their overdue tasks
  for (const task of overdueTasks) {
    const assigneeUsers = [];

    if (task.assignee) assigneeUsers.push(task.assignee);
    if (Array.isArray(task.assignees) && task.assignees.length) {
      assigneeUsers.push(...task.assignees);
    }

    // Deduplicate by user id
    const uniqueAssignees = Array.from(
      new Map(
        assigneeUsers
          .filter((u) => u && u._id)
          .map((u) => [u._id.toString(), u])
      ).values()
    );

    if (!uniqueAssignees.length) continue;

    const dueStr = new Date(task.dueDate).toLocaleDateString();
    const projectName = task.project?.title || "No project";
    const daysOverdue = Math.ceil(
      (now - new Date(task.dueDate)) / (24 * 60 * 60 * 1000)
    );

    for (const assignee of uniqueAssignees) {
      await sendNotification({
        user: assignee._id,
        type: "task_overdue",
        title: "Task Overdue",
        message: `Task "${task.title}" in ${projectName} is ${daysOverdue} day${
          daysOverdue > 1 ? "s" : ""
        } overdue (due ${dueStr}).`,
        refType: "Task",
        refId: task._id,
        metadata: {
          taskId: task._id.toString(),
          taskTitle: task.title,
          projectTitle: projectName,
          dueDate: task.dueDate,
          daysOverdue,
        },
        sendEmail: true,
        sendPush: true,
      });
    }
  }

  // Get all admin and HR users
  const adminsHR = await User.find({
    roles: { $in: ["admin", "hr"] },
    isActive: { $ne: false },
  })
    .select("username email")
    .lean();

  const escalationRecipients = new Map();

  for (const task of overdueTasks) {
    const recipients = [];

    // Add project managers
    if (task.project?.managers && task.project.managers.length) {
      recipients.push(...task.project.managers.filter((m) => m && m.email));
    }

    // Add admins and HR
    recipients.push(...adminsHR.filter((a) => a && a.email));

    // Deduplicate by email
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.email, r])).values()
    );

    for (const recipient of uniqueRecipients) {
      const key = recipient.email;
      if (!escalationRecipients.has(key)) {
        escalationRecipients.set(key, { user: recipient, tasks: [] });
      }
      escalationRecipients.get(key).tasks.push(task);
    }
  }

  // Send escalation emails and create notifications
  for (const [email, { user, tasks }] of escalationRecipients) {
    const subject = `Overdue Task Escalation: ${tasks.length} task${
      tasks.length > 1 ? "s" : ""
    } require attention`;

    let html = `
      <h2>Overdue Task Escalation</h2>
      <p>Hi <strong>${user.username}</strong>,</p>
      <p>The following <strong>${tasks.length}</strong> task${
      tasks.length > 1 ? "s are" : " is"
    } overdue and require immediate attention:</p>
      <ul>
    `;

    for (const task of tasks) {
      const dueStr = new Date(task.dueDate).toLocaleDateString();
      const projectName = task.project?.title || "No project";
      const assigneeName = task.assignee?.username || "Unassigned";
      const daysOverdue = Math.ceil(
        (now - new Date(task.dueDate)) / (24 * 60 * 60 * 1000)
      );

      html += `
        <li>
          <strong>${task.title}</strong> - ${projectName}<br/>
          <small>Assignee: ${assigneeName} | Due: ${dueStr} (<span style="color: red;">${daysOverdue} day${
        daysOverdue > 1 ? "s" : ""
      } overdue</span>)</small>
        </li>
      `;
    }

    html += `
      </ul>
      <p><a href="${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/admin/tasks">View all tasks</a></p>
      <p>Thanks,<br/>ZPB System</p>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
    });

    // Create in-app notification
    await sendNotification({
      user: user._id,
      type: "overdue_escalation",
      title: "Overdue Task Escalation",
      message: `${tasks.length} overdue task${
        tasks.length > 1 ? "s" : ""
      } require attention`,
      refType: "Task",
      refId: tasks[0]._id,
      metadata: {
        overdueCount: tasks.length,
        taskIds: tasks.map((t) => t._id.toString()),
      },
    });

    console.log(
      `Sent overdue escalation to ${email} for ${tasks.length} task(s)`
    );
  }

  console.log(
    `Overdue escalations sent to ${escalationRecipients.size} recipient(s) for ${overdueTasks.length} task(s)`
  );
}

/**
 * Generate instances of recurring tasks
 */
export async function generateRecurringTasks() {
  await connectToDatabase();

  const now = new Date();

  // Find tasks with recurring enabled, not ended, and due for generation
  const recurringTasks = await Task.find({
    "recurring.enabled": true,
    $or: [
      { "recurring.endDate": { $exists: false } },
      { "recurring.endDate": null },
      { "recurring.endDate": { $gte: now } },
    ],
  })
    .populate("project", "title")
    .lean();

  if (!recurringTasks.length) {
    console.log("No recurring tasks to generate");
    return;
  }

  let generatedCount = 0;

  for (const task of recurringTasks) {
    const { frequency, interval, lastGenerated, endDate } = task.recurring;

    // Calculate next due date
    const lastGen = lastGenerated
      ? new Date(lastGenerated)
      : new Date(task.createdAt);
    const nextDue = new Date(lastGen);

    switch (frequency) {
      case "daily":
        nextDue.setDate(nextDue.getDate() + interval);
        break;
      case "weekly":
        nextDue.setDate(nextDue.getDate() + interval * 7);
        break;
      case "monthly":
        nextDue.setMonth(nextDue.getMonth() + interval);
        break;
      case "yearly":
        nextDue.setFullYear(nextDue.getFullYear() + interval);
        break;
    }

    // Check if it's time to generate
    if (nextDue > now) continue;

    // Check if endDate has passed
    if (endDate && new Date(endDate) < now) {
      // Disable recurring
      await Task.updateOne(
        { _id: task._id },
        { $set: { "recurring.enabled": false } }
      );
      console.log(`Disabled recurring for task ${task._id} (endDate reached)`);
      continue;
    }

    // Create new instance
    const newTask = {
      project: task.project._id,
      milestone: task.milestone,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      assignees: task.assignees,
      status: "todo",
      priority: task.priority,
      taskType: task.taskType,
      dueDate: nextDue,
      tags: task.tags,
      checklist: task.checklist?.map((item) => ({ ...item, completed: false })),
      recurring: {
        enabled: false, // New instance is not recurring
        frequency: null,
        interval: null,
      },
      parentTask: task._id,
    };

    await Task.create(newTask);

    // Update lastGenerated on original
    await Task.updateOne(
      { _id: task._id },
      { $set: { "recurring.lastGenerated": now } }
    );

    generatedCount++;
    console.log(`Generated recurring instance for task: ${task.title}`);
  }

  console.log(`Generated ${generatedCount} recurring task instance(s)`);
}

/**
 * Workflow trigger: Notify HR/manager when a task is completed
 */
export async function notifyTaskCompletion(taskId) {
  await connectToDatabase();

  const task = await Task.findById(taskId)
    .populate("assignee", "username email")
    .populate("project", "title managers")
    .populate({
      path: "project",
      populate: { path: "managers", select: "username email" },
    })
    .lean();

  if (!task) {
    console.log(`Task ${taskId} not found for completion notification`);
    return;
  }

  // Get HR and admins
  const adminsHR = await User.find({
    roles: { $in: ["admin", "hr"] },
    isActive: { $ne: false },
  })
    .select("username email")
    .lean();

  const recipients = [];

  // Add project managers
  if (task.project?.managers && task.project.managers.length) {
    recipients.push(...task.project.managers.filter((m) => m && m.email));
  }

  // Add HR and admins
  recipients.push(...adminsHR.filter((a) => a && a.email));

  // Deduplicate
  const uniqueRecipients = Array.from(
    new Map(recipients.map((r) => [r.email, r])).values()
  );

  if (!uniqueRecipients.length) {
    console.log("No recipients found for task completion notification");
    return;
  }

  const subject = `Task Completed: ${task.title}`;
  const assigneeName = task.assignee?.username || "Unassigned";
  const projectName = task.project?.title || "No project";
  const completedDate = task.completedAt
    ? new Date(task.completedAt).toLocaleString()
    : new Date().toLocaleString();

  const html = `
    <h2>Task Completed</h2>
    <p>The following task has been completed:</p>
    <ul>
      <li><strong>Task:</strong> ${task.title}</li>
      <li><strong>Project:</strong> ${projectName}</li>
      <li><strong>Assignee:</strong> ${assigneeName}</li>
      <li><strong>Completed:</strong> ${completedDate}</li>
    </ul>
    <p><a href="${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/admin/tasks">View all tasks</a></p>
    <p>Thanks,<br/>ZPB System</p>
  `;

  // Send emails
  for (const recipient of uniqueRecipients) {
    await sendEmail({
      to: recipient.email,
      subject,
      html,
    });

    // Create in-app notification
    await sendNotification({
      user: recipient._id,
      type: "task_completed",
      title: "Task Completed",
      message: `${task.title} was completed by ${assigneeName}`,
      refType: "Task",
      refId: task._id,
      metadata: {
        taskId: task._id.toString(),
        taskTitle: task.title,
        assignee: assigneeName,
        project: projectName,
      },
    });
  }

  console.log(
    `Sent task completion notification for "${task.title}" to ${uniqueRecipients.length} recipient(s)`
  );
}

/**
 * Send daily digest email to user with activities from the past 24 hours
 */
export async function sendDailyDigest(userId) {
  await connectToDatabase();

  const UserNotificationPreferences = (
    await import("@/models/UserNotificationPreferences")
  ).default;

  // Check if user wants daily digest
  const prefs = await UserNotificationPreferences.findOne({
    user: userId,
  }).lean();
  if (prefs && prefs.email.types.daily_digest === false) {
    return; // User opted out
  }

  const user = await User.findById(userId).select("username email").lean();
  if (!user || !user.email) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Get recent notifications
  const recentNotifications = await Notification.find({
    user: userId,
    createdAt: { $gte: yesterday },
    isRead: false,
  })
    .populate("actor", "username")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Get assigned tasks
  const assignedTasks = await Task.find({
    $or: [{ assignee: userId }, { assignees: userId }],
    status: { $ne: "completed" },
  })
    .populate("project", "title")
    .select("title project dueDate priority status")
    .limit(10)
    .lean();

  // Get overdue tasks
  const overdueTasks = await Task.find({
    $or: [{ assignee: userId }, { assignees: userId }],
    dueDate: { $lt: new Date() },
    status: { $ne: "completed" },
  })
    .populate("project", "title")
    .select("title project dueDate")
    .lean();

  if (
    !recentNotifications.length &&
    !assignedTasks.length &&
    !overdueTasks.length
  ) {
    return; // No activity to report
  }

  const subject = `Daily Digest - ${new Date().toLocaleDateString()}`;

  let html = `
    <h1>Daily Digest</h1>
    <p>Hi <strong>${user.username}</strong>,</p>
    <p>Here's your activity summary for the past 24 hours:</p>
  `;

  if (recentNotifications.length > 0) {
    html += `<h2>Recent Activity</h2><ul>`;
    for (const notification of recentNotifications) {
      const time = notification.createdAt.toLocaleTimeString();
      html += `<li><strong>${notification.title}</strong> - ${time}</li>`;
    }
    html += `</ul>`;
  }

  if (assignedTasks.length > 0) {
    html += `<h2>Your Active Tasks</h2><ul>`;
    for (const task of assignedTasks) {
      const dueStr = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString()
        : "No due date";
      const priority =
        task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
      html += `<li><strong>${task.title}</strong> - ${
        task.project?.title || "No project"
      }<br/><small>Priority: ${priority} | Due: ${dueStr} | Status: ${
        task.status
      }</small></li>`;
    }
    html += `</ul>`;
  }

  if (overdueTasks.length > 0) {
    html += `<h2 style="color: red;">Overdue Tasks</h2><ul style="color: red;">`;
    for (const task of overdueTasks) {
      const dueStr = new Date(task.dueDate).toLocaleDateString();
      const daysOverdue = Math.ceil(
        (new Date() - new Date(task.dueDate)) / (24 * 60 * 60 * 1000)
      );
      html += `<li><strong>${task.title}</strong> - ${
        task.project?.title || "No project"
      }<br/><small>Due: ${dueStr} (${daysOverdue} day${
        daysOverdue > 1 ? "s" : ""
      } overdue)</small></li>`;
    }
    html += `</ul>`;
  }

  html += `
    <p><a href="${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/dashboard">View Dashboard</a></p>
    <p>Thanks,<br/>ZPB System</p>
    <p><small>You can update your notification preferences in your profile settings.</small></p>
  `;

  await sendEmail({
    to: user.email,
    subject,
    html,
  });

  console.log(
    `Sent daily digest to ${user.email} (${recentNotifications.length} notifications, ${assignedTasks.length} tasks)`
  );
}

/**
 * Send daily digests to all users who have them enabled
 */
export async function sendAllDailyDigests() {
  await connectToDatabase();

  const UserNotificationPreferences = (
    await import("@/models/UserNotificationPreferences")
  ).default;

  // Find all users with daily digest enabled
  const usersWithDigest = await UserNotificationPreferences.find({
    "email.enabled": true,
    "email.types.daily_digest": { $ne: false },
  })
    .select("user")
    .lean();

  console.log(`Sending daily digests to ${usersWithDigest.length} users`);

  for (const pref of usersWithDigest) {
    try {
      await sendDailyDigest(pref.user);
    } catch (error) {
      console.error(`Failed to send daily digest to user ${pref.user}:`, error);
    }
  }

  console.log(`Daily digests sent to ${usersWithDigest.length} users`);
}

/**
 * Notify user when assigned to a task
 */
export async function notifyTaskAssignment(taskId, assigneeId, actorId) {
  await connectToDatabase();

  const task = await Task.findById(taskId).populate("project", "title").lean();

  if (!task) return;

  await sendNotification({
    user: assigneeId,
    type: "task_assigned",
    title: "New Task Assigned",
    message: `You've been assigned to "${task.title}"`,
    actor: actorId,
    refType: "Task",
    refId: taskId,
    metadata: {
      taskTitle: task.title,
      projectTitle: task.project?.title,
    },
    sendEmail: true,
    sendPush: true,
  });

  console.log(`Notified user ${assigneeId} of task assignment: ${task.title}`);
}

/**
 * Notify user when mentioned in a comment/message
 */
export async function notifyMention(
  mentionedUserId,
  actorId,
  refType,
  refId,
  context
) {
  await connectToDatabase();

  await sendNotification({
    user: mentionedUserId,
    type: "mention",
    title: "You were mentioned",
    message:
      context.message || `You were mentioned in a ${refType.toLowerCase()}`,
    actor: actorId,
    refType,
    refId,
    metadata: context,
    sendEmail: false,
    sendPush: true,
  });

  console.log(`Notified user ${mentionedUserId} of mention`);
}

/**
 * Notify relevant users when a file is uploaded
 */
export async function notifyFileUpload(fileData, actorId) {
  await connectToDatabase();

  const { refType, refId, filename, url } = fileData;

  let recipients = [];

  if (refType === "Task") {
    const task = await Task.findById(refId)
      .populate("assignee", "_id")
      .populate("assignees", "_id")
      .lean();

    if (task) {
      if (task.assignee) recipients.push(task.assignee._id);
      if (task.assignees) recipients.push(...task.assignees.map((a) => a._id));
    }
  } else if (refType === "Project") {
    const Project = (await import("@/models/Project")).default;
    const project = await Project.findById(refId)
      .populate("managers", "_id")
      .populate("members", "_id")
      .lean();

    if (project) {
      if (project.managers)
        recipients.push(...project.managers.map((m) => m._id));
      if (project.members)
        recipients.push(...project.members.map((m) => m._id));
    }
  }

  // Remove actor and duplicates
  recipients = [...new Set(recipients.map((r) => r.toString()))].filter(
    (id) => id !== actorId.toString()
  );

  for (const userId of recipients) {
    await sendNotification({
      user: userId,
      type: "file_uploaded",
      title: "New File Uploaded",
      message: `${filename} was uploaded`,
      actor: actorId,
      refType,
      refId,
      metadata: { filename, url },
      sendEmail: false,
      sendPush: true,
    });
  }

  console.log(
    `Notified ${recipients.length} user(s) of file upload: ${filename}`
  );
}

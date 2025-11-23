import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@zalient.com';

/**
 * Send a generic email
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const msg = {
      to,
      from: FROM_EMAIL,
      subject,
      html,
      text: text || stripHtml(html),
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error.response?.body || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(user) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Welcome to Zalient Productive!</h1>
      <p>Hi ${user.username},</p>
      <p>Your account has been successfully created. You can now log in and start managing your projects and tasks.</p>
      <p>Get started by:</p>
      <ul>
        <li>Completing your profile</li>
        <li>Exploring the dashboard</li>
        <li>Creating your first project</li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p style="margin-top: 30px;">Best regards,<br><strong>Zalient Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Welcome to Zalient Productive!',
    html
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(user, resetLink) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Password Reset Request</h1>
      <p>Hi ${user.username},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
      <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      <p style="margin-top: 30px;">Best regards,<br><strong>Zalient Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html
  });
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentEmail(user, task, assignedBy) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">New Task Assigned</h1>
      <p>Hi ${user.username},</p>
      <p><strong>${assignedBy.username}</strong> has assigned you a new task:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; color: #333;">${task.title}</h2>
        <p style="margin: 0; color: #666;">${task.description || 'No description provided'}</p>
        <p style="margin-top: 15px; color: #999; font-size: 14px;">
          Priority: <strong>${task.priority || 'Medium'}</strong> | 
          Status: <strong>${task.status || 'Pending'}</strong>
        </p>
      </div>
      <p>Log in to view more details and start working on this task.</p>
      <p style="margin-top: 30px;">Best regards,<br><strong>Zalient Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `New Task: ${task.title}`,
    html
  });
}

/**
 * Send project invitation email
 */
export async function sendProjectInvitationEmail(user, project, invitedBy) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Project Invitation</h1>
      <p>Hi ${user.username},</p>
      <p><strong>${invitedBy.username}</strong> has invited you to collaborate on a project:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; color: #333;">${project.title}</h2>
        <p style="margin: 0; color: #666;">${project.description || 'No description provided'}</p>
      </div>
      <p>Log in to accept the invitation and start collaborating!</p>
      <p style="margin-top: 30px;">Best regards,<br><strong>Zalient Team</strong></p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Project Invitation: ${project.title}`,
    html
  });
}

// Helper to strip HTML tags for plain text version
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

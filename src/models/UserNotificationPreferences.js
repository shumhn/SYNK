import mongoose from "mongoose";

const UserNotificationPreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    email: {
      enabled: { type: Boolean, default: true },
      types: {
        task_assigned: { type: Boolean, default: true },
        task_comment: { type: Boolean, default: true },
        task_due_soon: { type: Boolean, default: true },
        task_overdue: { type: Boolean, default: true },
        project_invite: { type: Boolean, default: true },
        deadline_reminder: { type: Boolean, default: true },
        overdue_escalation: { type: Boolean, default: true },
        task_completed: { type: Boolean, default: false },
        file_uploaded: { type: Boolean, default: false },
        daily_digest: { type: Boolean, default: true },
      },
    },
    push: {
      enabled: { type: Boolean, default: true },
      types: {
        mention: { type: Boolean, default: true },
        task_assigned: { type: Boolean, default: true },
        task_comment: { type: Boolean, default: true },
        task_due_soon: { type: Boolean, default: true },
        task_overdue: { type: Boolean, default: true },
        file_uploaded: { type: Boolean, default: true },
        project_invite: { type: Boolean, default: true },
      },
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      types: {
        mention: { type: Boolean, default: true },
        task_assigned: { type: Boolean, default: true },
        task_comment: { type: Boolean, default: true },
        task_due_soon: { type: Boolean, default: true },
        task_overdue: { type: Boolean, default: true },
        project_invite: { type: Boolean, default: true },
        deadline_reminder: { type: Boolean, default: true },
        overdue_escalation: { type: Boolean, default: true },
        task_completed: { type: Boolean, default: true },
        file_uploaded: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.UserNotificationPreferences ||
  mongoose.model(
    "UserNotificationPreferences",
    UserNotificationPreferencesSchema
  );

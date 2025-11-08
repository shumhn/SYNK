import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "mention", // @mentioned in message/comment
        "reaction", // someone reacted to your message
        "reply", // someone replied to your message
        "task_assigned", // assigned to a task
        "task_comment", // comment on your task
        "project_invite", // invited to project
        "task_due_soon", // task due in 24h
        "task_overdue", // task is overdue
      ],
      index: true,
    },
    title: { type: String, required: true },
    message: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Who triggered this notification
    refType: { type: String, enum: ["Task", "Project", "ProjectMessage", "TaskComment"] },
    refId: mongoose.Schema.Types.ObjectId, // Reference to the related object
    metadata: mongoose.Schema.Types.Mixed, // Additional context
    readAt: Date,
    clickedAt: Date,
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Indexes for efficient queries
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 }); // Unread notifications
NotificationSchema.index({ user: 1, createdAt: -1 }); // All notifications
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

import mongoose from "mongoose";
import { broadcastEvent } from "@/app/api/events/subscribe/route";

const AuditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: { 
      type: String, 
      required: true,
      enum: [
        "login", "logout", "login_failed", "password_reset_requested", "password_reset_completed",
        "2fa_enabled", "2fa_disabled", "2fa_verified", "2fa_failed",
        "user_created", "user_updated", "user_deleted", "user_activated", "user_deactivated",
        "project_created", "project_updated", "project_deleted",
        "task_created", "task_updated", "task_deleted",
        "role_assigned", "role_removed", "permission_granted", "permission_revoked",
        "data_exported", "data_deleted", // GDPR
      ],
      index: true,
    },
    resource: { type: String }, // Resource type: User, Project, Task, etc.
    resourceId: { type: mongoose.Schema.Types.ObjectId }, // ID of the affected resource
    details: { type: mongoose.Schema.Types.Mixed }, // Additional context
    ip: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ["success", "failure"], default: "success" },
  },
  { timestamps: true }
);

// Indexes for efficient queries
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resourceId: 1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

// Broadcast real-time activity on creation
AuditLogSchema.post("save", function (doc) {
  try {
    broadcastEvent({
      type: "activity",
      id: String(doc._id),
      action: doc.action,
      status: doc.status || "success",
      userId: doc.user ? String(doc.user) : null,
      resource: doc.resource || null,
      resourceId: doc.resourceId ? String(doc.resourceId) : null,
      ts: doc.createdAt,
    });
  } catch (e) {
    // ignore broadcast failures
  }
});

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

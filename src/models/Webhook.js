import mongoose from "mongoose";

const WebhookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    events: [
      {
        type: String,
        enum: [
          "task.created",
          "task.updated",
          "task.completed",
          "task.deleted",
          "project.created",
          "project.updated",
          "project.completed",
          "project.deleted",
          "user.created",
          "user.updated",
          "report.generated",
        ],
      },
    ],
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    secret: { type: String }, // Optional secret for HMAC signature
    retryAttempts: { type: Number, default: 3 },
    lastTriggered: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

WebhookSchema.index({ active: 1, events: 1 });

export default mongoose.models.Webhook ||
  mongoose.model("Webhook", WebhookSchema);

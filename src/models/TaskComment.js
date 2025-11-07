import mongoose from "mongoose";

const TaskCommentSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    attachments: [
      {
        filename: { type: String },
        url: { type: String },
        size: { type: Number },
      },
    ],
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

TaskCommentSchema.index({ task: 1, createdAt: -1 });

export default mongoose.models.TaskComment || mongoose.model("TaskComment", TaskCommentSchema);

import mongoose from "mongoose";

const ProjectMessageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    attachments: [{ filename: String, url: String, size: Number }],
  },
  { timestamps: true }
);

ProjectMessageSchema.index({ project: 1, createdAt: -1 });

export default mongoose.models.ProjectMessage || mongoose.model("ProjectMessage", ProjectMessageSchema);

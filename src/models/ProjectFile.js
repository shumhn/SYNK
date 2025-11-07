import mongoose from "mongoose";

const ProjectFileSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    size: { type: Number },
    url: { type: String, required: true },
    mimeType: { type: String },
  },
  { timestamps: true }
);

ProjectFileSchema.index({ project: 1, createdAt: -1 });

export default mongoose.models.ProjectFile || mongoose.model("ProjectFile", ProjectFileSchema);

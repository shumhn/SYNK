import mongoose from "mongoose";

const ProjectMessageSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: function () { return !this.channel; }, index: true },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", index: true }, // Optional: task-specific messages
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    contentType: { type: String, enum: ["text", "markdown"], default: "markdown" }, // Support rich text
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectMessage", index: true }, // Threading support
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // @user mentions
    reactions: [
      {
        emoji: { type: String, required: true }, // 👍 ❤️ 😂 etc.
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        filename: { type: String, required: true },
        url: { type: String, required: true },
        publicId: String, // Cloudinary public_id for management
        resourceType: String, // image, video, raw, etc.
        format: String, // jpg, png, pdf, etc.
        size: Number, // bytes
        width: Number, // for images/videos
        height: Number, // for images/videos
      },
    ],
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

// Indexes for efficient queries
ProjectMessageSchema.index({ project: 1, createdAt: -1 });
ProjectMessageSchema.index({ channel: 1, createdAt: -1 });
ProjectMessageSchema.index({ task: 1, createdAt: -1 });
ProjectMessageSchema.index({ parent: 1, createdAt: 1 }); // For thread replies
ProjectMessageSchema.index({ mentions: 1, createdAt: -1 }); // For user mentions

export default mongoose.models.ProjectMessage || mongoose.model("ProjectMessage", ProjectMessageSchema);

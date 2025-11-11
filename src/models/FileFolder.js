import mongoose from "mongoose";

const FileFolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    
    // Hierarchy
    parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: "FileFolder", index: true },
    path: { type: String, index: true }, // Full path for quick lookups, e.g., "/Project Files/Documents"
    
    // Context - folders belong to projects or tasks
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", index: true },
    
    // Ownership
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    
    // Access control
    visibility: { 
      type: String, 
      enum: ["public", "private", "team", "project"], 
      default: "project" 
    },
    aclRoles: [{ 
      type: String, 
      enum: ["admin", "hr", "manager", "employee", "viewer"] 
    }],
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Specific users with access
    
    // Settings
    color: String, // Hex color for visual organization
    icon: String, // Emoji or icon identifier
    
    // Status
    isArchived: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Indexes for efficient queries
FileFolderSchema.index({ project: 1, isArchived: 1, isDeleted: 1 });
FileFolderSchema.index({ task: 1, isArchived: 1, isDeleted: 1 });
FileFolderSchema.index({ parentFolder: 1 });
FileFolderSchema.index({ path: 1 });
FileFolderSchema.index({ createdBy: 1 });

// Pre-save hook to build full path
FileFolderSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isModified("parentFolder")) {
    if (this.parentFolder) {
      const parent = await this.constructor.findById(this.parentFolder);
      if (parent) {
        this.path = `${parent.path}/${this.name}`;
      } else {
        this.path = `/${this.name}`;
      }
    } else {
      this.path = `/${this.name}`;
    }
  }
  next();
});

export default mongoose.models.FileFolder || mongoose.model("FileFolder", FileFolderSchema);

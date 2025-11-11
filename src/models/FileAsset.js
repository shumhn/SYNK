import mongoose from "mongoose";

const FileAssetSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalFilename: String,
    url: { type: String, required: true }, // Cloudinary URL
    secureUrl: String, // HTTPS URL
    publicId: { type: String, required: true, index: true }, // Cloudinary public_id
    resourceType: { type: String, enum: ["image", "video", "raw", "auto"], default: "auto" },
    format: String, // jpg, png, pdf, mp4, etc.
    mimeType: String,
    size: Number, // bytes
    width: Number, // for images/videos
    height: Number, // for images/videos
    duration: Number, // for videos/audio (seconds)
    
    // Ownership and context
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", index: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "ProjectMessage", index: true },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "TaskComment", index: true },
    
    // Versioning
    versionGroupId: { type: mongoose.Schema.Types.ObjectId, index: true }, // Groups file versions together
    version: { type: Number, default: 1 },
    isLatestVersion: { type: Boolean, default: true, index: true },
    
    // Organization
    tags: [String],
    folder: String, // Cloudinary folder path
    fileFolder: { type: mongoose.Schema.Types.ObjectId, ref: "FileFolder", index: true }, // Custom folder organization
    description: String,
    
    // Access control
    visibility: { type: String, enum: ["public", "private", "team", "project"], default: "project" },
    aclRoles: [{ type: String, enum: ["admin", "hr", "manager", "employee", "viewer"] }],
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Specific users with access
    
    // Status
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    
    // Cloudinary metadata
    checksum: String, // For duplicate detection
    etag: String,
    cloudinaryMetadata: mongoose.Schema.Types.Mixed, // Full Cloudinary response
  },
  { timestamps: true }
);

// Indexes for efficient queries
FileAssetSchema.index({ project: 1, isArchived: 1, createdAt: -1 });
FileAssetSchema.index({ task: 1, isArchived: 1, createdAt: -1 });
FileAssetSchema.index({ uploadedBy: 1, createdAt: -1 });
FileAssetSchema.index({ versionGroupId: 1, version: -1 }); // For version history
FileAssetSchema.index({ tags: 1 }); // For tag-based search
FileAssetSchema.index({ checksum: 1 }); // For duplicate detection

export default mongoose.models.FileAsset || mongoose.model("FileAsset", FileAssetSchema);

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";
import mongoose from "mongoose";

/**
 * POST /api/files/[id]/restore
 * Restore a specific version as the latest version
 */
export async function POST(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid file ID" }, { status: 400 });
    }

    await connectToDatabase();

    const fileToRestore = await FileAsset.findById(id);
    if (!fileToRestore) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions (owner or admin)
    if (
      fileToRestore.uploadedBy.toString() !== String(user._id) &&
      !(user.roles || []).includes("admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already latest, no need to restore
    if (fileToRestore.isLatestVersion) {
      return NextResponse.json({ 
        error: false, 
        message: "This version is already the latest",
        data: fileToRestore 
      });
    }

    const versionGroupId = fileToRestore.versionGroupId || fileToRestore._id;

    // Get current highest version number
    const latestVersion = await FileAsset.findOne({ versionGroupId })
      .sort({ version: -1 })
      .lean();
    const newVersionNumber = (latestVersion?.version || 1) + 1;

    // Mark all versions as not latest
    await FileAsset.updateMany(
      { versionGroupId, isLatestVersion: true },
      { isLatestVersion: false }
    );

    // Create a new version based on the restored file
    const restoredVersion = await FileAsset.create({
      filename: fileToRestore.filename,
      originalFilename: fileToRestore.originalFilename,
      url: fileToRestore.url,
      secureUrl: fileToRestore.secureUrl,
      publicId: fileToRestore.publicId,
      resourceType: fileToRestore.resourceType,
      format: fileToRestore.format,
      mimeType: fileToRestore.mimeType,
      size: fileToRestore.size,
      width: fileToRestore.width,
      height: fileToRestore.height,
      duration: fileToRestore.duration,
      uploadedBy: String(user._id), // Current user restoring
      project: fileToRestore.project,
      task: fileToRestore.task,
      message: fileToRestore.message,
      comment: fileToRestore.comment,
      versionGroupId,
      version: newVersionNumber,
      isLatestVersion: true,
      tags: fileToRestore.tags,
      folder: fileToRestore.folder,
      description: `Restored from version ${fileToRestore.version}`,
      visibility: fileToRestore.visibility,
      checksum: fileToRestore.checksum,
      etag: fileToRestore.etag,
      cloudinaryMetadata: fileToRestore.cloudinaryMetadata,
    });

    const populated = await FileAsset.findById(restoredVersion._id)
      .populate("uploadedBy", "username email image")
      .lean();

    return NextResponse.json({ 
      error: false, 
      data: populated,
      message: `Version ${fileToRestore.version} restored as version ${newVersionNumber}`
    }, { status: 200 });
  } catch (error) {
    console.error("Error restoring file version:", error);
    return NextResponse.json(
      { error: "Failed to restore file version", details: error.message },
      { status: 500 }
    );
  }
}

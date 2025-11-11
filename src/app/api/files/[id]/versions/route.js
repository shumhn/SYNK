import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";
import mongoose from "mongoose";

/**
 * GET /api/files/[id]/versions
 * Get all versions of a file
 */
export async function GET(request, { params }) {
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

    // Get the file to find its version group
    const file = await FileAsset.findById(id).lean();
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // If file has no version group, it's the only version
    if (!file.versionGroupId) {
      const versions = [file];
      return NextResponse.json({ 
        error: false, 
        data: versions,
        currentVersion: file.version || 1,
        totalVersions: 1
      });
    }

    // Get all versions in the version group
    const versions = await FileAsset.find({
      versionGroupId: file.versionGroupId,
      isDeleted: false,
    })
      .populate("uploadedBy", "username email image")
      .sort({ version: -1 }) // Latest first
      .lean();

    return NextResponse.json({
      error: false,
      data: versions,
      currentVersion: file.version,
      totalVersions: versions.length,
    });
  } catch (error) {
    console.error("Error fetching file versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch file versions", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/[id]/versions
 * Create a new version by uploading a new file
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

    const existingFile = await FileAsset.findById(id);
    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check permissions (owner or admin)
    if (
      existingFile.uploadedBy.toString() !== String(user._id) &&
      !(user.roles || []).includes("admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      filename,
      url,
      secureUrl,
      publicId,
      resourceType,
      format,
      mimeType,
      size,
      width,
      height,
      duration,
      cloudinaryMetadata,
    } = body;

    // Validate required fields
    if (!filename || !url || !publicId) {
      return NextResponse.json(
        { error: "Missing required fields: filename, url, publicId" },
        { status: 400 }
      );
    }

    // Determine version group
    const versionGroupId = existingFile.versionGroupId || existingFile._id;
    const latestVersion = await FileAsset.findOne({ versionGroupId })
      .sort({ version: -1 })
      .lean();
    const newVersion = (latestVersion?.version || existingFile.version || 1) + 1;

    // Mark all previous versions as not latest
    await FileAsset.updateMany(
      { versionGroupId, isLatestVersion: true },
      { isLatestVersion: false }
    );

    // If original file doesn't have a version group, set it
    if (!existingFile.versionGroupId) {
      await FileAsset.findByIdAndUpdate(id, {
        versionGroupId: existingFile._id,
        isLatestVersion: false,
      });
    }

    // Create new version
    const newFileVersion = await FileAsset.create({
      filename,
      originalFilename: existingFile.originalFilename,
      url,
      secureUrl: secureUrl || url,
      publicId,
      resourceType,
      format,
      mimeType,
      size,
      width,
      height,
      duration,
      uploadedBy: String(user._id),
      project: existingFile.project,
      task: existingFile.task,
      message: existingFile.message,
      comment: existingFile.comment,
      versionGroupId,
      version: newVersion,
      isLatestVersion: true,
      tags: existingFile.tags,
      folder: existingFile.folder,
      description: existingFile.description,
      visibility: existingFile.visibility,
      checksum: cloudinaryMetadata?.etag,
      etag: cloudinaryMetadata?.etag,
      cloudinaryMetadata,
    });

    const populated = await FileAsset.findById(newFileVersion._id)
      .populate("uploadedBy", "username email image")
      .lean();

    return NextResponse.json({ error: false, data: populated }, { status: 201 });
  } catch (error) {
    console.error("Error creating file version:", error);
    return NextResponse.json(
      { error: "Failed to create file version", details: error.message },
      { status: 500 }
    );
  }
}

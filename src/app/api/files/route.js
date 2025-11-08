import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";

/**
 * POST /api/files
 * Create a FileAsset record after successful Cloudinary upload
 * Called by client after file is uploaded to Cloudinary
 */
export async function POST(request) {
  try {
    // Verify authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      filename,
      originalFilename,
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
      project,
      task,
      message,
      comment,
      tags,
      folder,
      description,
      visibility,
      cloudinaryMetadata,
    } = body;

    // Validate required fields
    if (!filename || !url || !publicId) {
      return NextResponse.json(
        { error: "Missing required fields: filename, url, publicId" },
        { status: 400 }
      );
    }

    // Check for duplicate by checksum (if provided)
    let versionGroupId = null;
    let version = 1;
    if (cloudinaryMetadata?.etag) {
      const existing = await FileAsset.findOne({
        checksum: cloudinaryMetadata.etag,
        versionGroupId: { $exists: true },
      }).sort({ version: -1 });

      if (existing) {
        // This is a new version of an existing file
        versionGroupId = existing.versionGroupId;
        version = existing.version + 1;

        // Mark previous version as not latest
        await FileAsset.updateMany(
          { versionGroupId, isLatestVersion: true },
          { isLatestVersion: false }
        );
      }
    }

    // Create FileAsset record
    const fileAsset = await FileAsset.create({
      filename,
      originalFilename: originalFilename || filename,
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
      project,
      task,
      message,
      comment,
      versionGroupId: versionGroupId || undefined,
      version,
      isLatestVersion: true,
      tags: tags || [],
      folder,
      description,
      visibility: visibility || "project",
      checksum: cloudinaryMetadata?.etag,
      etag: cloudinaryMetadata?.etag,
      cloudinaryMetadata,
    });

    return NextResponse.json(fileAsset, { status: 201 });
  } catch (error) {
    console.error("Error creating file asset:", error);
    return NextResponse.json(
      { error: "Failed to create file asset", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files
 * List files with filters
 */
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const task = searchParams.get("task");
    const uploadedBy = searchParams.get("uploadedBy");
    const resourceType = searchParams.get("resourceType");
    const isArchived = searchParams.get("isArchived") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build query
    const query = { isDeleted: false };
    if (project) query.project = project;
    if (task) query.task = task;
    if (uploadedBy) query.uploadedBy = uploadedBy;
    if (resourceType) query.resourceType = resourceType;
    query.isArchived = isArchived;

    // Execute query
    const [files, total] = await Promise.all([
      FileAsset.find(query)
        .populate("uploadedBy", "username email image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FileAsset.countDocuments(query),
    ]);

    return NextResponse.json({
      data: files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files", details: error.message },
      { status: 500 }
    );
  }
}

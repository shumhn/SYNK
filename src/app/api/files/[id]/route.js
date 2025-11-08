import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";

/**
 * GET /api/files/[id]
 * Get a single file asset
 */
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const file = await FileAsset.findById(params.id)
      .populate("uploadedBy", "username email image")
      .lean();

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check access permissions
    // TODO: Implement role-based access control based on file.visibility and file.aclRoles

    return NextResponse.json(file);
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[id]
 * Update file metadata (tags, description, visibility, etc.)
 */
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const file = await FileAsset.findById(params.id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if user has permission to update (owner or admin)
    if (
      file.uploadedBy.toString() !== String(user._id) &&
      !(user.roles || []).includes("admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { tags, description, visibility, aclRoles } = body;

    // Update allowed fields
    if (tags !== undefined) file.tags = tags;
    if (description !== undefined) file.description = description;
    if (visibility !== undefined) file.visibility = visibility;
    if (aclRoles !== undefined) file.aclRoles = aclRoles;

    await file.save();

    return NextResponse.json(file);
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Failed to update file", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id]
 * Soft delete a file (mark as deleted, don't remove from Cloudinary immediately)
 */
export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const file = await FileAsset.findById(params.id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if user has permission to delete (owner or admin)
    if (
      file.uploadedBy.toString() !== authResult.user.id &&
      !authResult.user.roles?.includes("admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    // TODO: Schedule Cloudinary deletion via background job
    // For now, we keep the file on Cloudinary for recovery

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file", details: error.message },
      { status: 500 }
    );
  }
}

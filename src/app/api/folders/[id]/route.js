import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileFolder from "@/models/FileFolder";
import FileAsset from "@/models/FileAsset";
import mongoose from "mongoose";

/**
 * GET /api/folders/[id]
 * Get a single folder with its contents
 */
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    await connectToDatabase();

    const folder = await FileFolder.findById(id)
      .populate("createdBy", "username email image")
      .populate("project", "title")
      .populate("task", "title")
      .populate("parentFolder", "name path")
      .lean();

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Check access
    if (!user.roles?.includes("admin")) {
      if (folder.visibility === "private" && folder.createdBy._id.toString() !== user._id.toString()) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (folder.allowedUsers?.length > 0 && !folder.allowedUsers.some((u) => u.toString() === user._id.toString())) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (folder.aclRoles?.length > 0 && !user.roles?.some((role) => folder.aclRoles.includes(role))) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Get subfolders
    const subfolders = await FileFolder.find({
      parentFolder: id,
      isDeleted: false,
      isArchived: false,
    })
      .populate("createdBy", "username email")
      .sort({ name: 1 })
      .lean();

    // Get files in folder
    const files = await FileAsset.find({
      fileFolder: id,
      isDeleted: false,
      isArchived: false,
      isLatestVersion: true,
    })
      .populate("uploadedBy", "username email image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      error: false,
      data: {
        folder,
        subfolders,
        files,
      },
    });
  } catch (error) {
    console.error("Error fetching folder:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/folders/[id]
 * Update folder metadata
 */
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    await connectToDatabase();

    const folder = await FileFolder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Check permissions
    if (
      folder.createdBy.toString() !== user._id.toString() &&
      !user.roles?.includes("admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      visibility,
      aclRoles,
      allowedUsers,
      color,
      icon,
    } = body;

    // Update fields
    if (name?.trim()) folder.name = name.trim();
    if (description !== undefined) folder.description = description;
    if (visibility) folder.visibility = visibility;
    if (aclRoles !== undefined) folder.aclRoles = aclRoles;
    if (allowedUsers !== undefined) folder.allowedUsers = allowedUsers;
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;

    await folder.save();

    const populated = await FileFolder.findById(id)
      .populate("createdBy", "username email image")
      .populate("project", "title")
      .populate("task", "title")
      .populate("parentFolder", "name path")
      .lean();

    return NextResponse.json({ error: false, data: populated });
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Failed to update folder", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/folders/[id]
 * Delete a folder (soft delete)
 */
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
    }

    await connectToDatabase();

    const folder = await FileFolder.findById(id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Check permissions
    if (
      folder.createdBy.toString() !== user._id.toString() &&
      !user.roles?.includes("admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete
    folder.isDeleted = true;
    await folder.save();

    // Also mark all files in folder as deleted (optional - you may want to move them instead)
    // await FileAsset.updateMany({ fileFolder: id }, { isDeleted: true });

    return NextResponse.json({ error: false, message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Failed to delete folder", details: error.message },
      { status: 500 }
    );
  }
}

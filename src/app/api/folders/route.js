import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileFolder from "@/models/FileFolder";

/**
 * GET /api/folders
 * List folders with optional filters
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
    const parentFolder = searchParams.get("parentFolder");

    // Build query
    const query = { isDeleted: false, isArchived: false };
    if (project) query.project = project;
    if (task) query.task = task;
    if (parentFolder) {
      query.parentFolder = parentFolder === "root" ? null : parentFolder;
    }

    // Fetch folders with access control check
    const folders = await FileFolder.find(query)
      .populate("createdBy", "username email image")
      .populate("project", "title")
      .populate("task", "title")
      .populate("parentFolder", "name path")
      .sort({ name: 1 })
      .lean();

    // Filter by access control
    const accessibleFolders = folders.filter((folder) => {
      // Admin can see all
      if (user.roles?.includes("admin")) return true;

      // Private folders only visible to creator
      if (folder.visibility === "private") {
        return folder.createdBy._id.toString() === user._id.toString();
      }

      // Check if user is in allowedUsers
      if (folder.allowedUsers?.length > 0) {
        if (!folder.allowedUsers.some((u) => u.toString() === user._id.toString())) {
          return false;
        }
      }

      // Check role-based access
      if (folder.aclRoles?.length > 0) {
        const hasRole = user.roles?.some((role) => folder.aclRoles.includes(role));
        if (!hasRole) return false;
      }

      return true;
    });

    return NextResponse.json({ error: false, data: accessibleFolders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/folders
 * Create a new folder
 */
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      name,
      description,
      parentFolder,
      project,
      task,
      visibility,
      aclRoles,
      allowedUsers,
      color,
      icon,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate folder name in same location
    const duplicateQuery = {
      name: name.trim(),
      isDeleted: false,
      parentFolder: parentFolder || null,
    };
    if (project) duplicateQuery.project = project;
    if (task) duplicateQuery.task = task;

    const existing = await FileFolder.findOne(duplicateQuery);
    if (existing) {
      return NextResponse.json(
        { error: "A folder with this name already exists in this location" },
        { status: 400 }
      );
    }

    // Create folder
    const folder = await FileFolder.create({
      name: name.trim(),
      description,
      parentFolder: parentFolder || undefined,
      project,
      task,
      createdBy: user._id,
      visibility: visibility || "project",
      aclRoles: aclRoles || [],
      allowedUsers: allowedUsers || [],
      color,
      icon,
    });

    const populated = await FileFolder.findById(folder._id)
      .populate("createdBy", "username email image")
      .populate("project", "title")
      .populate("task", "title")
      .populate("parentFolder", "name path")
      .lean();

    return NextResponse.json({ error: false, data: populated }, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder", details: error.message },
      { status: 500 }
    );
  }
}

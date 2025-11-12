import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";

/**
 * PUT /api/files/[id]/tags
 * Update tags for a file
 */
export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = params;
    const { tags } = await request.json();

    // Validate tags
    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Tags must be an array" },
        { status: 400 }
      );
    }

    // Update file tags
    const updatedFile = await FileAsset.findByIdAndUpdate(
      id,
      { tags: tags.filter(tag => tag && typeof tag === 'string').map(tag => tag.trim()) },
      { new: true }
    ).populate("uploadedBy", "username email image");

    if (!updatedFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error("Error updating file tags:", error);
    return NextResponse.json(
      { error: "Failed to update tags", details: error.message },
      { status: 500 }
    );
  }
}

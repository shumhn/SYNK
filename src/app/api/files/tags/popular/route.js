import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";

/**
 * GET /api/files/tags/popular
 * Get popular tags across all files
 */
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Aggregate popular tags
    const popularTags = await FileAsset.aggregate([
      {
        $match: {
          isDeleted: false,
          tags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: "$tags"
      },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    return NextResponse.json({ data: popularTags });
  } catch (error) {
    console.error("Error fetching popular tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch popular tags", details: error.message },
      { status: 500 }
    );
  }
}

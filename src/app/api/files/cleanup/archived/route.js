import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import FileAsset from "@/models/FileAsset";

/**
 * POST /api/files/cleanup/archived
 * Clean up archived file versions older than retention period
 * This should be called by a cron job or scheduled task
 */
export async function POST(request) {
  try {
    await connectToDatabase();

    // Get retention period from environment (default 30 days)
    const retentionDays = parseInt(process.env.ARCHIVED_VERSIONS_RETENTION_DAYS || "30");
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Find archived files older than retention period that are not the latest version
    const oldArchivedVersions = await FileAsset.find({
      isArchived: true,
      isLatestVersion: false,
      archivedAt: { $lt: cutoffDate },
      isDeleted: false
    });

    if (oldArchivedVersions.length === 0) {
      return NextResponse.json({
        message: "No archived versions to clean up",
        cleaned: 0
      });
    }

    // Mark as deleted (soft delete)
    const result = await FileAsset.updateMany(
      {
        _id: { $in: oldArchivedVersions.map(f => f._id) }
      },
      {
        isDeleted: true,
        deletedAt: new Date()
      }
    );

    return NextResponse.json({
      message: `Cleaned up ${result.modifiedCount} archived file versions`,
      cleaned: result.modifiedCount,
      retentionDays,
      cutoffDate
    });

  } catch (error) {
    console.error("Error cleaning up archived versions:", error);
    return NextResponse.json(
      { error: "Failed to clean up archived versions", details: error.message },
      { status: 500 }
    );
  }
}

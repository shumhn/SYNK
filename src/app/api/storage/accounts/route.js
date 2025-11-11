import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import ExternalStorageAccount from "@/models/ExternalStorageAccount";

/**
 * GET /api/storage/accounts
 * Get user's connected storage accounts
 */
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const accounts = await ExternalStorageAccount.find({
      user: user._id,
      isRevoked: false,
    })
      .select("-accessToken -refreshToken") // Don't send tokens to client
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ error: false, data: accounts });
  } catch (error) {
    console.error("Error fetching storage accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/storage/accounts
 * Disconnect a storage account
 */
export async function DELETE(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    await ExternalStorageAccount.findOneAndUpdate(
      { user: user._id, provider },
      { isActive: false, isRevoked: true }
    );

    return NextResponse.json({ error: false, message: "Account disconnected" });
  } catch (error) {
    console.error("Error disconnecting storage account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account", details: error.message },
      { status: 500 }
    );
  }
}

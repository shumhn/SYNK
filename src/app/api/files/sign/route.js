import { NextResponse } from "next/server";
import { generateUploadSignature } from "@/lib/cloudinary";
import { getAuthUser } from "@/lib/auth/guard";

/**
 * POST /api/files/sign
 * Generate signed upload parameters for Cloudinary
 * Used by client to securely upload files without exposing API secret
 */
export async function POST(request) {
  try {
    // Verify authentication
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { folder, resourceType, context } = body;

    // Validate inputs
    if (resourceType && !["image", "video", "raw", "auto"].includes(resourceType)) {
      return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
    }

    // Generate signed upload parameters
    const signatureData = generateUploadSignature({
      folder: folder || `zpb/${context || "uploads"}`,
      extraParams: {
        ...(resourceType && { resource_type: resourceType }),
      },
    });

    return NextResponse.json({
      ...signatureData,
      userId: String(user._id),
    });
  } catch (error) {
    console.error("Error generating upload signature:", error);
    return NextResponse.json(
      { error: "Failed to generate upload signature", details: error.message },
      { status: 500 }
    );
  }
}

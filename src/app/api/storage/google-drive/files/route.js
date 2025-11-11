import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import ExternalStorageAccount from "@/models/ExternalStorageAccount";

/**
 * GET /api/storage/google-drive/files
 * List files from user's Google Drive
 */
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const account = await ExternalStorageAccount.findOne({
      user: user._id,
      provider: "google_drive",
      isActive: true,
      isRevoked: false,
    });

    if (!account) {
      return NextResponse.json(
        { error: "Google Drive not connected" },
        { status: 404 }
      );
    }

    // Check if token is expired and refresh if needed
    if (account.expiresAt && new Date() > account.expiresAt) {
      await refreshGoogleToken(account);
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || "root";
    const pageToken = searchParams.get("pageToken");

    const accessToken = account.getAccessToken();

    // Build Google Drive API query
    const apiUrl = new URL("https://www.googleapis.com/drive/v3/files");
    apiUrl.searchParams.set("q", `'${folderId}' in parents and trashed=false`);
    apiUrl.searchParams.set("fields", "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink)");
    apiUrl.searchParams.set("pageSize", "50");
    if (pageToken) apiUrl.searchParams.set("pageToken", pageToken);

    const response = await fetch(apiUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch files from Google Drive");
    }

    const data = await response.json();

    return NextResponse.json({
      error: false,
      data: {
        files: data.files || [],
        nextPageToken: data.nextPageToken,
        account: {
          email: account.accountEmail,
          name: account.accountName,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching Google Drive files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storage/google-drive/files
 * Import file from Google Drive to Cloudinary
 */
export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const account = await ExternalStorageAccount.findOne({
      user: user._id,
      provider: "google_drive",
      isActive: true,
      isRevoked: false,
    });

    if (!account) {
      return NextResponse.json(
        { error: "Google Drive not connected" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { fileId, project, task, fileFolder } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    const accessToken = account.getAccessToken();

    // Get file metadata
    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,modifiedTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metadataResponse.ok) {
      throw new Error("Failed to fetch file metadata");
    }

    const metadata = await metadataResponse.json();

    // Download file content
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!downloadResponse.ok) {
      throw new Error("Failed to download file from Google Drive");
    }

    const fileBuffer = await downloadResponse.arrayBuffer();
    const fileBlob = new Blob([fileBuffer]);

    // Upload to Cloudinary
    const cloudinaryResponse = await uploadToCloudinary(
      fileBlob,
      metadata.name,
      metadata.mimeType
    );

    // Create FileAsset record
    const FileAsset = (await import("@/models/FileAsset")).default;
    const fileAsset = await FileAsset.create({
      filename: metadata.name,
      originalFilename: metadata.name,
      url: cloudinaryResponse.url,
      secureUrl: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      resourceType: cloudinaryResponse.resource_type,
      format: cloudinaryResponse.format,
      mimeType: metadata.mimeType,
      size: metadata.size,
      uploadedBy: user._id,
      project,
      task,
      fileFolder,
      description: `Imported from Google Drive`,
      cloudinaryMetadata: cloudinaryResponse,
    });

    return NextResponse.json({ error: false, data: fileAsset }, { status: 201 });
  } catch (error) {
    console.error("Error importing file from Google Drive:", error);
    return NextResponse.json(
      { error: "Failed to import file", details: error.message },
      { status: 500 }
    );
  }
}

async function refreshGoogleToken(account) {
  const refreshToken = account.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    account.isRevoked = true;
    await account.save();
    throw new Error("Failed to refresh Google Drive token");
  }

  const tokens = await response.json();
  account.accessToken = tokens.access_token;
  account.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await account.save();
}

async function uploadToCloudinary(blob, filename, mimeType) {
  // Get upload signature
  const sigResponse = await fetch("/api/uploads/cloudinary/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ folder: "imported" }),
  });

  const sig = await sigResponse.json();
  if (sig.error) throw new Error("Failed to get Cloudinary signature");

  const { cloudName, apiKey, timestamp, signature, folder } = sig.data;

  // Upload file
  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  if (folder) formData.append("folder", folder);
  formData.append("signature", signature);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!uploadResponse.ok) throw new Error("Cloudinary upload failed");

  return await uploadResponse.json();
}

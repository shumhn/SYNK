import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import ExternalStorageAccount from "@/models/ExternalStorageAccount";
import { generateUploadSignature } from "@/lib/cloudinary";

/**
 * GET /api/storage/dropbox/files
 * List files from user's Dropbox
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
      provider: "dropbox",
      isActive: true,
      isRevoked: false,
    });

    if (!account) {
      return NextResponse.json(
        { error: "Dropbox not connected" },
        { status: 404 }
      );
    }

    // Refresh token if expired
    if (account.expiresAt && new Date() > account.expiresAt) {
      await refreshDropboxToken(account);
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || ""; // root is empty string for Dropbox

    const accessToken = account.getAccessToken ? account.getAccessToken() : account.accessToken;

    const listUrl = "https://api.dropboxapi.com/2/files/list_folder";
    let listRes = await fetch(listUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path,
        recursive: false,
        include_media_info: false,
        include_deleted: false,
        limit: 50,
      }),
    });

    // If invalid/expired token, attempt one refresh + retry
    if (!listRes.ok && (listRes.status === 401 || listRes.status === 400)) {
      let bodyText = await listRes.text().catch(() => "");
      let errCode = "";
      try {
        const json = JSON.parse(bodyText);
        errCode = (json && (json.error?.[".tag"] || json.error || json.error_summary)) || "";
      } catch {}
      if (errCode.includes("invalid_access_token") || errCode.includes("expired_access_token")) {
        await refreshDropboxToken(account);
        const retryToken = account.getAccessToken ? account.getAccessToken() : account.accessToken;
        listRes = await fetch(listUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${retryToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            recursive: false,
            include_media_info: false,
            include_deleted: false,
            limit: 50,
          }),
        });
      }
    }

    if (!listRes.ok) {
      const text = await listRes.text().catch(() => "");
      throw new Error(`Failed to fetch Dropbox files: ${listRes.status} ${text.substring(0, 150)}`);
    }

    const listData = await listRes.json();
    const files = (listData.entries || []).map((e) => ({
      id: e.id,
      name: e.name,
      path_display: e.path_display,
      size: e.size,
      // mark folders so UI can detect
      mimeType: e[".tag"] === "folder" ? "folder" : (e.mime_type || ""),
    }));

    return NextResponse.json({
      error: false,
      data: {
        files,
        account: {
          email: account.accountEmail,
          name: account.accountName,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching Dropbox files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/storage/dropbox/files
 * Import a file from Dropbox into Cloudinary and create a FileAsset
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
      provider: "dropbox",
      isActive: true,
      isRevoked: false,
    });

    if (!account) {
      return NextResponse.json(
        { error: "Dropbox not connected" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { path, project, task, fileFolder } = body || {};

    if (!path) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 });
    }

    // Refresh token if expired
    if (account.expiresAt && new Date() > account.expiresAt) {
      await refreshDropboxToken(account);
    }

    const accessToken = account.getAccessToken ? account.getAccessToken() : account.accessToken;

    // Download file bytes from Dropbox
    const dlRes = await fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Dropbox-API-Arg": JSON.stringify({ path }),
      },
    });

    if (!dlRes.ok) {
      const text = await dlRes.text().catch(() => "");
      throw new Error(`Failed to download file from Dropbox: ${dlRes.status} ${text.substring(0, 150)}`);
    }

    // Filename from header if available
    const nameHeader = dlRes.headers.get("dropbox-api-result");
    let filename = "file";
    try {
      if (nameHeader) {
        const meta = JSON.parse(nameHeader);
        filename = meta.name || filename;
      }
    } catch {}

    const buffer = await dlRes.arrayBuffer();
    const blob = new Blob([buffer]);

    const cloudinaryResponse = await uploadToCloudinary(blob, filename);

    // Create FileAsset record
    const FileAsset = (await import("@/models/FileAsset")).default;
    const fileAsset = await FileAsset.create({
      filename,
      originalFilename: filename,
      url: cloudinaryResponse.url,
      secureUrl: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      resourceType: cloudinaryResponse.resource_type,
      format: cloudinaryResponse.format,
      size: cloudinaryResponse.bytes,
      uploadedBy: user._id,
      project,
      task,
      fileFolder,
      description: "Imported from Dropbox",
      cloudinaryMetadata: cloudinaryResponse,
    });

    return NextResponse.json({ error: false, data: fileAsset }, { status: 201 });
  } catch (error) {
    console.error("Error importing file from Dropbox:", error);
    return NextResponse.json(
      { error: "Failed to import file", details: error.message },
      { status: 500 }
    );
  }
}

async function refreshDropboxToken(account) {
  const refreshToken = account.getRefreshToken ? account.getRefreshToken() : account.refreshToken;
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.DROPBOX_CLIENT_ID,
      client_secret: process.env.DROPBOX_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    account.isRevoked = true;
    await account.save();
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to refresh Dropbox token: ${text.substring(0, 150)}`);
  }

  const tokens = await response.json();
  account.accessToken = tokens.access_token;
  if (tokens.expires_in) {
    account.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  }
  await account.save();
}

async function uploadToCloudinary(blob, filename) {
  // Generate upload signature using shared utility
  const sig = generateUploadSignature({ folder: "imported" });

  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  if (sig.folder) formData.append("folder", sig.folder);
  if (sig.uploadPreset) formData.append("upload_preset", sig.uploadPreset);
  formData.append("signature", sig.signature);

  const uploadResponse = await fetch(sig.uploadUrl, {
    method: "POST",
    body: formData
  });

  if (!uploadResponse.ok) throw new Error("Cloudinary upload failed");

  return await uploadResponse.json();
}

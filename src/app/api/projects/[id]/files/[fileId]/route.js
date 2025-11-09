import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import ProjectFile from "@/models/ProjectFile";
import { requireRoles } from "@/lib/auth/guard";
import crypto from "crypto";

function parseCloudinaryFromEnv() {
  const url = process.env.CLOUDINARY_URL || "";
  if (url.startsWith("cloudinary://")) {
    try {
      const without = url.replace("cloudinary://", "");
      const [creds, cloud] = without.split("@");
      const [apiKey, apiSecret] = creds.split(":");
      return { cloudName: cloud, apiKey, apiSecret };
    } catch (e) {}
  }
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

function badId(msg = "Invalid id") {
  return NextResponse.json({ error: true, message: msg }, { status: 400 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, fileId } = await params;
  if (!mongoose.isValidObjectId(id)) return badId("Invalid project id");
  if (!mongoose.isValidObjectId(fileId)) return badId("Invalid file id");

  await connectToDatabase();
  const file = await ProjectFile.findOne({ _id: fileId, project: id });
  if (!file) return NextResponse.json({ error: true, message: "File not found" }, { status: 404 });

  // Allow delete if admin/hr/manager or uploader
  const isPrivileged = ["admin", "hr", "manager"].some((r) => auth.user.roles?.includes(r));
  const isOwner = String(file.uploadedBy) === String(auth.user._id);
  if (!isPrivileged && !isOwner) {
    return NextResponse.json({ error: true, message: "Not allowed" }, { status: 403 });
  }

  // If we have Cloudinary publicId, attempt to destroy the asset (best-effort)
  if (file.publicId) {
    const { cloudName, apiKey, apiSecret } = parseCloudinaryFromEnv();
    if (cloudName && apiKey && apiSecret) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const toSign = `public_id=${file.publicId}&timestamp=${timestamp}` + apiSecret;
        const signature = crypto.createHash("sha1").update(toSign).digest("hex");
        const resourceType = file.mimeType?.startsWith("video") ? "video" : "image";
        const fd = new URLSearchParams();
        fd.set("public_id", file.publicId);
        fd.set("timestamp", String(timestamp));
        fd.set("api_key", apiKey);
        fd.set("signature", signature);
        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: fd.toString(),
        });
      } catch (e) {
        // ignore errors from Cloudinary destroy to avoid blocking UX
      }
    }
  }

  await ProjectFile.deleteOne({ _id: fileId });
  return NextResponse.json({ error: false, message: "Deleted" }, { status: 200 });
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import ProjectFile from "@/models/ProjectFile";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const files = await ProjectFile.find({ project: id })
    .populate("uploadedBy", "username email")
    .sort({ createdAt: -1 })
    .lean();
  
  return NextResponse.json({ error: false, data: files }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { filename, url, size, mimeType } = body;
  if (!filename?.trim() || !url?.trim()) {
    return NextResponse.json({ error: true, message: { filename: ["Filename and URL required"] } }, { status: 400 });
  }
  
  await connectToDatabase();
  const created = await ProjectFile.create({
    project: id,
    uploadedBy: auth.user._id,
    filename: filename.trim(),
    url: url.trim(),
    size: size || undefined,
    mimeType: mimeType || undefined,
  });
  
  const populated = await ProjectFile.findById(created._id).populate("uploadedBy", "username email").lean();
  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}

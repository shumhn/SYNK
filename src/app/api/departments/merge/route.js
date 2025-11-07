import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import Team from "@/models/Team";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const body = await req.json();
  const { sourceId, targetId, archiveSource = true } = body || {};
  if (!mongoose.isValidObjectId(sourceId) || !mongoose.isValidObjectId(targetId) || sourceId === targetId) {
    return NextResponse.json({ error: true, message: "Invalid source/target" }, { status: 400 });
  }

  await connectToDatabase();
  const [source, target] = await Promise.all([
    Department.findById(sourceId).lean(),
    Department.findById(targetId).lean(),
  ]);
  if (!source || !target) return NextResponse.json({ error: true, message: "Department not found" }, { status: 404 });

  // Move teams
  await Team.updateMany({ department: sourceId }, { $set: { department: targetId } });

  // Move users
  await User.updateMany({ department: sourceId }, { $set: { department: targetId } });

  // Merge KPIs (by key): sum current/target if kpi exists in both, else append
  const targetDept = await Department.findById(targetId);
  const sourceDept = await Department.findById(sourceId);
  const kpiMap = new Map((targetDept.kpis || []).map((k) => [k.key, k]));
  for (const k of sourceDept.kpis || []) {
    if (kpiMap.has(k.key)) {
      const tk = kpiMap.get(k.key);
      tk.current = (tk.current || 0) + (k.current || 0);
      tk.target = Math.max(tk.target || 0, k.target || 0);
      tk.lastUpdatedAt = new Date();
    } else {
      targetDept.kpis.push(k);
    }
  }
  await targetDept.save();

  if (archiveSource) {
    await Department.updateOne({ _id: sourceId }, { $set: { archived: true, managers: [], head: null } });
  }

  return NextResponse.json({ error: false, message: "Merged" }, { status: 200 });
}

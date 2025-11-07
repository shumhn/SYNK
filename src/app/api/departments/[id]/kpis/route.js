import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid department id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const dep = await Department.findById(id).select("kpis").lean();
  if (!dep) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: dep.kpis || [] }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json();
  const items = Array.isArray(body?.kpis) ? body.kpis : [];
  if (!items.length) return NextResponse.json({ error: true, message: "kpis array required" }, { status: 400 });

  await connectToDatabase();
  const dep = await Department.findById(id);
  if (!dep) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  const map = new Map((dep.kpis || []).map((k) => [k.key, k]));
  for (const inKpi of items) {
    const key = String(inKpi.key || "").trim();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.label = inKpi.label ?? existing.label;
      if (typeof inKpi.target === "number") existing.target = inKpi.target;
      if (typeof inKpi.current === "number") existing.current = inKpi.current;
      existing.unit = inKpi.unit ?? existing.unit;
      existing.lastUpdatedAt = new Date();
    } else {
      dep.kpis.push({
        key,
        label: String(inKpi.label || key),
        target: typeof inKpi.target === "number" ? inKpi.target : 0,
        current: typeof inKpi.current === "number" ? inKpi.current : 0,
        unit: inKpi.unit || undefined,
        lastUpdatedAt: new Date(),
      });
    }
  }

  await dep.save();
  return NextResponse.json({ error: false, data: dep.kpis }, { status: 200 });
}

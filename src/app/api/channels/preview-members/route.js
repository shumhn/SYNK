import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

// GET preview of member count for selected departments
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { searchParams } = new URL(req.url);
  const departmentsParam = searchParams.get("departments");
  
  if (!departmentsParam) {
    return NextResponse.json({ error: false, count: 0 }, { status: 200 });
  }
  
  const departments = departmentsParam.split(",").filter(Boolean);
  
  if (departments.length === 0) {
    return NextResponse.json({ error: false, count: 0 }, { status: 200 });
  }
  
  await connectToDatabase();
  
  // Count unique users across all selected departments
  const count = await User.countDocuments({ 
    department: { $in: departments },
    isActive: true 
  });
  
  return NextResponse.json({ error: false, count }, { status: 200 });
}

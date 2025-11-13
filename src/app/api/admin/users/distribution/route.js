import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";

export async function GET() {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    // Role distribution
    const roleAgg = await User.aggregate([
      { $unwind: { path: "$roles", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$roles", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Department distribution
    const deptAgg = await User.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
      { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, departmentId: "$dept._id", department: "$dept.name", count: 1 } },
    ]);

    return NextResponse.json({ error: false, data: { roles: roleAgg, departments: deptAgg } });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Department from "@/models/Department";

/**
 * GET /api/analytics/hr/departments/comparison?from&to
 * Returns performance comparison data for all departments
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Get all active departments
    const departments = await Department.find({ archived: { $ne: true } })
      .select("_id name color")
      .lean();

    if (departments.length === 0) {
      return NextResponse.json({
        error: false,
        data: { departments: [], comparison: [] }
      });
    }

    const comparisonData = [];

    // Process each department
    for (const dept of departments) {
      const deptId = dept._id;

      // Get users and projects for this department
      const usersInDept = await User.find({ department: deptId, isActive: true }).select("_id").lean();
      const userIds = usersInDept.map(u => u._id);

      const projectsInDept = await Project.find({ departments: deptId, archived: { $ne: true } }).select("_id").lean();
      const projectIds = projectsInDept.map(p => p._id);

      // Build task scope for this department
      const baseTaskScope = { $or: [] };
      if (userIds.length > 0) baseTaskScope.$or.push({ assignee: { $in: userIds } });
      if (projectIds.length > 0) baseTaskScope.$or.push({ project: { $in: projectIds } });
      
      if (baseTaskScope.$or.length === 0) {
        // No scope for this department
        comparisonData.push({
          departmentId: deptId,
          departmentName: dept.name,
          color: dept.color || "#6b7280",
          totalEmployees: 0,
          activeProjects: 0,
          completedTasks: 0,
          pendingTasks: 0,
          completionRate: 0,
          productivity: 0
        });
        continue;
      }

      // Build completed tasks filter with date range
      const completedFilter = { ...baseTaskScope, status: "completed" };
      if (from || to) {
        completedFilter.completedAt = {};
        if (from) completedFilter.completedAt.$gte = new Date(from);
        if (to) completedFilter.completedAt.$lte = new Date(to);
      }

      // Get metrics for this department
      const [totalEmployees, activeProjects, completedTasks, pendingTasks] = await Promise.all([
        User.countDocuments({ department: deptId, isActive: true }),
        Project.countDocuments({ departments: deptId, archived: { $ne: true }, status: { $nin: ["completed", "cancelled"] } }),
        Task.countDocuments(completedFilter),
        Task.countDocuments({ ...baseTaskScope, status: { $ne: "completed" } })
      ]);

      // Calculate derived metrics
      const totalTasks = completedTasks + pendingTasks;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const productivity = totalEmployees > 0 ? Math.round(completedTasks / totalEmployees * 10) / 10 : 0;

      comparisonData.push({
        departmentId: deptId,
        departmentName: dept.name,
        color: dept.color || "#6b7280",
        totalEmployees,
        activeProjects,
        completedTasks,
        pendingTasks,
        completionRate,
        productivity // completed tasks per employee
      });
    }

    // Sort by completion rate descending
    comparisonData.sort((a, b) => b.completionRate - a.completionRate);

    // Calculate organization averages for comparison
    const orgTotals = comparisonData.reduce((acc, dept) => ({
      totalEmployees: acc.totalEmployees + dept.totalEmployees,
      activeProjects: acc.activeProjects + dept.activeProjects,
      completedTasks: acc.completedTasks + dept.completedTasks,
      pendingTasks: acc.pendingTasks + dept.pendingTasks
    }), { totalEmployees: 0, activeProjects: 0, completedTasks: 0, pendingTasks: 0 });

    const orgAvg = {
      completionRate: orgTotals.completedTasks + orgTotals.pendingTasks > 0 
        ? Math.round((orgTotals.completedTasks / (orgTotals.completedTasks + orgTotals.pendingTasks)) * 100) 
        : 0,
      productivity: orgTotals.totalEmployees > 0 
        ? Math.round(orgTotals.completedTasks / orgTotals.totalEmployees * 10) / 10 
        : 0
    };

    return NextResponse.json({
      error: false,
      data: {
        departments: comparisonData,
        organizationAverage: orgAvg,
        summary: {
          totalDepartments: departments.length,
          topPerformer: comparisonData[0]?.departmentName || "N/A",
          avgCompletionRate: Math.round(comparisonData.reduce((sum, d) => sum + d.completionRate, 0) / (comparisonData.length || 1)),
          avgProductivity: Math.round(comparisonData.reduce((sum, d) => sum + d.productivity, 0) / (comparisonData.length || 1) * 10) / 10
        }
      }
    });

  } catch (e) {
    console.error("Error fetching department comparison:", e);
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

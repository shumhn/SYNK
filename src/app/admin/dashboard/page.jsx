import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import User from "@/models/User";
import DashboardClient from "@/components/admin/dashboard/dashboard-client";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");
  if (!token) redirect("/login");

  let userId;
  try {
    const decoded = jwt.verify(token.value, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch {
    redirect("/login");
  }

  await connectToDatabase();

  const user = await User.findById(userId).select("username email roles").lean();
  if (!user) redirect("/login");

  const [tasks, projects, users] = await Promise.all([
    Task.find({})
      .populate("assignee", "username email")
      .populate("assignees", "username email")
      .populate("project", "title")
      .select("title status priority dueDate createdAt completedAt progress assignee assignees project dependencies")
      .lean(),
    Project.find({})
      .select("title status progress managers members createdAt")
      .lean(),
    User.find({ roles: { $exists: true, $ne: [] } })
      .select("username email roles")
      .lean(),
  ]);

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const metrics = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === "completed").length,
    inProgressTasks: tasks.filter(t => t.status === "in_progress").length,
    blockedTasks: tasks.filter(t => t.status === "blocked").length,
    overdueTasks: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed").length,
    tasksCreatedThisWeek: tasks.filter(t => new Date(t.createdAt) >= oneWeekAgo).length,
    tasksCompletedThisWeek: tasks.filter(t => t.completedAt && new Date(t.completedAt) >= oneWeekAgo).length,
    totalProjects: projects.length,
    activeProjects: projects.filter(p => !["completed", "cancelled", "on_hold"].includes(p.status)).length,
    atRiskProjects: projects.filter(p => p.status === "at_risk" || p.status === "delayed").length,
    totalUsers: users.length,
  };

  const statusDist = {
    todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    review: tasks.filter(t => t.status === "review").length,
    completed: tasks.filter(t => t.status === "completed").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
  };

  const priorityDist = {
    low: tasks.filter(t => t.priority === "low").length,
    medium: tasks.filter(t => t.priority === "medium").length,
    high: tasks.filter(t => t.priority === "high").length,
    urgent: tasks.filter(t => t.priority === "urgent").length,
    critical: tasks.filter(t => t.priority === "critical").length,
  };

  const teamWorkload = users.slice(0, 10).map(u => {
    const userTasks = tasks.filter(t => 
      (t.assignee && t.assignee._id.toString() === u._id.toString()) ||
      (t.assignees && t.assignees.some(a => a._id.toString() === u._id.toString()))
    );
    return {
      user: u.username,
      total: userTasks.length,
      active: userTasks.filter(t => !["completed", "blocked"].includes(t.status)).length,
      completed: userTasks.filter(t => t.status === "completed").length,
    };
  }).filter(w => w.total > 0);

  const upcomingDeadlines = tasks
    .filter(t => t.dueDate && t.status !== "completed")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 10);

  return (
    <DashboardClient
      metrics={metrics}
      statusDistribution={statusDist}
      priorityDistribution={priorityDist}
      teamWorkload={teamWorkload}
      upcomingDeadlines={JSON.parse(JSON.stringify(upcomingDeadlines))}
      currentUser={JSON.parse(JSON.stringify(user))}
    />
  );
}

import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import User from "@/models/User";
import TaskType from "@/models/TaskType";
import TasksView from "@/components/admin/tasks/tasks-view";
import { serializeForClient } from "@/lib/utils/serialize";

export default async function TasksPage({ searchParams }) {
  await connectToDatabase();
  
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams?.q?.trim() || "";
  const status = resolvedSearchParams?.status;
  const priority = resolvedSearchParams?.priority;
  const taskType = resolvedSearchParams?.taskType;
  const assignee = resolvedSearchParams?.assignee;
  const project = resolvedSearchParams?.project;
  const sortBy = resolvedSearchParams?.sort || "createdAt";
  const sortOrder = resolvedSearchParams?.order === "asc" ? 1 : -1;
  
  const filter = { parentTask: null }; // Only top-level tasks
  
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { tags: { $in: [new RegExp(q, "i")] } },
    ];
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (taskType) filter.taskType = taskType;
  if (assignee) filter.$or = [{ assignee }, { assignees: assignee }];
  if (project) filter.project = project;
  
  const [tasks, projects, users, taskTypes] = await Promise.all([
    Task.find(filter)
      .populate("project", "title")
      .populate("assignee", "username email image")
      .populate("assignees", "username email image")
      .populate("dependencies", "title status")
      .sort({ [sortBy]: sortOrder })
      .limit(100)
      .lean(),
    Project.find({ archived: false }).select("title").sort({ title: 1 }).lean(),
    User.find({ roles: { $exists: true, $ne: [] } }).select("username email roles").sort({ username: 1 }).lean(),
    TaskType.find({ archived: { $ne: true } }).select("name label color").sort({ label: 1 }).lean(),
  ]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Tasks</h1>
      </div>
      
      <TasksView
        initialTasks={serializeForClient(tasks)}
        projects={serializeForClient(projects)}
        users={serializeForClient(users)}
        taskTypes={serializeForClient(taskTypes)}
        filters={{ q, status, priority, taskType, assignee, project, sortBy, sortOrder }}
      />
    </div>
  );
}

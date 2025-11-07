import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import User from "@/models/User";
import TasksView from "@/components/admin/tasks/tasks-view";

export default async function TasksPage({ searchParams }) {
  await connectToDatabase();
  
  const q = searchParams?.q?.trim() || "";
  const status = searchParams?.status;
  const priority = searchParams?.priority;
  const taskType = searchParams?.taskType;
  const assignee = searchParams?.assignee;
  const project = searchParams?.project;
  const sortBy = searchParams?.sort || "createdAt";
  const sortOrder = searchParams?.order === "asc" ? 1 : -1;
  
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
  
  const [tasks, projects, users] = await Promise.all([
    Task.find(filter)
      .populate("project", "title")
      .populate("assignee", "username email image")
      .populate("assignees", "username email image")
      .sort({ [sortBy]: sortOrder })
      .limit(100)
      .lean(),
    Project.find({ archived: false }).select("title").sort({ title: 1 }).lean(),
    User.find().select("username email").sort({ username: 1 }).lean(),
  ]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Tasks</h1>
      </div>
      
      <TasksView
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        projects={JSON.parse(JSON.stringify(projects))}
        users={JSON.parse(JSON.stringify(users))}
        filters={{ q, status, priority, taskType, assignee, project, sortBy, sortOrder }}
      />
    </div>
  );
}

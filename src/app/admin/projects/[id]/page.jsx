import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Milestone from "@/models/Milestone";
import Task from "@/models/Task";
import Department from "@/models/Department";
import User from "@/models/User";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectTabs from "@/components/admin/projects/project-tabs";
import ProjectActions from "@/components/admin/projects/project-actions";

function StatusBadge({ status }) {
  const colors = {
    planning: "bg-gray-700 text-gray-200",
    on_track: "bg-green-700 text-green-100",
    at_risk: "bg-yellow-700 text-yellow-100",
    delayed: "bg-red-700 text-red-100",
    completed: "bg-blue-700 text-blue-100",
    on_hold: "bg-gray-700 text-gray-300",
    cancelled: "bg-gray-800 text-gray-400",
  };
  return <span className={`px-2 py-1 rounded text-xs ${colors[status] || colors.planning}`}>{status?.replace("_", " ")}</span>;
}

export default async function ProjectDetailPage({ params, searchParams }) {
  const { id } = await params;
  const tab = searchParams?.tab || "overview";
  
  await connectToDatabase();
  const project = await Project.findById(id)
    .populate("departments", "name")
    .populate("managers", "username email")
    .populate("members", "username email")
    .populate("createdBy", "username email")
    .lean();
  
  if (!project) return notFound();
  
  const [milestones, tasks, allDepartments, allUsers] = await Promise.all([
    Milestone.find({ project: id }).sort({ order: 1 }).lean(),
    Task.find({ project: id }).populate("assignee", "username email").populate("milestone", "title").lean(),
    Department.find({ archived: false }).select("name").sort({ name: 1 }).lean(),
    User.find().select("username email roles").sort({ username: 1 }).lean(),
  ]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/projects" className="text-sm text-gray-400 underline mb-2 inline-block">← Back to Projects</Link>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={project.status} />
            <span className="text-sm text-gray-400">Progress: {project.progress}%</span>
            {project.archived && <span className="text-sm text-gray-400">(Archived)</span>}
          </div>
        </div>
        <ProjectActions projectId={project._id.toString()} archived={project.archived} />
      </div>
      
      <ProjectTabs
        tab={tab}
        project={JSON.parse(JSON.stringify(project))}
        milestones={JSON.parse(JSON.stringify(milestones))}
        tasks={JSON.parse(JSON.stringify(tasks))}
        allDepartments={JSON.parse(JSON.stringify(allDepartments))}
        allUsers={JSON.parse(JSON.stringify(allUsers))}
      />
    </div>
  );
}

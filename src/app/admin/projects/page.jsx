import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Department from "@/models/Department";
import User from "@/models/User";
import ProjectsListClient from "@/components/admin/projects/projects-list-client";

export default async function ProjectsListPage({ searchParams }) {
  await connectToDatabase();
  const resolvedSearchParams = await searchParams;
  
  const q = resolvedSearchParams?.q?.trim() || "";
  const status = resolvedSearchParams?.status;
  const department = resolvedSearchParams?.department;
  const manager = resolvedSearchParams?.manager;
  const sortBy = resolvedSearchParams?.sort || "createdAt";
  const sortOrder = resolvedSearchParams?.order === "asc" ? 1 : -1;
  const showArchived = resolvedSearchParams?.archived === "true";
  
  const filter = {};
  if (!showArchived) filter.archived = false;
  
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
  if (status) filter.status = status;
  if (department) filter.departments = department;
  if (manager) filter.managers = manager;
  
  const [projects, departments, managers] = await Promise.all([
    Project.find(filter)
      .select("title description status progress startDate endDate departments managers createdAt archived")
      .populate("departments", "name")
      .populate("managers", "username")
      .sort({ [sortBy]: sortOrder })
      .lean(),
    Department.find({ archived: false }).select("name").sort({ name: 1 }).lean(),
    User.find({ roles: { $in: ["admin", "hr", "manager"] } }).select("username").sort({ username: 1 }).lean(),
  ]);

  return (
    <ProjectsListClient
      projects={JSON.parse(JSON.stringify(projects))}
      departments={JSON.parse(JSON.stringify(departments))}
      managers={JSON.parse(JSON.stringify(managers))}
      filters={{ q, status, department, manager, sortBy, sortOrder: sortOrder === 1 ? "asc" : "desc", showArchived }}
    />
  );
}

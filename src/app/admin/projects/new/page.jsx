import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import User from "@/models/User";
import CreateProjectForm from "@/components/admin/projects/create-project-form";

export default async function NewProjectPage() {
  await connectToDatabase();
  const [rawDepartments, rawUsers] = await Promise.all([
    Department.find({ archived: false }).select("name").sort({ name: 1 }).lean(),
    User.find({ roles: { $exists: true, $ne: [] } }).select("username email roles").sort({ username: 1 }).lean(),
  ]);

  const departments = rawDepartments.map((d) => ({ _id: d._id.toString(), name: d.name }));
  const users = rawUsers.map((u) => ({ _id: u._id.toString(), username: u.username, email: u.email, roles: u.roles || [] }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Project</h1>
      <CreateProjectForm departments={departments} users={users} />
    </div>
  );
}

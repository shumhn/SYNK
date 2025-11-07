import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import User from "@/models/User";
import CreateProjectForm from "@/components/admin/projects/create-project-form";

export default async function NewProjectPage() {
  await connectToDatabase();
  const [departments, users] = await Promise.all([
    Department.find({ archived: false }).select("name").sort({ name: 1 }).lean(),
    User.find().select("username email roles").sort({ username: 1 }).lean(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Project</h1>
      <CreateProjectForm departments={departments} users={users} />
    </div>
  );
}

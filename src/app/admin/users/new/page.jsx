import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import Team from "@/models/Team";
import NewUserForm from "@/components/admin/users/new-user-form";

export default async function AdminNewUserPage() {
  await connectToDatabase();
  const [departments, teams] = await Promise.all([
    Department.find().select("name").sort({ name: 1 }).lean(),
    Team.find().select("name department").populate("department", "name").sort({ name: 1 }).lean(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create User</h1>
      <NewUserForm departments={departments} teams={teams} />
    </div>
  );
}

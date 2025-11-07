import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Department from "@/models/Department";
import Team from "@/models/Team";
import EditUserForm from "@/components/admin/users/edit-user-form";
import RolesForm from "@/components/admin/users/roles-form";
import SessionsPanel from "@/components/admin/users/sessions-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import PerformanceTrends from "@/components/admin/users/performance-trends";

export default async function AdminUserDetailPage({ params }) {
  const { id } = await params;
  await connectToDatabase();
  const user = await User.findById(id).select("-password").populate("department", "name").populate("team", "name department").lean();
  if (!user) return notFound();
  const [departments, teams] = await Promise.all([
    Department.find().select("name").sort({ name: 1 }).lean(),
    Team.find().select("name department").populate("department", "name").sort({ name: 1 }).lean(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">User: {user.username}</h1>
        <Link href="/admin/users" className="underline">Back</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-4 rounded border border-neutral-800">
            <h2 className="font-semibold mb-4">Profile</h2>
            <EditUserForm user={JSON.parse(JSON.stringify(user))} departments={departments} teams={teams} />
          </div>

          <div className="p-4 rounded border border-neutral-800">
            <h2 className="font-semibold mb-4">Sessions</h2>
            <SessionsPanel userId={user._id.toString()} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-4 rounded border border-neutral-800">
            <h2 className="font-semibold mb-4">Roles & Permissions</h2>
            <RolesForm userId={user._id.toString()} roles={user.roles || []} permissions={user.permissions || []} />
          </div>
          <div className="p-4 rounded border border-neutral-800">
            <PerformanceTrends userId={user._id.toString()} />
          </div>
        </div>
      </div>
    </div>
  );
}


import Link from "next/link";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default async function AdminUsersPage({ searchParams }) {
  await connectToDatabase();
  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const filter = q
    ? {
        $or: [
          { username: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { designation: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(filter)
    .select("username email roles isOnline lastLoginAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Link href="/admin/users/new" className="bg-white text-black px-3 py-1 rounded">New User</Link>
      </div>

      <form className="flex gap-2" action="/admin/users" method="get">
        <input name="q" defaultValue={q} placeholder="Search by name, email, designation" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        <button className="px-3 py-2 rounded bg-white text-black">Search</button>
      </form>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Roles</th>
              <th className="text-left p-3">Online</th>
              <th className="text-left p-3">Last Login</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-neutral-800">
                <td className="p-3">{u.username}</td>
                <td className="p-3 text-gray-300">{u.email}</td>
                <td className="p-3">{(u.roles || []).join(", ") || "-"}</td>
                <td className="p-3">{u.isOnline ? <span className="text-green-400">Online</span> : <span className="text-gray-400">Offline</span>}</td>
                <td className="p-3 text-gray-300">{formatDate(u.lastLoginAt)}</td>
                <td className="p-3">
                  <Link href={`/admin/users/${u._id}`} className="underline">View</Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-400" colSpan={6}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

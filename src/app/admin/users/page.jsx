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
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";
  const include = typeof resolvedSearchParams?.include === "string" ? resolvedSearchParams.include : "";
  const includePending = include === "pending" || include === "all";

  const baseFilter = q
    ? {
        $or: [
          { username: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { designation: { $regex: q, $options: "i" } },
        ],
      }
    : {};
  const filter = includePending ? baseFilter : { ...baseFilter, roles: { $ne: [] } };

  const users = await User.find(filter)
    .select("username email roles lastLoginAt createdAt profile activeSessions")
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
        <select name="include" defaultValue={includePending ? (include || "pending") : "approved"} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="approved">Approved only</option>
          <option value="pending">Include applicants</option>
        </select>
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
            {users.map((u) => {
              const now = Date.now();
              const windowMs = 2 * 60 * 1000; // 2 minutes window for online
              const sessions = Array.isArray(u.activeSessions) ? u.activeSessions : [];
              const derivedOnline = sessions.some((s) => {
                if (s.revokedAt) return false;
                const t = s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : 0;
                return t > 0 && now - t <= windowMs;
              });
              const hasProfile = u.profile && (u.profile.skills?.length > 0 || u.profile.experience?.length > 0 || u.profile.social);
              const needsApproval = hasProfile && (!u.roles || u.roles.length === 0);
              
              return (
                <tr key={u._id} className="border-t border-neutral-800">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {u.username}
                      {needsApproval && (
                        <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded-full">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-300">{u.email}</td>
                  <td className="p-3">{(u.roles || []).join(", ") || "-"}</td>
                  <td className="p-3">{derivedOnline ? <span className="text-green-400">Online</span> : <span className="text-gray-400">Offline</span>}</td>
                  <td className="p-3 text-gray-300">{formatDate(u.lastLoginAt)}</td>
                  <td className="p-3">
                    <Link href={`/admin/users/${u._id}`} className="underline">View</Link>
                  </td>
                </tr>
              );
            })}
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

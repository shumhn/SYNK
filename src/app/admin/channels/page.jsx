import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";
import Department from "@/models/Department";
import CreateChannelForm from "@/components/admin/channels/create-channel-form";
import ChannelRowActions from "@/components/admin/channels/channel-row-actions";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function getTypeLabel(type) {
  switch (type) {
    case "department":
      return { text: "Inter-Department", color: "bg-blue-900/40 border-blue-700 text-blue-300" };
    case "group":
      return { text: "Group", color: "bg-purple-900/40 border-purple-700 text-purple-300" };
    case "private":
      return { text: "Private", color: "bg-gray-900/40 border-gray-700 text-gray-300" };
    default:
      return { text: type, color: "bg-neutral-900/40 border-neutral-700 text-neutral-300" };
  }
}

export default async function AdminChannelsPage({ searchParams }) {
  await connectToDatabase();
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q.trim() : "";
  const dep = typeof params?.department === "string" ? params.department : "";
  const archived = typeof params?.archived === "string" ? params.archived : "";
  const typeFilter = typeof params?.type === "string" ? params.type : "";
  
  const filter = {
    ...(q ? { name: { $regex: q, $options: "i" } } : {}),
    ...(dep ? { departments: dep } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(archived === "true" ? { archived: true } : archived === "false" ? { archived: { $ne: true } } : {}),
  };
  
  const [channels, departments] = await Promise.all([
    Channel.find(filter)
      .populate("departments", "name")
      .populate("members", "username")
      .sort({ createdAt: -1 })
      .lean(),
    Department.find().select("name").sort({ name: 1 }).lean(),
  ]);
  
  const departmentsPlain = departments.map((d) => ({ _id: d._id.toString(), name: d.name }));
  
  // Calculate statistics
  const stats = {
    total: channels.length,
    interDepartment: channels.filter(c => c.type === "department").length,
    group: channels.filter(c => c.type === "group").length,
    private: channels.filter(c => c.type === "private").length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">🏢 Collaboration Channels</h1>
          <p className="text-sm text-gray-400 mt-1">
            {stats.interDepartment > 0 
              ? `${stats.interDepartment} inter-department channel${stats.interDepartment !== 1 ? 's' : ''} enabling cross-team collaboration`
              : "Create inter-department channels to enable cross-team collaboration"}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total Channels</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-300">{stats.interDepartment}</div>
          <div className="text-xs text-blue-400">Inter-Department</div>
        </div>
        <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-300">{stats.group}</div>
          <div className="text-xs text-purple-400">Group Channels</div>
        </div>
        <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-300">{stats.private}</div>
          <div className="text-xs text-gray-400">Private Chats</div>
        </div>
      </div>

      {/* Create Channel Form */}
      <div className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30">
        <h2 className="text-sm font-semibold mb-3">Create New Channel</h2>
        <CreateChannelForm departments={departmentsPlain} />
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-2" action="/admin/channels" method="get">
        <input 
          name="q" 
          defaultValue={q} 
          placeholder="Search channels" 
          className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 flex-1 min-w-[200px]" 
        />
        <select name="type" defaultValue={typeFilter} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All types</option>
          <option value="department">🏢 Inter-Department</option>
          <option value="group">👥 Group</option>
          <option value="private">💬 Private</option>
        </select>
        <select name="department" defaultValue={dep} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All departments</option>
          {departmentsPlain.map((d)=> (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <select name="archived" defaultValue={archived || "false"} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">Any status</option>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
        <button className="px-4 py-2 rounded bg-white text-black font-medium hover:bg-gray-100">Filter</button>
      </form>

      {/* Channels Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Departments</th>
              <th className="text-left p-3">Members</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => {
              const typeLabel = getTypeLabel(c.type);
              const memberCount = c.members?.length || 0;
              const deptNames = (c.departments || []).map((d) => d.name).join(", ");
              
              return (
                <tr key={c._id} className="border-t border-neutral-800 hover:bg-neutral-900/30">
                  <td className="p-3">
                    <div className="font-medium text-white">{c.name || "Untitled"}</div>
                    {c.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{c.description}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${typeLabel.color}`}>
                      {typeLabel.text}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">
                    {c.type === "department" && c.departments?.length >= 2 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-blue-400">🔗</span>
                        <span className="font-medium">{deptNames}</span>
                      </div>
                    ) : deptNames || '-'}
                  </td>
                  <td className="p-3 text-gray-300">
                    <span className="text-white font-medium">{memberCount}</span> member{memberCount !== 1 ? 's' : ''}
                  </td>
                  <td className="p-3">
                    {c.archived ? (
                      <span className="text-gray-400">📦 Archived</span>
                    ) : (
                      <span className="text-green-400">✓ Active</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-300 text-xs">{formatDate(c.createdAt)}</td>
                  <td className="p-3"><ChannelRowActions id={c._id.toString()} archived={!!c.archived} /></td>
                </tr>
              );
            })}
            {channels.length === 0 && (
              <tr>
                <td className="p-8 text-center text-gray-400" colSpan={7}>
                  <div className="space-y-2">
                    <div className="text-4xl">📭</div>
                    <div>No channels found.</div>
                    <div className="text-xs">Create an inter-department channel to get started!</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

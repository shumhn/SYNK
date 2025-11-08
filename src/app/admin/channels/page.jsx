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

export default async function AdminChannelsPage({ searchParams }) {
  await connectToDatabase();
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q.trim() : "";
  const dep = typeof params?.department === "string" ? params.department : "";
  const archived = typeof params?.archived === "string" ? params.archived : "";
  const filter = {
    ...(q ? { name: { $regex: q, $options: "i" } } : {}),
    ...(dep ? { departments: dep } : {}),
    ...(archived === "true" ? { archived: true } : archived === "false" ? { archived: { $ne: true } } : {}),
  };
  const [channels, departments] = await Promise.all([
    Channel.find(filter).populate("departments", "name").sort({ createdAt: -1 }).lean(),
    Department.find().select("name").sort({ name: 1 }).lean(),
  ]);
  const departmentsPlain = departments.map((d) => ({ _id: d._id.toString(), name: d.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Channels</h1>
      </div>

      <div className="rounded border border-neutral-800 p-3">
        <CreateChannelForm departments={departmentsPlain} />
      </div>

      <form className="flex items-center gap-2" action="/admin/channels" method="get">
        <input name="q" defaultValue={q} placeholder="Search channels" className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
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
        <button className="px-3 py-2 rounded bg-white text-black">Filter</button>
      </form>

      <div className="overflow-x-auto rounded border border-neutral-800 mt-4">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Departments</th>
              <th className="text-left p-3">Archived</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c._id} className="border-t border-neutral-800">
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-gray-300">{(c.departments || []).map((d) => d.name).join(", ") || '-'}</td>
                <td className="p-3">{c.archived ? <span className="text-gray-400">Yes</span> : <span className="text-green-400">No</span>}</td>
                <td className="p-3 text-gray-300">{formatDate(c.createdAt)}</td>
                <td className="p-3"><ChannelRowActions id={c._id.toString()} archived={!!c.archived} /></td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-400" colSpan={5}>No channels found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

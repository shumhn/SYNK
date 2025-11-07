import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";
import Department from "@/models/Department";
import CreateChannelForm from "@/components/admin/channels/create-channel-form";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default async function AdminChannelsPage() {
  await connectToDatabase();
  const [channels, departments] = await Promise.all([
    Channel.find().populate("departments", "name").sort({ createdAt: -1 }).lean(),
    Department.find().select("name").sort({ name: 1 }).lean(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Channels</h1>
        <CreateChannelForm departments={departments} />
      </div>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Departments</th>
              <th className="text-left p-3">Archived</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c._id} className="border-t border-neutral-800">
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-gray-300">{(c.departments || []).map((d) => d.name).join(", ") || '-'}</td>
                <td className="p-3">{c.archived ? <span className="text-gray-400">Yes</span> : <span className="text-green-400">No</span>}</td>
                <td className="p-3 text-gray-300">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-400" colSpan={4}>No channels found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import CreateDepartmentForm from "@/components/admin/departments/create-department-form";
import Link from "next/link";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default async function AdminDepartmentsPage() {
  await connectToDatabase();
  const departments = await Department.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Departments</h1>
        <CreateDepartmentForm />
      </div>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d._id} className="border-t border-neutral-800">
                <td className="p-3"><Link className="underline" href={`/admin/departments/${d._id}`}>{d.name}</Link></td>
                <td className="p-3 text-gray-300">{d.description || "-"}</td>
                <td className="p-3 text-gray-300">{formatDate(d.createdAt)}</td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-400" colSpan={3}>No departments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

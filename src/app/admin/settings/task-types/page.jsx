import connectToDatabase from "@/lib/db/mongodb";
import TaskType from "@/models/TaskType";
import TaskTypesClient from "@/components/admin/settings/task-types-client";

export default async function TaskTypesSettingsPage() {
  await connectToDatabase();
  const types = await TaskType.find().sort({ label: 1 }).lean();
  const safeTypes = types.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
    label: t.label,
    description: t.description || "",
    color: t.color || "#3b82f6",
    archived: t.archived || false,
    createdAt: t.createdAt,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Task Types</h1>
          <p className="text-sm text-gray-400">Manage custom task types for your organization</p>
        </div>
      </div>
      <TaskTypesClient types={safeTypes} />
    </div>
  );
}

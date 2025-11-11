import connectToDatabase from "@/lib/db/mongodb";
import TaskTemplate from "@/models/TaskTemplate";
import TemplateForm from "@/components/admin/templates/template-form";
import EditTemplateModal from "@/components/admin/templates/edit-template-modal";
import { serializeForClient } from "@/lib/utils/serialize";

export default async function TemplatesPage() {
  await connectToDatabase();
  const templates = await TaskTemplate.find({}).populate("createdBy", "username email").sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Task Templates</h1>
      </div>

      <div className="p-4 rounded border border-neutral-800">
        <h2 className="font-semibold mb-3">Create Template</h2>
        {/* @ts-expect-error Server to Client */}
        <TemplateForm onSavedPath="/admin/templates" />
      </div>

      <div className="space-y-3">
        {templates.map((t) => (
          <EditTemplateModal key={t._id} template={serializeForClient(t)} />
        ))}
        {templates.length === 0 && (
          <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">No templates yet.</div>
        )}
      </div>
    </div>
  );
}

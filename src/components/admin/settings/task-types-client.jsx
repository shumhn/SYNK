"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TaskTypeModal from "./task-type-modal";

export default function TaskTypesClient({ types = [] }) {
  const router = useRouter();
  const [list, setList] = useState(types);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  function openAdd() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(type) {
    setEditing(type);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  function onSaved() {
    setShowModal(false);
    setEditing(null);
    router.refresh();
  }

  async function onArchive(type) {
    if (!confirm(`Archive "${type.label}"?`)) return;
    const res = await fetch(`/api/task-types/${type._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.message || "Failed to archive");
    }
  }

  async function onUnarchive(type) {
    const res = await fetch(`/api/task-types/${type._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.message || "Failed to unarchive");
    }
  }

  async function onDelete(type) {
    if (!confirm(`Permanently delete "${type.label}"? Tasks using this type will not be deleted.`)) return;
    const res = await fetch(`/api/task-types/${type._id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.message || "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">{list.length} types total</div>
        <button onClick={openAdd} className="bg-white text-black px-4 py-2 rounded">
          Add Task Type
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Label</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Color</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t._id} className="border-t border-neutral-800">
                <td className="p-3 font-medium">{t.label}</td>
                <td className="p-3 text-gray-400">{t.name}</td>
                <td className="p-3 text-gray-400">{t.description || "—"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: t.color }} />
                    <span className="text-xs text-gray-400">{t.color}</span>
                  </div>
                </td>
                <td className="p-3">
                  {t.archived ? (
                    <span className="text-xs px-2 py-1 rounded bg-neutral-800 text-gray-500">Archived</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-green-900 text-green-200">Active</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(t)} className="text-xs underline">
                      Edit
                    </button>
                    {t.archived ? (
                      <button onClick={() => onUnarchive(t)} className="text-xs underline text-blue-400">
                        Unarchive
                      </button>
                    ) : (
                      <button onClick={() => onArchive(t)} className="text-xs underline text-yellow-400">
                        Archive
                      </button>
                    )}
                    <button onClick={() => onDelete(t)} className="text-xs underline text-red-400">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No task types yet. Add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && <TaskTypeModal type={editing} onClose={closeModal} onSaved={onSaved} />}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateFolderModal({ onClose, project, task, parentFolder }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("project");
  const [aclRoles, setAclRoles] = useState([]);
  const [color, setColor] = useState("#3b82f6");
  const [icon, setIcon] = useState("📁");
  const [creating, setCreating] = useState(false);

  const roleOptions = ["admin", "hr", "manager", "employee", "viewer"];
  const iconOptions = ["📁", "📂", "🗂️", "📑", "📊", "📈", "🎨", "🎯", "💼", "🔧"];
  const colorOptions = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // yellow
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description,
          visibility,
          aclRoles,
          color,
          icon,
          project,
          task,
          parentFolder,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.message || data.error);
      } else {
        router.refresh();
        onClose();
      }
    } catch (e) {
      console.error("Failed to create folder:", e);
      alert("Failed to create folder");
    } finally {
      setCreating(false);
    }
  }

  function toggleRole(role) {
    setAclRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">📁 Create New Folder</h3>
          {(project || task) && (
            <p className="text-sm text-gray-400 mt-1">
              In {project ? "Project" : "Task"}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Folder Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Folder Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Documents, Assets, Reports..."
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Icon
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {iconOptions.map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  onClick={() => setIcon(iconOption)}
                  className={`text-2xl p-2 rounded-lg border ${
                    icon === iconOption
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-lg border-2 ${
                    color === colorOption ? "border-white" : "border-neutral-800"
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm"
            >
              <option value="public">Public - Everyone can see</option>
              <option value="project">Project - Project members only</option>
              <option value="team">Team - Team members only</option>
              <option value="private">Private - Only me</option>
            </select>
          </div>

          {/* Role-Based Access */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Required Roles (optional)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {roleOptions.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    aclRoles.includes(role)
                      ? "border-blue-500 bg-blue-500/20 text-blue-400"
                      : "border-neutral-800 text-gray-400 hover:border-neutral-700"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only users with these roles can access this folder
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4">
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Folder"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

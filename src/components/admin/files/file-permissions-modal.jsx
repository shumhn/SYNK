"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FilePermissionsModal({ file, onClose }) {
  const router = useRouter();
  const [visibility, setVisibility] = useState(file?.visibility || "project");
  const [aclRoles, setAclRoles] = useState(file?.aclRoles || []);
  const [allowedUsers, setAllowedUsers] = useState(file?.allowedUsers || []);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const roleOptions = ["admin", "hr", "manager", "employee", "viewer"];

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!data.error) {
        setUsers(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  }

  function toggleRole(role) {
    setAclRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function toggleUser(userId) {
    setAllowedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/files/${file._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibility,
          aclRoles,
          allowedUsers,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.message || "Failed to update permissions");
      } else {
        router.refresh();
        onClose();
      }
    } catch (e) {
      console.error("Failed to update permissions:", e);
      alert("Failed to update permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">🔒 File Permissions</h3>
          <p className="text-sm text-gray-400 mt-1 truncate">{file?.filename}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Visibility Level */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Visibility Level
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm"
            >
              <option value="public">🌐 Public - Everyone can see</option>
              <option value="project">📁 Project - Project members only</option>
              <option value="team">👥 Team - Team members only</option>
              <option value="private">🔒 Private - Only me</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {visibility === "public" && "Anyone can view this file"}
              {visibility === "project" && "Only project members can view this file"}
              {visibility === "team" && "Only team members can view this file"}
              {visibility === "private" && "Only you can view this file"}
            </p>
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
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
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
              Only users with at least one of these roles can access this file
            </p>
          </div>

          {/* Specific Users */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Allowed Users (optional)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm mb-2"
            />
            <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded-lg">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No users found
                </div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {filteredUsers.map((user) => {
                    const isSelected = allowedUsers.includes(user._id);
                    return (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => toggleUser(user._id)}
                        className={`w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-900/50 transition-colors ${
                          isSelected ? "bg-blue-500/10" : ""
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-neutral-700"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">
                            {user.username}
                          </div>
                          {user.email && (
                            <div className="text-xs text-gray-500 truncate">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only these specific users can access this file (overrides role restrictions)
            </p>
          </div>

          {/* Summary */}
          <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <div className="text-sm font-medium text-white mb-2">Access Summary</div>
            <div className="space-y-1 text-xs text-gray-400">
              <div>Visibility: <span className="text-white">{visibility}</span></div>
              <div>
                Required Roles:{" "}
                <span className="text-white">
                  {aclRoles.length > 0 ? aclRoles.join(", ") : "None"}
                </span>
              </div>
              <div>
                Specific Users:{" "}
                <span className="text-white">
                  {allowedUsers.length > 0 ? `${allowedUsers.length} selected` : "None"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Permissions"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

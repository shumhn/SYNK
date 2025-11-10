"use client";

import { useEffect, useMemo, useState } from "react";

function MemberCheckbox({ user, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-900 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(user._id, e.target.checked)}
        className="accent-blue-500"
      />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm text-white font-semibold">
          {(user.username || "").charAt(0).toUpperCase() || "?"}
        </div>
        <div>
          <p className="text-sm text-white font-medium">{user.username}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      </div>
    </label>
  );
}

export default function NewChannelModal({ onClose, onChannelCreated, currentUserId }) {
  const [tab, setTab] = useState("private"); // private | group
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (!data.error) {
          const list = Array.isArray(data.data)
            ? data.data.filter((u) => (u?._id?.toString?.() || "") !== currentUserId)
            : [];
          setUsers(list);
        }
      } catch (e) {
        console.error("Failed to load users", e);
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, [currentUserId]);

  function toggleMember(userId, checked) {
    setSelectedMembers((prev) => {
      if (checked) {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter((user) =>
      (user.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  async function handleCreate() {
    if (selectedMembers.length === 0) {
      alert("Select at least one team member");
      return;
    }

    if (tab === "private" && selectedMembers.length !== 1) {
      alert("Direct messages must include exactly one teammate");
      return;
    }

    if (tab === "group" && !groupName.trim()) {
      alert("Group name is required");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        type: tab === "private" ? "private" : "group",
        members: selectedMembers,
        ...(tab === "group" ? { name: groupName.trim(), description: description.trim() } : {}),
      };
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.message || "Failed to create channel");
      } else {
        onChannelCreated?.(data.data);
      }
    } catch (e) {
      console.error("Failed to create channel", e);
      alert("Failed to create channel. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Start a conversation</h3>
            <p className="text-xs text-gray-500 mt-1">Create a direct message or a group chat</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-neutral-800 bg-neutral-900/40">
          <button
            onClick={() => { setTab("private"); setSelectedMembers([]); }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === "private" ? "bg-white text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            👤 Direct Message
          </button>
          <button
            onClick={() => { setTab("group"); setSelectedMembers([]); }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === "group" ? "bg-white text-black" : "text-gray-400 hover:text-white"
            }`}
          >
            👥 Group Chat
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {tab === "group" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Group name</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Product Squad"
                  className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this group for?"
                  className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500 uppercase">Team members</label>
              <span className="text-xs text-gray-500">{selectedMembers.length} selected</span>
            </div>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search teammates…"
              className="w-full px-3 py-2 mb-2 rounded bg-neutral-900 border border-neutral-700 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            {loadingUsers ? (
              <div className="text-center text-gray-500 py-8">Loading team…</div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredUsers.map((user) => (
                  <MemberCheckbox
                    key={user._id}
                    user={user}
                    checked={selectedMembers.includes(user._id)}
                    onChange={toggleMember}
                  />
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center text-gray-500 py-8">No teammates match your search</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-neutral-900/60 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {tab === "private"
              ? "Select one teammate to start a direct message"
              : "Select multiple teammates to create a group chat"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                creating ? "bg-blue-500/50 text-white/70" : "bg-blue-500 text-white hover:bg-blue-400"
              }`}
            >
              {creating ? "Creating…" : tab === "private" ? "Start DM" : "Create Group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

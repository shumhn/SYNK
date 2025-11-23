"use client";

import { useState, useEffect } from "react";

export default function CreateChannelForm({ departments = [] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("department"); // Default to department for inter-department channels
  const [selectedDeps, setSelectedDeps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [memberCount, setMemberCount] = useState(0);

  function toggleDep(id, checked) {
    setSelectedDeps((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  }

  // Fetch member count when departments change
  useEffect(() => {
    if (selectedDeps.length === 0) {
      setMemberCount(0);
      return;
    }
    
    async function fetchMemberCount() {
      try {
        const res = await fetch(`/api/channels/preview-members?departments=${selectedDeps.join(',')}`);
        const data = await res.json();
        if (res.ok && !data.error) {
          setMemberCount(data.count || 0);
        }
      } catch (e) {
        console.error('Failed to fetch member count:', e);
      }
    }
    
    fetchMemberCount();
  }, [selectedDeps]);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    
    if (type === "department" && selectedDeps.length === 0) {
      setError("Please select at least one department for inter-department channels");
      return;
    }
    
    if (type === "department" && selectedDeps.length < 2) {
      setError("Inter-department channels require at least 2 departments");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          type,
          name: name.trim(), 
          description: description.trim() || undefined, 
          departments: type === "department" ? selectedDeps : [],
          // We'll pass an empty array for members; the backend will fetch them
          members: [] 
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || "Failed to create channel");
      } else {
        setMessage("✅ Inter-department channel created successfully!");
        setName("");
        setDescription("");
        setSelectedDeps([]);
        setType("department");
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setError("Network error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {message && (
        <div className="p-3 bg-green-900/30 border border-green-700 rounded text-green-300 text-sm">
          {message}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm mb-1 font-medium">Channel Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="department">🏢 Inter-Department (Cross-team)</option>
            <option value="group">👥 Group Channel</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1 font-medium">Channel Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "department" ? "e.g., Engineering-Sales Sync" : "Channel name"}
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm mb-1 font-medium">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === "department" ? "Cross-department collaboration" : "Optional description"}
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          />
        </div>
      </div>

      {type === "department" && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">
              Select Departments * 
              <span className="ml-2 text-xs text-gray-400">(Choose 2+ for inter-department collaboration)</span>
            </label>
            {selectedDeps.length >= 2 && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-900/40 border border-blue-700 text-blue-300">
                ✓ {memberCount} members will be added
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {departments.length === 0 && (
              <span className="text-xs text-gray-400">No departments available. Create departments first.</span>
            )}
            {departments.map((d) => (
              <label 
                key={d._id} 
                className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  selectedDeps.includes(d._id)
                    ? "bg-blue-900/40 border-blue-700 text-blue-200"
                    : "bg-neutral-800 border-neutral-700 hover:border-neutral-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-blue-500 w-4 h-4"
                  checked={selectedDeps.includes(d._id)}
                  onChange={(e) => toggleDep(d._id, e.target.checked)}
                />
                <span className="font-medium">{d.name}</span>
              </label>
            ))}
          </div>
          
          {selectedDeps.length === 1 && (
            <p className="mt-2 text-xs text-yellow-400">
              ⚠️ Please select at least one more department to enable cross-department collaboration
            </p>
          )}
          
          {selectedDeps.length >= 2 && (
            <p className="mt-2 text-xs text-green-400">
              ✓ This will create a collaboration channel between {selectedDeps.length} departments
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button 
          type="submit"
          disabled={loading || (type === "department" && selectedDeps.length < 2)} 
          className="bg-white text-black px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        >
          {loading ? "Creating Channel..." : "Create Inter-Department Channel"}
        </button>
        
        {type === "department" && selectedDeps.length < 2 && !loading && (
          <span className="text-xs text-gray-400">Select 2+ departments to continue</span>
        )}
      </div>
    </form>
  );
}

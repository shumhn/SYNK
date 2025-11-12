"use client";

import { useState, useEffect } from "react";

export default function TagManagementModal({ file, onClose, onTagsUpdated }) {
  const [tags, setTags] = useState(file.tags || []);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [popularTags, setPopularTags] = useState([]);

  useEffect(() => {
    // Fetch popular tags for suggestions
    fetchPopularTags();
  }, []);

  const fetchPopularTags = async () => {
    try {
      const res = await fetch("/api/files/tags/popular");
      const data = await res.json();
      if (!data.error) {
        setPopularTags(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch popular tags:", error);
    }
  };

  const addTag = (tag) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${file._id}/tags`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        onTagsUpdated?.(data.data);
        onClose();
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
      alert("Failed to update tags");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">🏷️ Manage Tags</h3>
          <p className="text-sm text-gray-400 mt-1">
            Add or remove tags for "{file.filename}"
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Tags */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Current Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <span className="text-sm text-gray-500">No tags</span>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Add New Tag */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Add New Tag
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTag(newTag)}
                placeholder="Enter tag name..."
                className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white placeholder-gray-500"
              />
              <button
                onClick={() => addTag(newTag)}
                disabled={!newTag.trim()}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Popular Tags */}
          {popularTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Popular Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 10).map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => addTag(tag.name)}
                    disabled={tags.includes(tag.name)}
                    className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-gray-300 rounded text-sm"
                  >
                    {tag.name} ({tag.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg"
          >
            {loading ? "Saving..." : "Save Tags"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FileVersionHistory({ file, onClose, onVersionSelect }) {
  const router = useRouter();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    fetchVersions();
  }, [file]);

  async function fetchVersions() {
    if (!file?._id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/files/${file._id}/versions`);
      const data = await res.json();
      if (!data.error) {
        setVersions(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch versions:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(version) {
    if (!confirm(`Restore version ${version.version}? This will create a new version based on this file.`)) {
      return;
    }

    setRestoring(version._id);
    try {
      const res = await fetch(`/api/files/${version._id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      
      if (data.error) {
        alert(data.message || "Failed to restore version");
      } else {
        alert(data.message || "Version restored successfully");
        router.refresh();
        onClose?.();
      }
    } catch (e) {
      console.error("Failed to restore version:", e);
      alert("Failed to restore version");
    } finally {
      setRestoring(null);
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-white">📜 Version History</h3>
            <p className="text-sm text-gray-400 mt-1">{file?.filename}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📄</div>
              <p>No version history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const isLatest = version.isLatestVersion;
                const isCurrent = version._id === file._id;
                
                return (
                  <div
                    key={version._id}
                    className={`p-4 rounded-lg border transition-all ${
                      isLatest
                        ? "border-green-500/50 bg-green-500/5"
                        : isCurrent
                        ? "border-blue-500/50 bg-blue-500/5"
                        : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Version info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-semibold text-white">
                            Version {version.version}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                              Latest
                            </span>
                          )}
                          {isCurrent && !isLatest && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                              Viewing
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-400">
                          <div>
                            <span className="text-gray-500">Uploaded by:</span>{" "}
                            {version.uploadedBy?.username || "Unknown"}
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>{" "}
                            {formatDate(version.createdAt)}
                          </div>
                          <div>
                            <span className="text-gray-500">Size:</span>{" "}
                            {formatFileSize(version.size)}
                          </div>
                          <div>
                            <span className="text-gray-500">Format:</span>{" "}
                            {version.format?.toUpperCase() || "—"}
                          </div>
                        </div>

                        {version.description && (
                          <div className="mt-2 text-sm text-gray-400">
                            {version.description}
                          </div>
                        )}

                        {version.width && version.height && (
                          <div className="mt-1 text-xs text-gray-500">
                            {version.width} × {version.height}px
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onVersionSelect?.(version)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors whitespace-nowrap"
                        >
                          👁️ Preview
                        </button>
                        <a
                          href={version.secureUrl || version.url}
                          download={version.filename}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded transition-colors text-center whitespace-nowrap"
                        >
                          📥 Download
                        </a>
                        {!isLatest && (
                          <button
                            onClick={() => handleRestore(version)}
                            disabled={restoring === version._id}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {restoring === version._id ? "⏳" : "↻ Restore"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Version comparison indicator */}
                    {index < versions.length - 1 && (
                      <div className="mt-3 pt-3 border-t border-neutral-800/50 text-xs text-gray-500">
                        {(() => {
                          const prevVersion = versions[index + 1];
                          const sizeDiff = version.size - (prevVersion?.size || 0);
                          const sizeChange =
                            sizeDiff > 0
                              ? `+${formatFileSize(sizeDiff)}`
                              : sizeDiff < 0
                              ? `-${formatFileSize(Math.abs(sizeDiff))}`
                              : "No size change";
                          
                          return (
                            <span>
                              Compared to v{prevVersion?.version || index + 1}: {sizeChange}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Total versions: {versions.length}</span>
            <span>
              Total storage:{" "}
              {formatFileSize(versions.reduce((acc, v) => acc + (v.size || 0), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

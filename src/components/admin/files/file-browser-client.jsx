"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import FilePreview from "./file-preview";
import FileVersionHistory from "./file-version-history";
import CreateFolderModal from "./create-folder-modal";
import FilePermissionsModal from "./file-permissions-modal";
import ExternalStorageManager from "./external-storage-manager";
import TagManagementModal from "./tag-management-modal";

function FileCard({ file, onSelect, isSelected, onPreview, onSetPermissions, onManageTags }) {
  const fileIcon = {
    image: "🖼️",
    video: "🎬",
    audio: "🎵",
    raw: "📎",
    auto: "📄",
  }[file.resourceType] || "📄";

  const thumbnailUrl = file.resourceType === "image" 
    ? file.secureUrl || file.url
    : null;

  return (
    <div
      className={`relative group rounded-lg border ${
        isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
      } overflow-hidden transition-all cursor-pointer`}
      onClick={() => onSelect(file)}
    >
      {/* Thumbnail/Icon */}
      <div className="aspect-square flex items-center justify-center bg-neutral-900 relative">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl">{fileIcon}</div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview(file);
              }}
              className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-gray-200"
            >
              Preview
            </button>
            <a
              href={file.secureUrl || file.url}
              download={file.filename}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-neutral-800 text-white rounded text-sm font-medium hover:bg-neutral-700"
            >
              Download
            </a>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetPermissions(file);
            }}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600"
          >
            🔒 Permissions
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageTags(file);
            }}
            className="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600"
          >
            🏷️ Tags
          </button>
        </div>

        {/* Selection checkbox */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-white truncate flex-1" title={file.filename}>
            {file.filename}
          </div>
          {file.version && file.version > 1 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded flex-shrink-0">
              v{file.version}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "—"}
        </div>
        <div className="text-xs text-gray-500 mt-1 truncate">
          {file.uploadedBy?.username || "Unknown"}
        </div>
      </div>
    </div>
  );
}

function FileListRow({ file, onSelect, isSelected, onPreview }) {
  const fileIcon = {
    image: "🖼️",
    video: "🎬",
    audio: "🎵",
    raw: "📎",
    auto: "📄",
  }[file.resourceType] || "📄";

  return (
    <tr
      className={`border-b border-neutral-800 hover:bg-neutral-900/50 cursor-pointer ${
        isSelected ? "bg-blue-500/10" : ""
      }`}
      onClick={() => onSelect(file)}
    >
      <td className="py-3 px-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(file)}
          className="w-4 h-4"
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{fileIcon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-white truncate">{file.filename}</div>
              {file.version && file.version > 1 && (
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded flex-shrink-0">
                  v{file.version}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">{file.format?.toUpperCase()}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">
        {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "—"}
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">
        {file.uploadedBy?.username || "Unknown"}
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">
        {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "—"}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded"
          >
            Preview
          </button>
          <a
            href={file.secureUrl || file.url}
            download={file.filename}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded"
          >
            Download
          </a>
        </div>
      </td>
    </tr>
  );
}

export default function FileBrowserClient({ initialFiles, currentUser, pagination, storageStats, filters }) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [permissionsFile, setPermissionsFile] = useState(null);
  const [showExternalStorage, setShowExternalStorage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState(filters.search || "");
  const [resourceType, setResourceType] = useState(filters.resourceType || "all");
  const [tags, setTags] = useState(filters.tags || "");
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || "");
  const [dateTo, setDateTo] = useState(filters.dateTo || "");
  const [sizeMin, setSizeMin] = useState(filters.sizeMin || "");
  const [sizeMax, setSizeMax] = useState(filters.sizeMax || "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [tagManagementFile, setTagManagementFile] = useState(null);

  const toggleSelection = useCallback((file) => {
    setSelectedFiles((prev) =>
      prev.find((f) => f._id === file._id)
        ? prev.filter((f) => f._id !== file._id)
        : [...prev, file]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFiles(files);
  }, [files]);

  const clearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (resourceType && resourceType !== "all") params.set("type", resourceType);
    if (tags) params.set("tags", tags);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (sizeMin) params.set("sizeMin", sizeMin);
    if (sizeMax) params.set("sizeMax", sizeMax);
    router.push(`/admin/files?${params.toString()}`);
  }, [search, resourceType, tags, dateFrom, dateTo, sizeMin, sizeMax, router]);

  const handleFileUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    const uploadedFiles = [];

    try {
      for (const file of Array.from(fileList)) {
        // Get signature
        const sigRes = await fetch("/api/uploads/cloudinary/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ folder: "uploads" }),
        });
        const sig = await sigRes.json();

        if (sig.error) {
          alert(`Failed to get signature for ${file.name}`);
          continue;
        }

        const { cloudName, apiKey, timestamp, signature, folder } = sig.data;

        // Upload to Cloudinary
        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", apiKey);
        fd.append("timestamp", String(timestamp));
        if (folder) fd.append("folder", folder);
        fd.append("signature", signature);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: "POST", body: fd }
        );
        const uploadData = await uploadRes.json();

        if (uploadData.error) {
          alert(`Upload failed for ${file.name}: ${uploadData.error.message}`);
          continue;
        }

        // Create file record
        const fileRecord = await fetch("/api/files", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            filename: uploadData.original_filename || file.name,
            originalFilename: file.name,
            url: uploadData.url,
            secureUrl: uploadData.secure_url,
            publicId: uploadData.public_id,
            resourceType: uploadData.resource_type,
            format: uploadData.format,
            mimeType: file.type,
            size: uploadData.bytes,
            width: uploadData.width,
            height: uploadData.height,
            duration: uploadData.duration,
            folder: uploadData.folder,
            cloudinaryMetadata: uploadData,
          }),
        });

        const fileData = await fileRecord.json();
        uploadedFiles.push(fileData);
      }

      // Refresh page
      router.refresh();
    } catch (e) {
      console.error("Upload error:", e);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm(`Delete ${selectedFiles.length} file(s)?`)) return;

    try {
      // Delete files from API
      await Promise.all(
        selectedFiles.map((file) =>
          fetch(`/api/files/${file._id}`, { method: "DELETE" })
        )
      );

      // Immediately remove deleted files from local state
      setFiles(prevFiles => 
        prevFiles.filter(file => 
          !selectedFiles.some(selected => selected._id === file._id)
        )
      );

      // Clear selection
      clearSelection();

      // Show success message
      alert(`Successfully deleted ${selectedFiles.length} file(s)`);
    } catch (e) {
      console.error("Delete error:", e);
      alert("Failed to delete files");
    }
  };

  const totalSize = storageStats.total;
  const totalFiles = Object.values(storageStats.byType).reduce(
    (acc, t) => acc + t.count,
    0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📁 File Manager</h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalFiles} files • {(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExternalStorage(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-medium"
          >
            ☁️ External Storage
          </button>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded font-medium"
          >
            📁 New Folder
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-white text-black rounded font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "📤 Upload Files"}
          </button>
        </div>
      </div>

      {/* Storage stats */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(storageStats.byType).map(([type, data]) => (
          <div key={type} className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
            <div className="text-2xl mb-2">
              {{ image: "🖼️", video: "🎬", audio: "🎵", raw: "📎" }[type] || "📄"}
            </div>
            <div className="text-sm text-gray-400">{type}</div>
            <div className="text-lg font-semibold text-white mt-1">{data.count}</div>
            <div className="text-xs text-gray-500">
              {(data.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ))}
      </div>

      {/* Filters and view controls */}
      <div className="space-y-4">
        {/* Basic Search */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search files, descriptions, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm"
          />
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="raw">Documents</option>
          </select>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm"
          >
            🔍 Advanced
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm"
          >
            Search
          </button>
          <div className="flex items-center gap-1 border border-neutral-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-sm ${
                viewMode === "grid" ? "bg-neutral-800" : "hover:bg-neutral-900"
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm ${
                viewMode === "list" ? "bg-neutral-800" : "hover:bg-neutral-900"
              }`}
            >
              ☰ List
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Tags Filter */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="design,logo,urgent"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
                />
              </div>

              {/* Size Range */}
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Size Range (MB)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={sizeMin}
                    onChange={(e) => setSizeMin(e.target.value)}
                    placeholder="Min"
                    className="flex-1 px-2 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={sizeMax}
                    onChange={(e) => setSizeMax(e.target.value)}
                    placeholder="Max"
                    className="flex-1 px-2 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
          <span className="text-sm text-white">
            {selectedFiles.length} file(s) selected
          </span>
          <button
            onClick={clearSelection}
            className="text-sm text-gray-400 hover:text-white"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Upload drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-neutral-800 bg-neutral-900/50"
        }`}
      >
        <div className="text-4xl mb-2">📤</div>
        <div className="text-sm text-gray-400">
          Drag and drop files here, or click the upload button above
        </div>
      </div>

      {/* File grid/list */}
      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📁</div>
          <p>No files found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <FileCard
              key={file._id}
              file={file}
              onSelect={toggleSelection}
              isSelected={selectedFiles.some((f) => f._id === file._id)}
              onPreview={setPreviewFile}
              onSetPermissions={setPermissionsFile}
              onManageTags={setTagManagementFile}
            />
          ))}
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-900">
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="py-3 px-4 w-12">
                  <input
                    type="checkbox"
                    onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                    className="w-4 h-4"
                  />
                </th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <FileListRow
                  key={file._id}
                  file={file}
                  onSelect={toggleSelection}
                  isSelected={selectedFiles.some((f) => f._id === file._id)}
                  onPreview={setPreviewFile}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => router.push(`/admin/files?page=${pagination.page - 1}`)}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={pagination.page === pagination.pages}
            onClick={() => router.push(`/admin/files?page=${pagination.page + 1}`)}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>
      )}

      {/* File preview modal */}
      {previewFile && (
        <FilePreview 
          file={previewFile} 
          onClose={() => setPreviewFile(null)}
          onShowVersionHistory={(file) => {
            setPreviewFile(null);
            setVersionHistoryFile(file);
          }}
        />
      )}

      {/* Version history modal */}
      {versionHistoryFile && (
        <FileVersionHistory
          file={versionHistoryFile}
          onClose={() => setVersionHistoryFile(null)}
          onVersionSelect={(version) => {
            setVersionHistoryFile(null);
            setPreviewFile(version);
          }}
        />
      )}

      {/* Create folder modal */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {/* File permissions modal */}
      {permissionsFile && (
        <FilePermissionsModal
          file={permissionsFile}
          onClose={() => setPermissionsFile(null)}
        />
      )}

      {/* Tag management modal */}
      {tagManagementFile && (
        <TagManagementModal
          file={tagManagementFile}
          onClose={() => setTagManagementFile(null)}
          onTagsUpdated={(updatedFile) => {
            // Update the file in local state
            setFiles(prev => prev.map(f => f._id === updatedFile._id ? updatedFile : f));
            setTagManagementFile(null);
          }}
        />
      )}

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

function ImagePreview({ file }) {
  const [zoomed, setZoomed] = useState(false);
  
  return (
    <div className="relative">
      <img
        src={file.secureUrl || file.url}
        alt={file.filename}
        className={`max-w-full max-h-[70vh] mx-auto rounded-lg cursor-pointer transition-transform ${
          zoomed ? "scale-150" : "scale-100"
        }`}
        onClick={() => setZoomed(!zoomed)}
      />
      <div className="mt-2 text-center text-xs text-gray-400">
        {file.width && file.height && `${file.width} × ${file.height}px`}
        {file.size && ` • ${(file.size / 1024 / 1024).toFixed(2)} MB`}
        <div className="mt-1 text-gray-500">Click to {zoomed ? "reset" : "zoom"}</div>
      </div>
    </div>
  );
}

function VideoPreview({ file }) {
  return (
    <div className="space-y-2">
      <video
        src={file.secureUrl || file.url}
        controls
        className="w-full max-h-[70vh] mx-auto rounded-lg bg-black"
      >
        Your browser does not support video playback.
      </video>
      <div className="text-center text-xs text-gray-400">
        {file.width && file.height && `${file.width} × ${file.height}px`}
        {file.duration && ` • ${Math.floor(file.duration / 60)}:${String(Math.floor(file.duration % 60)).padStart(2, "0")}`}
        {file.size && ` • ${(file.size / 1024 / 1024).toFixed(2)} MB`}
      </div>
    </div>
  );
}

function PDFPreview({ file }) {
  return (
    <div className="space-y-2">
      <iframe
        src={file.secureUrl || file.url}
        className="w-full h-[70vh] border border-neutral-700 rounded-lg bg-white"
        title={file.filename}
      />
      <div className="text-center text-xs text-gray-400">
        {file.size && `${(file.size / 1024 / 1024).toFixed(2)} MB`}
      </div>
    </div>
  );
}

function AudioPreview({ file }) {
  return (
    <div className="flex flex-col items-center space-y-4 py-8">
      <div className="text-6xl">🎵</div>
      <audio
        src={file.secureUrl || file.url}
        controls
        className="w-full max-w-md"
      >
        Your browser does not support audio playback.
      </audio>
      <div className="text-center text-xs text-gray-400">
        {file.duration && `Duration: ${Math.floor(file.duration / 60)}:${String(Math.floor(file.duration % 60)).padStart(2, "0")}`}
        {file.size && ` • ${(file.size / 1024 / 1024).toFixed(2)} MB`}
      </div>
    </div>
  );
}

function CodePreview({ file }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(file.secureUrl || file.url)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent("Failed to load file contents");
        setLoading(false);
      });
  }, [file]);

  return (
    <div className="space-y-2">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 max-h-[70vh] overflow-auto">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : (
          <pre className="text-xs text-gray-300 font-mono">
            <code>{content}</code>
          </pre>
        )}
      </div>
      <div className="text-center text-xs text-gray-400">
        {file.size && `${(file.size / 1024).toFixed(2)} KB`} • {file.format?.toUpperCase()}
      </div>
    </div>
  );
}

function DocumentPreview({ file }) {
  // Use Google Docs Viewer for Office files
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
    file.secureUrl || file.url
  )}&embedded=true`;

  return (
    <div className="space-y-2">
      <iframe
        src={viewerUrl}
        className="w-full h-[70vh] border border-neutral-700 rounded-lg bg-white"
        title={file.filename}
      />
      <div className="text-center text-xs text-gray-400">
        {file.size && `${(file.size / 1024 / 1024).toFixed(2)} MB`} • {file.format?.toUpperCase()}
      </div>
    </div>
  );
}

function DefaultPreview({ file }) {
  const fileIcon = {
    zip: "📦",
    rar: "📦",
    "7z": "📦",
    tar: "📦",
    gz: "📦",
    doc: "📄",
    docx: "📄",
    xls: "📊",
    xlsx: "📊",
    ppt: "📽️",
    pptx: "📽️",
    txt: "📝",
    csv: "📊",
    json: "📋",
    xml: "📋",
  }[file.format?.toLowerCase()] || "📎";

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="text-8xl">{fileIcon}</div>
      <div className="text-center">
        <div className="text-lg font-semibold text-white">{file.filename}</div>
        <div className="text-sm text-gray-400 mt-1">
          {file.format?.toUpperCase()} • {file.size && `${(file.size / 1024 / 1024).toFixed(2)} MB`}
        </div>
      </div>
      <a
        href={file.secureUrl || file.url}
        download={file.filename}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        Download File
      </a>
    </div>
  );
}

export default function FilePreview({ file, onClose, onShowVersionHistory }) {
  if (!file) return null;

  const fileType = file.resourceType || "raw";
  const format = file.format?.toLowerCase() || "";
  const mimeType = file.mimeType?.toLowerCase() || "";

  // Determine which preview component to use
  let PreviewComponent = DefaultPreview;

  if (fileType === "image" || mimeType.startsWith("image/")) {
    PreviewComponent = ImagePreview;
  } else if (fileType === "video" || mimeType.startsWith("video/")) {
    PreviewComponent = VideoPreview;
  } else if (format === "pdf" || mimeType === "application/pdf") {
    PreviewComponent = PDFPreview;
  } else if (mimeType.startsWith("audio/")) {
    PreviewComponent = AudioPreview;
  } else if (
    ["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "rb", "go", "rs", "php", "html", "css", "json", "xml", "yaml", "yml", "md", "txt"].includes(format)
  ) {
    PreviewComponent = CodePreview;
  } else if (
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(format) ||
    mimeType.includes("officedocument") ||
    mimeType.includes("msword") ||
    mimeType.includes("ms-excel") ||
    mimeType.includes("ms-powerpoint")
  ) {
    PreviewComponent = DocumentPreview;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{file.filename}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {file.uploadedBy && (
                <span>Uploaded by {file.uploadedBy.username || "Unknown"}</span>
              )}
              {file.createdAt && (
                <>
                  <span>•</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onShowVersionHistory && (
              <button
                onClick={() => onShowVersionHistory(file)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
              >
                📜 Versions
                {file.version && file.version > 1 && (
                  <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">
                    v{file.version}
                  </span>
                )}
              </button>
            )}
            <a
              href={file.secureUrl || file.url}
              download={file.filename}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors"
            >
              Download
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6">
          <PreviewComponent file={file} />
        </div>

        {/* Footer with metadata */}
        {file.tags && file.tags.length > 0 && (
          <div className="px-6 py-3 border-t border-neutral-800 flex items-center gap-2">
            <span className="text-xs text-gray-500">Tags:</span>
            {file.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-neutral-800 text-gray-300 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

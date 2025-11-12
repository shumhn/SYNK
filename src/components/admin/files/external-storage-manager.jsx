"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ExternalStorageManager({ onClose, onImportFile }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [importing, setImporting] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchAccounts();
    
    // Check for success messages from URL parameters
    const dropboxConnected = searchParams.get("dropbox_connected");
    const googleDriveConnected = searchParams.get("google_drive_connected");
    const error = searchParams.get("error");
    const details = searchParams.get("details");
    
    if (dropboxConnected === "true") {
      setSuccessMessage("Dropbox connected successfully!");
      // Clear the URL parameter
      const url = new URL(window.location);
      url.searchParams.delete("dropbox_connected");
      window.history.replaceState({}, "", url);
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    } else if (googleDriveConnected === "true") {
      setSuccessMessage("Google Drive connected successfully!");
      // Clear the URL parameter
      const url = new URL(window.location);
      url.searchParams.delete("google_drive_connected");
      window.history.replaceState({}, "", url);
      // Auto-clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(""), 5000);
    } else if (error) {
      let errorMessage = "Connection failed";
      if (error === "dropbox_connection_failed") {
        errorMessage = "Dropbox connection failed";
        if (details) {
          errorMessage += `: ${decodeURIComponent(details)}`;
        } else {
          errorMessage += ". Check that the redirect URI is correctly configured.";
        }
      }
      setSuccessMessage(errorMessage); // Using successMessage for errors too
      // Clear the URL parameters
      const url = new URL(window.location);
      url.searchParams.delete("error");
      url.searchParams.delete("details");
      window.history.replaceState({}, "", url);
    }
  }, [searchParams]);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/storage/accounts");
      const data = await res.json();
      if (!data.error) {
        setAccounts(data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch accounts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function connectGoogleDrive() {
    window.location.href = "/api/storage/google-drive/auth";
  }

  async function connectDropbox() {
    window.location.href = "/api/storage/dropbox/auth";
  }

  async function disconnectAccount(provider) {
    if (!confirm(`Disconnect ${provider === "google_drive" ? "Google Drive" : "Dropbox"}?`)) {
      return;
    }

    try {
      await fetch(`/api/storage/accounts?provider=${provider}`, {
        method: "DELETE",
      });
      await fetchAccounts();
      if (selectedProvider === provider) {
        setSelectedProvider(null);
        setFiles([]);
      }
    } catch (e) {
      console.error("Failed to disconnect:", e);
      alert("Failed to disconnect account");
    }
  }

  async function browseProvider(provider) {
    setSelectedProvider(provider);
    setLoadingFiles(true);
    try {
      const endpoint =
        provider === "google_drive"
          ? "/api/storage/google-drive/files"
          : "/api/storage/dropbox/files";

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setFiles(data.data?.files || []);
      }
    } catch (e) {
      console.error("Failed to fetch files:", e);
      alert("Failed to load files");
    } finally {
      setLoadingFiles(false);
    }
  }

  async function importFile(file) {
    setImporting(file.id);
    try {
      const endpoint =
        selectedProvider === "google_drive"
          ? "/api/storage/google-drive/files"
          : "/api/storage/dropbox/files";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          path: file.path_display, // For Dropbox
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert("File imported successfully!");
        onImportFile?.(data.data);
      }
    } catch (e) {
      console.error("Failed to import file:", e);
      alert("Failed to import file");
    } finally {
      setImporting(null);
    }
  }

  const getProviderIcon = (provider) => {
    return provider === "google_drive" ? "📂" : "📦";
  };

  const getProviderName = (provider) => {
    return provider === "google_drive" ? "Google Drive" : "Dropbox";
  };

  const googleDriveAccount = accounts.find((a) => a.provider === "google_drive" && a.isActive);
  const dropboxAccount = accounts.find((a) => a.provider === "dropbox" && a.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">☁️ External Storage</h3>
          <p className="text-sm text-gray-400 mt-1">
            Connect and import files from Google Drive or Dropbox
          </p>
          {successMessage && (
            <div className={`mt-3 p-3 border rounded-lg ${
              successMessage.includes("failed") || successMessage.includes("error") || successMessage.includes("Error")
                ? "bg-red-500/10 border-red-500/50"
                : "bg-green-500/10 border-green-500/50"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`text-lg ${
                  successMessage.includes("failed") || successMessage.includes("error") || successMessage.includes("Error")
                    ? "text-red-400"
                    : "text-green-400"
                }`}>
                  {successMessage.includes("failed") || successMessage.includes("error") || successMessage.includes("Error")
                    ? "❌"
                    : "✅"}
                </div>
                <p className={`font-medium ${
                  successMessage.includes("failed") || successMessage.includes("error") || successMessage.includes("Error")
                    ? "text-red-400"
                    : "text-green-400"
                }`}>
                  {successMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : !selectedProvider ? (
            <div className="space-y-4">
              {/* Google Drive */}
              <div className="p-4 border border-neutral-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">📂</div>
                    <div>
                      <div className="font-semibold text-white">Google Drive</div>
                      {googleDriveAccount ? (
                        <div className="text-sm text-gray-400">
                          Connected as {googleDriveAccount.accountEmail}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Not connected</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleDriveAccount ? (
                      <>
                        <button
                          onClick={() => browseProvider("google_drive")}
                          className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
                        >
                          Browse Files
                        </button>
                        <button
                          onClick={() => disconnectAccount("google_drive")}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={connectGoogleDrive}
                        className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dropbox */}
              <div className="p-4 border border-neutral-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">📦</div>
                    <div>
                      <div className="font-semibold text-white">Dropbox</div>
                      {dropboxAccount ? (
                        <div className="text-sm text-gray-400">
                          Connected as {dropboxAccount.accountEmail}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Not connected</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {dropboxAccount ? (
                      <>
                        <button
                          onClick={() => browseProvider("dropbox")}
                          className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
                        >
                          Browse Files
                        </button>
                        <button
                          onClick={() => disconnectAccount("dropbox")}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={connectDropbox}
                        className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">ℹ️</div>
                  <div className="text-sm text-gray-300">
                    <div className="font-semibold text-white mb-1">How it works</div>
                    <ul className="space-y-1 text-gray-400 list-disc list-inside">
                      <li>Connect your Google Drive or Dropbox account</li>
                      <li>Browse your files directly from the external storage</li>
                      <li>Import files to your project - they'll be copied to Cloudinary</li>
                      <li>Disconnect anytime to revoke access</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  setFiles([]);
                }}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
              >
                ← Back to storage accounts
              </button>

              {/* Provider header */}
              <div className="flex items-center gap-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                <div className="text-3xl">{getProviderIcon(selectedProvider)}</div>
                <div>
                  <div className="font-semibold text-white">
                    {getProviderName(selectedProvider)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {accounts.find((a) => a.provider === selectedProvider)?.accountEmail}
                  </div>
                </div>
              </div>

              {/* Files list */}
              {loadingFiles ? (
                <div className="text-center py-12 text-gray-500">Loading files...</div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-3">📁</div>
                  <p>No files found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border border-neutral-800 rounded-lg hover:border-neutral-700"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-2xl">
                          {file.mimeType?.includes("folder") ? "📁" : "📄"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {file.name || file.path_display}
                          </div>
                          {file.size && (
                            <div className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          )}
                        </div>
                      </div>
                      {!file.mimeType?.includes("folder") && (
                        <button
                          onClick={() => importFile(file)}
                          disabled={importing === file.id}
                          className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                        >
                          {importing === file.id ? "Importing..." : "Import"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

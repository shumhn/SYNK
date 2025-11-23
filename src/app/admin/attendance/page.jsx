"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("my-logs");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  
  // Manual time entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [manualEntry, setManualEntry] = useState({
    taskId: "",
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    minutes: 0,
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchTasks();
    fetchCurrentUser();
  }, [activeTab, dateRange]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      
      // If manager view, we might want all users (API handles permission)
      // For now, let's just show current user's logs
      
      const res = await fetch(`/api/time-tracking?${query}`);
      const data = await res.json();
      if (!data.error) {
        setLogs(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTasks() {
    try {
      // Fetch all tasks from all projects user has access to
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (!data.error) {
        setTasks(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!data.error) {
        setCurrentUser(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function approveReject(logId, status) {
    try {
      const res = await fetch(`/api/time-tracking/${logId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!data.error) {
        fetchLogs(); // Refresh
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("Error updating status");
    }
  }

  async function submitManualEntry(e) {
    e.preventDefault();
    if (!manualEntry.taskId || (manualEntry.hours === 0 && manualEntry.minutes === 0)) {
      alert("Please select a task and enter duration");
      return;
    }

    setSubmitting(true);
    try {
      const totalMinutes = (manualEntry.hours * 60) + manualEntry.minutes;
      const res = await fetch('/api/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          taskId: manualEntry.taskId,
          duration: totalMinutes,
          date: manualEntry.date,
          description: manualEntry.description,
        }),
      });

      const data = await res.json();
      if (!data.error) {
        setShowManualModal(false);
        setManualEntry({
          taskId: "",
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          minutes: 0,
          description: "",
        });
        fetchLogs(); // Refresh
      } else {
        alert(data.message || "Failed to log time");
      }
    } catch (e) {
      alert("Error logging time");
    } finally {
      setSubmitting(false);
    }
  }

  function exportToCSV() {
    // CSV headers
    let csv = "Date,Task/Activity,Project,Start Time,End Time,Duration (minutes),Duration (hours),Status\n";
    
    // Add data rows
    logs.forEach((log) => {
      const date = format(new Date(log.startTime), "yyyy-MM-dd");
      const task = log.task ? log.task.title : log.description || "Manual Entry";
      const project = log.project?.title || "";
      const startTime = format(new Date(log.startTime), "HH:mm");
      const endTime = log.endTime ? format(new Date(log.endTime), "HH:mm") : "Running";
      const durationMin = log.duration || 0;
      const durationHours = (durationMin / 60).toFixed(2);
      const status = durationMin > 480 ? "OVERTIME" : "Normal";
      
      csv += `${date},"${task}","${project}",${startTime},${endTime},${durationMin},${durationHours},${status}\n`;
    });
    
    // Create download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${dateRange.start}_to_${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-white mb-2">Time Tracking</h1>
        <p className="text-sm text-neutral-400">Manage attendance and task logs</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-neutral-900/50 p-4 rounded-xl border border-neutral-800/50">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neutral-700"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-neutral-700"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-sm font-medium hover:bg-neutral-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          
          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-200 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log Time Manually
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-950 text-neutral-400 font-medium border-b border-neutral-800">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Task / Activity</th>
              <th className="px-6 py-3">Project</th>
              <th className="px-6 py-3">Start Time</th>
              <th className="px-6 py-3">End Time</th>
              <th className="px-6 py-3 text-right">Duration</th>
              {(currentUser?.roles?.includes("admin") || currentUser?.roles?.includes("hr") || currentUser?.roles?.includes("manager")) && (
                <th className="px-6 py-3 text-center">Status</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={(currentUser?.roles?.includes("admin") || currentUser?.roles?.includes("hr") || currentUser?.roles?.includes("manager")) ? "7" : "6"} className="px-6 py-8 text-center text-neutral-500">
                  Loading logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={(currentUser?.roles?.includes("admin") || currentUser?.roles?.includes("hr") || currentUser?.roles?.includes("manager")) ? "7" : "6"} className="px-6 py-8 text-center text-neutral-500">
                  No time logs found for this period.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isOvertime = log.duration && log.duration > 480; // 8 hours = 480 minutes
                return (
                  <tr key={log._id} className={`transition ${isOvertime ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-neutral-800/30'}`}>
                    <td className="px-6 py-3 text-neutral-300">
                      {format(new Date(log.startTime), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-3 text-white font-medium">
                      {log.task ? log.task.title : log.description || "Manual Entry"}
                    </td>
                    <td className="px-6 py-3 text-neutral-400">
                      {log.project?.title || "-"}
                    </td>
                    <td className="px-6 py-3 text-neutral-400 font-mono text-xs">
                      {format(new Date(log.startTime), "HH:mm")}
                    </td>
                    <td className="px-6 py-3 text-neutral-400 font-mono text-xs">
                      {log.endTime ? format(new Date(log.endTime), "HH:mm") : <span className="text-green-400 animate-pulse">Running...</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <span className={isOvertime ? 'text-red-400 font-semibold' : 'text-neutral-300'}>
                          {log.duration ? formatDuration(log.duration) : "-"}
                        </span>
                        {isOvertime && (
                          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded border border-red-500/30">
                            OVERTIME
                          </span>
                        )}
                      </div>
                    </td>
                    {(currentUser?.roles?.includes("admin") || currentUser?.roles?.includes("hr") || currentUser?.roles?.includes("manager")) && (
                      <td className="px-6 py-3">
                        {log.status === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => approveReject(log._id, "approved")}
                              className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => approveReject(log._id, "rejected")}
                              className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <span className={`text-xs px-2 py-1 rounded ${
                              log.status === "approved" 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-red-500/20 text-red-400"
                            }`}>
                              {log.status === "approved" ? "✓ Approved" : "✗ Rejected"}
                            </span>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          {/* Footer Total */}
          {!loading && logs.length > 0 && (
            <tfoot className="bg-neutral-950 border-t border-neutral-800 font-semibold text-white">
              <tr>
                <td colSpan="5" className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <span>Total Duration:</span>
                    {logs.filter(l => l.duration > 480).length > 0 && (
                      <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30">
                        {logs.filter(l => l.duration > 480).length} Overtime Entries
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-right font-mono text-green-400">
                  {formatDuration(logs.reduce((acc, log) => acc + (log.duration || 0), 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Manual Time Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowManualModal(false)}>
          <div className="bg-neutral-900 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-white mb-4">Log Time Manually</h2>
            
            <form onSubmit={submitManualEntry} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Task *</label>
                <select
                  value={manualEntry.taskId}
                  onChange={(e) => setManualEntry({ ...manualEntry, taskId: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-neutral-700"
                  required
                >
                  <option value="">Select a task...</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title} {task.project?.title && `(${task.project.title})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">Date *</label>
                <input
                  type="date"
                  value={manualEntry.date}
                  onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-neutral-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={manualEntry.hours}
                    onChange={(e) => setManualEntry({ ...manualEntry, hours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualEntry.minutes}
                    onChange={(e) => setManualEntry({ ...manualEntry, minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">Description (optional)</label>
                <textarea
                  value={manualEntry.description}
                  onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-neutral-700 resize-none"
                  rows={3}
                  placeholder="What did you work on?"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {submitting ? "Logging..." : "Log Time"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

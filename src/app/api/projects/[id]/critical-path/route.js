import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }

  await connectToDatabase();
  const tasks = await Task.find({ project: id })
    .select("title estimatedHours dependencies status dueDate")
    .lean();

  const n = tasks.length;
  const idIndex = new Map();
  tasks.forEach((t, idx) => idIndex.set(t._id.toString(), idx));

  // Build adjacency, in-degree, weights
  const adj = Array.from({ length: n }, () => []);
  const indeg = Array(n).fill(0);
  const weight = tasks.map((t) => (typeof t.estimatedHours === "number" && t.estimatedHours > 0 ? t.estimatedHours : 1));

  for (let i = 0; i < n; i++) {
    const deps = tasks[i].dependencies || [];
    for (const d of deps) {
      const j = idIndex.get(d.toString());
      if (j !== undefined) {
        // edge from dep(j) -> task(i)
        adj[j].push(i);
        indeg[i] += 1;
      }
    }
  }

  // Kahn topological order
  const q = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
  const topo = [];
  while (q.length) {
    const u = q.shift();
    topo.push(u);
    for (const v of adj[u]) {
      indeg[v] -= 1;
      if (indeg[v] === 0) q.push(v);
    }
  }

  if (topo.length !== n) {
    return NextResponse.json({ error: false, data: { hasCycle: true, message: "Dependency cycle detected" } }, { status: 200 });
  }

  // Longest path on DAG using weights
  const dist = Array(n).fill(-Infinity);
  const parent = Array(n).fill(-1);
  for (const u of topo) {
    if (dist[u] === -Infinity) dist[u] = weight[u];
    for (const v of adj[u]) {
      if (dist[v] < dist[u] + weight[v]) {
        dist[v] = dist[u] + weight[v];
        parent[v] = u;
      }
    }
  }
  let end = 0;
  for (let i = 1; i < n; i++) if (dist[i] > dist[end]) end = i;

  // Reconstruct path
  const pathIdx = [];
  let cur = end;
  const seen = new Set();
  while (cur !== -1 && !seen.has(cur)) {
    seen.add(cur);
    pathIdx.push(cur);
    cur = parent[cur];
  }
  pathIdx.reverse();

  const path = pathIdx.map((i) => ({
    id: tasks[i]._id,
    title: tasks[i].title,
    estimatedHours: weight[i],
    status: tasks[i].status,
  }));
  const totalHours = path.reduce((s, p) => s + p.estimatedHours, 0);

  return NextResponse.json({ error: false, data: { hasCycle: false, totalHours, path } }, { status: 200 });
}

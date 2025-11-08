"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

function RoleChip({ text }) {
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">{text}</span>;
}

function NodeBox({ title, subtitle, badges = [], hasChildren, collapsed, onToggle }) {
  return (
    <div className="inline-block relative">
      {hasChildren && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute -left-5 top-2 w-4 h-4 flex items-center justify-center rounded border border-neutral-700 text-xs hover:bg-neutral-800"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "+" : "−"}
        </button>
      )}
      <div className="inline-block bg-neutral-900 border border-neutral-800 rounded px-3 py-2 min-w-[180px] text-center">
        <div className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: title }} />
        {subtitle ? <div className="text-xs text-gray-400" dangerouslySetInnerHTML={{ __html: subtitle }} /> : null}
        <div className="mt-1 flex flex-wrap gap-1 justify-center">
          {badges.map((b, i) => (
            <RoleChip key={i} text={b} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrgTreeClient({ root, ctas }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(new Set());

  // Highlight helper
  function hi(text) {
    if (!query) return text;
    try {
      const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
      return String(text || "").replace(re, "<mark class='bg-yellow-500/70 text-black px-0.5 rounded'>$1</mark>");
    } catch {
      return String(text || "");
    }
  }

  // Filter tree by query (keeps ancestors of matches)
  const filtered = useMemo(() => {
    if (!query) return root;
    function walk(node) {
      const title = node.title || "";
      const subtitle = node.subtitle || "";
      const match = [title, subtitle, ...(node.badges || [])].some((t) => String(t).toLowerCase().includes(query.toLowerCase()));
      const kids = (node.children || []).map(walk).filter(Boolean);
      if (match || kids.length) {
        return { ...node, title: hi(title), subtitle: hi(subtitle), children: kids };
      }
      return null;
    }
    return walk(root) || { ...root, children: [] };
  }, [root, query]);

  function toggleAll(expand) {
    const keys = new Set();
    function collect(node, path) {
      const hasChildren = Array.isArray(node.children) && node.children.length;
      if (hasChildren) keys.add(path);
      (node.children || []).forEach((c, i) => collect(c, `${path}.${i}`));
    }
    collect(filtered, "root");
    setCollapsed(expand ? new Set() : keys);
  }

  function toggle(path) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const emptyHints = (
    <div className="mb-3 text-sm flex flex-wrap gap-3">
      {!ctas.hasHead && (
        <Link className="underline" href={`/admin/departments/${ctas.departmentId}`}>Assign Head</Link>
      )}
      {!ctas.hasManagers && (
        <Link className="underline" href={`/admin/departments/${ctas.departmentId}`}>Add Manager</Link>
      )}
      {!ctas.hasTeams && (
        <Link className="underline" href={`/admin/teams?department=${ctas.departmentId}`}>Create Team</Link>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, roles, teams..."
          className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 w-full max-w-sm"
        />
        <button type="button" onClick={() => toggleAll(true)} className="px-2 py-1 text-sm rounded bg-neutral-800">Expand all</button>
        <button type="button" onClick={() => toggleAll(false)} className="px-2 py-1 text-sm rounded bg-neutral-800">Collapse all</button>
      </div>
      {!ctas.hasHead || !ctas.hasManagers || !ctas.hasTeams ? emptyHints : null}
      <div className="w-full overflow-x-auto">
        <div className="tree flex justify-center">
          <ul className="inline-block">
            <OrgNode node={filtered} path="root" collapsed={collapsed} onToggle={toggle} />
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrgNode({ node, path, collapsed, onToggle }) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isCollapsed = collapsed.has(path);
  return (
    <li>
      <NodeBox
        title={node.title}
        subtitle={node.subtitle}
        badges={node.badges}
        hasChildren={hasChildren}
        collapsed={isCollapsed}
        onToggle={() => onToggle(path)}
      />
      {hasChildren && !isCollapsed && (
        <ul>
          {node.children.map((c, i) => (
            <OrgNode key={i} node={c} path={`${path}.${i}`} collapsed={collapsed} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}

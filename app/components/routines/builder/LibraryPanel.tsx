"use client";

import { useState, useEffect } from "react";

type LibTask = {
  id: string;
  name: string;
  description?: string|null;
  default_points: number;
  is_system: boolean;
};

type LibGroupItem = { task_id: string; name: string; order_index: number; default_points: number };

type LibGroup = {
  id: string;
  name: string;
  is_system: boolean;
  items?: LibGroupItem[];
};

export default function LibraryPanel({
  onAddGroupFromTemplate,
  onAddTaskFromTemplate,
}: {
  onAddGroupFromTemplate: (groupTemplateId: string) => void;
  onAddTaskFromTemplate: (taskTemplateId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"groups"|"tasks">("groups");
  const [groups, setGroups] = useState<LibGroup[]>([]);
  const [tasks, setTasks] = useState<LibTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tab === "groups") {
          const { listLibraryGroups } = await import("../../../lib/api");
          const data = await listLibraryGroups(q, true);
          setGroups(data || []);
        } else {
          const { listLibraryTasks } = await import("../../../lib/api");
          const data = await listLibraryTasks(q);
          setTasks(data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    // debounce a bit
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [q, tab]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded ${tab==='groups'?'bg-primary text-white':'bg-gray-100'}`}
            onClick={() => setTab("groups")}
          >
            Groups
          </button>
          <button
            className={`px-3 py-1.5 rounded ${tab==='tasks'?'bg-primary text-white':'bg-gray-100'}`}
            onClick={() => setTab("tasks")}
          >
            Tasks
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : tab === "groups" ? (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="p-3 border rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-xs text-gray-500">{g.items?.length || 0} tasks</div>
              </div>
              <button
                onClick={() => onAddGroupFromTemplate(g.id)}
                className="px-2 py-1 rounded border text-sm hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium">{t.name}</div>
                {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
              </div>
              <button
                onClick={() => onAddTaskFromTemplate(t.id)}
                className="px-2 py-1 rounded border text-sm hover:bg-gray-50"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

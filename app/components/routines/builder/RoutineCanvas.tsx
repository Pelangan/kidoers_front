"use client";

export type UiGroup = {
  id: string;
  name: string;
  time_of_day?: "morning"|"afternoon"|"evening"|"night" | null;
  order_index: number;
  tasks: UiTask[];
};

export type UiTask = {
  id: string;
  name: string;
  description?: string | null;
  points: number;
  order_index: number;
  group_id?: string | null;
};

export default function RoutineCanvas({
  groups,
  onAddEmptyGroup,
  onDeleteGroup,
  onAddCustomTask,
  onDeleteTask,
  onAddTaskFromTemplate,
}: {
  groups: UiGroup[];
  onAddEmptyGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onAddCustomTask: (groupId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskFromTemplate: (groupId?: string) => void; // will open right‑pane selector via callback
}) {
  return (
    <div className="space-y-4">
      {/* Top actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onAddEmptyGroup()}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          + Add Group
        </button>
        <button
          onClick={() => onAddCustomTask(undefined)}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          + Add Task (no group)
        </button>
        <button
          onClick={() => onAddTaskFromTemplate(undefined)}
          className="px-3 py-2 rounded-lg border hover:bg-gray-50"
        >
          + Add Task from Library
        </button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="bg-white border rounded-xl shadow-sm p-6 text-center text-gray-500">
          No groups yet — add a group or add tasks directly.
        </div>
      ) : (
        <div className="space-y-4">
          {groups
            .sort((a, b) => a.order_index - b.order_index)
            .map((g) => (
              <div key={g.id} className="bg-white border rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{g.name}</div>
                    {g.time_of_day && (
                      <div className="text-xs text-gray-500 capitalize">
                        {g.time_of_day}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onAddCustomTask(g.id)}
                      className="px-2 py-1 rounded border text-sm hover:bg-gray-50"
                    >
                      + Task
                    </button>
                    <button
                      onClick={() => onAddTaskFromTemplate(g.id)}
                      className="px-2 py-1 rounded border text-sm hover:bg-gray-50"
                    >
                      + From Library
                    </button>
                    <button
                      onClick={() => onDeleteGroup(g.id)}
                      className="px-2 py-1 rounded border text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete Group
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {g.tasks.length === 0 ? (
                    <div className="text-sm text-gray-500">No tasks in this group</div>
                  ) : (
                    g.tasks
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{t.name}</div>
                            {t.description && (
                              <div className="text-xs text-gray-500">{t.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">+{t.points}</span>
                            <button
                              onClick={() => onDeleteTask(t.id)}
                              className="text-red-600 text-sm hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

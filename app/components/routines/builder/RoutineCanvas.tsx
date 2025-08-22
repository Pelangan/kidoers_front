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
  familyMembers,
  routineName,
  onRoutineNameChange,
  onAddEmptyGroup,
  onDeleteGroup,
  onAddCustomTask,
  onDeleteTask,
  onAddTaskFromTemplate,
}: {
  groups: UiGroup[];
  familyMembers: any[];
  routineName: string;
  onRoutineNameChange: (name: string) => void;
  onAddEmptyGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onAddCustomTask: (groupId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskFromTemplate: (groupId?: string) => void; // will open right‑pane selector via callback
}) {
  return (
    <div className="space-y-6">
      {/* Routine Details Section */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Routine Details</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Routine Name
          </label>
          <input
            type="text"
            value={routineName}
            onChange={(e) => onRoutineNameChange(e.target.value)}
            placeholder="My Family Routine"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Family Members as Columns */}
      {familyMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {familyMembers.map((member) => (
            <div key={member.id} className="bg-white border rounded-xl shadow-sm p-4">
              <div className="text-center mb-4">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl"
                  style={{ 
                    backgroundColor: member.color || '#3B82F6',
                    border: `3px solid ${member.color || '#3B82F6'}`
                  }}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{member.role}</p>
              </div>
              
              {/* Drop Zone for Tasks */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 hover:border-gray-400 transition-colors">
                <div className="text-gray-400 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium">Drop tasks here</p>
                <p className="text-xs">Drag from the library panel</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border rounded-xl shadow-sm p-6 text-center text-gray-500">
          <p>No family members found. Please complete family setup first.</p>
        </div>
      )}

      {/* Legacy Groups Section (Hidden for now) */}
      {false && groups.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Task Groups</h3>
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

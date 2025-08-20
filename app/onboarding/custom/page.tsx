"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RoutineBuilderShell from "../../components/routines/builder/RoutineBuilderShell";
import RoutineHeader from "../../components/routines/builder/RoutineHeader";
import RoutineCanvas, { UiGroup, UiTask } from "../../components/routines/builder/RoutineCanvas";
import LibraryPanel from "../../components/routines/builder/LibraryPanel";
import {
  createRoutineDraft,
  patchRoutine,
  addRoutineGroup,
  addRoutineTask,
  deleteRoutineGroup,
  deleteRoutineTask,
  updateOnboardingStep,
} from "../../lib/api";

export default function CustomRoutinePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const familyId = sp.get("family");
  const [routine, setRoutine] = useState<{ id: string; family_id: string; name: string; status: "draft"|"active"|"archived" }|null>(null);
  const [groups, setGroups] = useState<UiGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|null>(null);

  // create draft routine on first mount
  useEffect(() => {
    (async () => {
      if (!familyId) {
        router.push("/onboarding"); // safety
        return;
      }
      setBusy(true);
      setError(null);
      try {
        console.log('Updating onboarding step to:', "create_routine");
        await updateOnboardingStep(familyId, "create_routine"); // resume point
        console.log('Onboarding step updated successfully');
        
        console.log('Creating routine draft...');
        const created = await createRoutineDraft(familyId, "My Routine");
        console.log('Routine draft created:', created);
        setRoutine(created);
      } catch (e:any) {
        console.error('Error in useEffect:', e);
        setError(e?.message || "Failed to start routine");
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const onRename = async (name: string) => {
    if (!routine) return;
    try {
      const updated = await patchRoutine(routine.id, { name });
      setRoutine(updated);
    } catch (e:any) {
      setError("Failed to rename routine");
    }
  };

  const onPublish = async () => {
    if (!routine) return;
    setBusy(true);
    try {
      const updated = await patchRoutine(routine.id, { status: "active" });
      setRoutine(updated);
      // Optionally navigate to next onboarding step or dashboard
      router.push(`/dashboard`); // adjust once we define the next step
    } catch (e:any) {
      setError("Failed to publish routine");
    } finally {
      setBusy(false);
    }
  };

  // Add group from template
  const addGroupFromTemplate = async (groupTemplateId: string) => {
    if (!routine) return;
    try {
      const grp = await addRoutineGroup(routine.id, { from_group_template_id: groupTemplateId });
      // tasks for that group were inserted on server; we only know the group now.
      // For simplicity, keep tasks list empty until user adds more (or you can fetch tasks list later).
      setGroups((prev) => [...prev, { id: grp.id, name: grp.name, time_of_day: grp.time_of_day, order_index: grp.order_index, tasks: [] }]);
    } catch {
      setError("Failed to add group");
    }
  };

  // Add empty group
  const addEmptyGroup = async () => {
    if (!routine) return;
    try {
      const grp = await addRoutineGroup(routine.id, { name: "New Group" });
      setGroups((prev) => [...prev, { id: grp.id, name: grp.name, time_of_day: grp.time_of_day, order_index: grp.order_index, tasks: [] }]);
    } catch {
      setError("Failed to add group");
    }
  };

  // Add custom task
  const addCustomTask = async (groupId?: string) => {
    if (!routine) return;
    const name = prompt("Task name?");
    if (!name) return;
    try {
      const t = await addRoutineTask(routine.id, { group_id: groupId, name, points: 1 });
      setGroups((prev) => {
        if (groupId) {
          return prev.map((g) =>
            g.id === groupId
              ? { ...g, tasks: [...g.tasks, { id: t.id, name: t.name, description: t.description, points: t.points, order_index: t.order_index, group_id: t.group_id }] }
              : g
          );
        } else {
          // tasks without a group → create a pseudo "Unassigned" group
          const un = prev.find((g) => g.id === "unassigned");
          const taskUi = { id: t.id, name: t.name, description: t.description, points: t.points, order_index: t.order_index, group_id: null as any };
          if (un) {
            return prev.map((g) => (g.id === "unassigned" ? { ...g, tasks: [...g.tasks, taskUi] } : g));
          } else {
            return [{ id: "unassigned", name: "Unassigned", time_of_day: undefined, order_index: -1, tasks: [taskUi] }, ...prev];
          }
        }
      });
    } catch {
      setError("Failed to add task");
    }
  };

  // Add task from library template
  const addTaskFromTemplate = async (groupId?: string) => {
    if (!routine) return;
    const taskTemplateId = prompt("Paste Task Template ID to add:");
    if (!taskTemplateId) return;
    try {
      const t = await addRoutineTask(routine.id, { group_id: groupId, from_task_template_id: taskTemplateId });
      setGroups((prev) =>
        prev.map((g) =>
          g.id === (groupId || "unassigned")
            ? { ...g, tasks: [...g.tasks, { id: t.id, name: t.name, description: t.description, points: t.points, order_index: t.order_index, group_id: t.group_id }] }
            : g
        )
      );
    } catch {
      setError("Failed to add task from template");
    }
  };

  const onDeleteGroup = async (groupId: string) => {
    if (!routine) return;
    if (!confirm("Delete this group?")) return;
    try {
      await deleteRoutineGroup(routine.id, groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch {
      setError("Failed to delete group");
    }
  };

  const onDeleteTask = async (taskId: string) => {
    if (!routine) return;
    try {
      await deleteRoutineTask(routine.id, taskId);
      setGroups((prev) =>
        prev.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }))
      );
    } catch {
      setError("Failed to delete task");
    }
  };

  return (
    <RoutineBuilderShell
      header={
        <RoutineHeader
          initialName={routine?.name || "My Routine"}
          onRename={onRename}
          onPublish={onPublish}
          busy={busy}
          onBack={() => router.back()}
        />
      }
      center={
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3">
              {error}
            </div>
          )}
          <RoutineCanvas
            groups={groups}
            onAddEmptyGroup={addEmptyGroup}
            onDeleteGroup={onDeleteGroup}
            onAddCustomTask={addCustomTask}
            onDeleteTask={onDeleteTask}
            onAddTaskFromTemplate={addTaskFromTemplate}
          />
        </>
      }
      right={
        <LibraryPanel
          onAddGroupFromTemplate={addGroupFromTemplate}
          onAddTaskFromTemplate={(tid) => addTaskFromTemplate(/* group undefined: unassigned */)}
        />
      }
    />
  );
}

import { useState } from "react";
import {
  bulkUpdateDayOrders,
  patchRoutineTask,
} from "../../../../lib/api";
import {
  extractRoutineTaskIdFromId,
} from "../utils/taskUtils";
import type {
  Task,
  BulkDayOrderUpdate,
  DaySpecificOrder,
} from "../types/routineBuilderTypes";

export const useTaskOrdering = () => {
  const [dayOrders, setDayOrders] = useState<DaySpecificOrder[]>([]);

  // Save day-specific order to backend
  const saveDaySpecificOrder = async (
    day: string,
    memberId: string,
    tasks: Task[],
    currentRoutineId: string,
  ) => {
    console.log(
      "[DRAG-ORDER] 🚀 saveDaySpecificOrder called!",
      {
        day,
        memberId,
        taskCount: tasks.length,
        tasks: tasks.map((t) => ({ id: t.id, name: t.name })),
        currentRoutineId,
      },
    );

    if (!currentRoutineId) {
      console.log(
        "[DRAG-ORDER] ❌ No routine ID for saving day-specific order",
      );
      return;
    }

    try {
      console.log("[DRAG-ORDER] 💾 Saving day-specific order for:", {
        day,
        memberId,
        tasks: tasks.map((t) => t.name),
      });

      const taskOrders = tasks.map((task, index) => {
        // Use routine_task_id if available, otherwise extract from id
        const routineTaskId =
          task.routine_task_id || extractRoutineTaskIdFromId(task.id);
        console.log("[DRAG-ORDER] 🔍 ID extraction:", {
          originalId: task.id,
          routine_task_id: task.routine_task_id,
          extractedId: extractRoutineTaskIdFromId(task.id),
          finalId: routineTaskId,
          taskName: task.name,
          hasRoutineTaskId: !!task.routine_task_id,
        });
        return {
          routine_task_id: routineTaskId,
          order_index: index,
        };
      });

      console.log("[DRAG-ORDER] 🔍 Task order mapping:", {
        originalTaskIds: tasks.map((t) => t.id),
        extractedRoutineTaskIds: taskOrders.map((to) => to.routine_task_id),
        taskNames: tasks.map((t) => t.name),
        taskRoutineTaskIds: tasks.map((t) => t.routine_task_id),
        taskOrdersWithIndex: taskOrders.map((to, idx) => ({
          routine_task_id: to.routine_task_id,
          order_index: to.order_index,
          taskName: tasks[idx]?.name,
          taskId: tasks[idx]?.id,
          hasRoutineTaskId: !!tasks[idx]?.routine_task_id,
        })),
      });

      console.log(
        "[DRAG-ORDER] 🔍 Detailed task analysis:",
        tasks.map((t, idx) => ({
          index: idx,
          taskId: t.id,
          taskName: t.name,
          routineTaskId: t.routine_task_id,
          extractedId: extractRoutineTaskIdFromId(t.id),
          finalRoutineTaskId:
            t.routine_task_id || extractRoutineTaskIdFromId(t.id),
          memberId: t.memberId,
        })),
      );

      const bulkUpdate: BulkDayOrderUpdate = {
        member_id: memberId,
        day_of_week: day,
        task_orders: taskOrders,
      };

      console.log("[DRAG-ORDER] 🚀 Sending bulk update to backend:", {
        routineId: currentRoutineId,
        bulkUpdate: {
          member_id: bulkUpdate.member_id,
          day_of_week: bulkUpdate.day_of_week,
          task_orders: bulkUpdate.task_orders.map((to) => ({
            routine_task_id: to.routine_task_id,
            order_index: to.order_index,
          })),
        },
      });

      const updatedOrders = await bulkUpdateDayOrders(
        currentRoutineId,
        bulkUpdate,
      );
      console.log("[DRAG-ORDER] ✅ Day-specific order saved:", updatedOrders);
      console.log(
        "[DRAG-ORDER] 📊 Backend returned orders:",
        updatedOrders.map((o) => ({
          id: o.id,
          routine_task_id: o.routine_task_id,
          order_index: o.order_index,
          day_of_week: o.day_of_week,
        })),
      );

      console.log("[DRAG-ORDER] 🔍 Expected vs Actual orders:", {
        expectedCount: taskOrders.length,
        actualCount: updatedOrders.length,
        expectedOrderIndexes: taskOrders.map((to) => to.order_index),
        actualOrderIndexes: updatedOrders.map((o) => o.order_index),
      });

      // Update local day orders state
      setDayOrders((prev) => {
        // Remove existing orders for this member/day
        const filtered = prev.filter(
          (order) =>
            !(order.member_id === memberId && order.day_of_week === day),
        );
        // Add new orders
        return [...filtered, ...updatedOrders];
      });
    } catch (error) {
      console.error(
        "[DRAG-ORDER] ❌ Failed to save day-specific order:",
        error,
      );
      // TODO: Show user-friendly error message
    }
  };

  // Move task to a new day (cross-column dragging)
  const moveTaskToNewDay = async (
    task: Task,
    fromDay: string,
    toDay: string,
    memberId: string,
    ensureRoutineExists: () => Promise<any>,
    setCalendarTasks: (updater: (prev: any) => any) => void,
    setError: (error: string) => void,
  ) => {
    console.log(
      "[MOVE-TASK] Moving task:",
      task.name,
      "from",
      fromDay,
      "to",
      toDay,
    );

    try {
      // Get routine ID
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        setError("Failed to get routine information. Please try again.");
        return;
      }

      // Update task in backend to new day
      console.log("[MOVE-TASK] 🗑️ Updating task in backend to new day:", toDay);

      // TODO: For recurring tasks, we should update the template instead of individual task
      // This would require a simpler API endpoint for updating just the template's days_of_week
      // For now, we update the individual task and rely on the template system for consistency
      await patchRoutineTask(routineData.id, task.id, {
        days_of_week: [toDay],
      });
      console.log("[MOVE-TASK] ✅ Task updated in backend successfully");

      // Update UI state
      setCalendarTasks((prev) => {
        const newCalendarTasks = { ...prev };

        // Remove from source day
        newCalendarTasks[fromDay] = {
          ...newCalendarTasks[fromDay],
          individualTasks: newCalendarTasks[fromDay].individualTasks.filter(
            (t) => t.id !== task.id,
          ),
        };

        // Add to target day
        newCalendarTasks[toDay] = {
          ...newCalendarTasks[toDay],
          individualTasks: [
            ...newCalendarTasks[toDay].individualTasks,
            {
              ...task,
              days_of_week: [toDay], // Update the task's days
            },
          ],
        };

        // Day orders are now handled by the drag and drop hook

        return newCalendarTasks;
      });

      console.log("[MOVE-TASK] ✅ Task moved successfully");
    } catch (error) {
      console.error("[MOVE-TASK] ❌ Error moving task:", error);
      throw error;
    }
  };

  return {
    dayOrders,
    setDayOrders,
    saveDaySpecificOrder,
    moveTaskToNewDay,
  };
};

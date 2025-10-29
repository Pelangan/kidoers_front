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
    if (!currentRoutineId) {
      return;
    }

    try {
      const taskOrders = tasks.map((task, index) => {
        const routineTaskId =
          task.routine_task_id || extractRoutineTaskIdFromId(task.id);
        return {
          routine_task_id: routineTaskId,
          order_index: index,
        };
      });

      const bulkUpdate: BulkDayOrderUpdate = {
        member_id: memberId,
        day_of_week: day,
        task_orders: taskOrders,
      };

      const updatedOrders = await bulkUpdateDayOrders(
        currentRoutineId,
        bulkUpdate,
      );

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
      console.error("Failed to save day-specific order:", error);
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

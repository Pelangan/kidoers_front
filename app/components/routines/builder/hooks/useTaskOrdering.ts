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
    routineFilter?: 'ALL' | 'UNASSIGNED' | string, // Added: routine filter to determine ordering strategy
  ) => {
    if (!currentRoutineId) {
      return;
    }

    try {
      // IMPORTANT: Backend scopes orders by (routine_id, group_id, day_of_week, bucket_type, member_id)
      // When filter is "ALL", we want global ordering (tasks can be mixed across groups)
      // When filter is a specific group, we want per-group ordering (each group has its own sequence)
      
      const taskOrders: Array<{ routine_task_id: string; order_index: number }> = [];
      
      if (routineFilter === 'ALL') {
        // Global ordering: assign order_index sequentially (0, 1, 2, ...) regardless of group
        // This allows tasks from different groups to be mixed in the order
        tasks.forEach((task, index) => {
          const routineTaskId =
            task.routine_task_id || extractRoutineTaskIdFromId(task.id);
          
          taskOrders.push({
            routine_task_id: routineTaskId,
            order_index: index, // Global order index
          });
        });
      } else {
        // Per-group ordering: each group has its own sequence starting from 0
        // Group tasks by group_id
        const tasksByGroup = new Map<string | null, Task[]>();
        tasks.forEach((task) => {
          const groupId = task.group_id || null;
          if (!tasksByGroup.has(groupId)) {
            tasksByGroup.set(groupId, []);
          }
          tasksByGroup.get(groupId)!.push(task);
        });
        
        // Process each group separately to maintain their relative order
        // We'll process groups in the order they appear in the tasks array
        const groupOrder = new Map<string | null, number>();
        let groupIndex = 0;
        tasks.forEach((task) => {
          const groupId = task.group_id || null;
          if (!groupOrder.has(groupId)) {
            groupOrder.set(groupId, groupIndex++);
          }
        });
        
        // Sort groups by their appearance order
        const sortedGroups = Array.from(tasksByGroup.entries()).sort((a, b) => {
          const orderA = groupOrder.get(a[0]) || 0;
          const orderB = groupOrder.get(b[0]) || 0;
          return orderA - orderB;
        });
        
        // Build task orders maintaining the original order within each group
        sortedGroups.forEach(([groupId, groupTasks]) => {
          // Within each group, assign order_index starting from 0
          groupTasks.forEach((task, groupTaskIndex) => {
            const routineTaskId =
              task.routine_task_id || extractRoutineTaskIdFromId(task.id);
            
            taskOrders.push({
              routine_task_id: routineTaskId,
              order_index: groupTaskIndex, // Order within the group, not global
            });
          });
        });
      }

      console.log('[DND-KIT] 📦 Building payload:', {
        totalTasks: tasks.length,
        uniqueTaskOrders: taskOrders.length,
        routineFilter: routineFilter || 'ALL',
        orderingStrategy: routineFilter === 'ALL' ? 'global' : 'per-group',
        taskOrders: taskOrders.map((to: { routine_task_id: string; order_index: number }, idx: number) => {
          const task = tasks.find((t: Task) => {
            const rtId = t.routine_task_id || extractRoutineTaskIdFromId(t.id);
            return rtId === to.routine_task_id;
          });
          return {
            routine_task_id: to.routine_task_id,
            order_index: to.order_index,
            task_name: task?.name,
            group_id: task?.group_id
          };
        })
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
        if (routineFilter === 'ALL') {
          // When filter is "ALL", we're ordering globally across all groups
          // Remove ALL orders for this member/day (not just specific groups)
          // because the global order affects all tasks regardless of group
          const filtered = prev.filter(
            (order) => {
              // Keep orders that don't match this member/day
              return !(order.member_id === memberId && order.day_of_week === day)
            }
          );
          // Add new orders (which include all groups with global order_index)
          return [...filtered, ...updatedOrders];
        } else {
          // When filter is a specific group, only remove orders for that group
          // Remove existing orders for this member/day/group combination
          const groupIdsToReplace = new Set(updatedOrders.map(o => o.group_id || null))
          const filtered = prev.filter(
            (order) => {
              const orderGroupId = order.group_id || null
              // Keep orders that don't match this member/day OR have a different group_id
              return !(order.member_id === memberId && 
                     order.day_of_week === day && 
                     groupIdsToReplace.has(orderGroupId))
            }
          );
          // Add new orders
          return [...filtered, ...updatedOrders];
        }
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
            (t: Task) => t.id !== task.id,
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

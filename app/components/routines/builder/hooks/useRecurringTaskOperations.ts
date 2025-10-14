import {
  bulkDeleteTasks,
  getTaskForEdit,
  getRoutineFullData,
  updateTemplateDays,
} from "../../../../lib/api";
import {
  extractTaskId,
} from "../utils/taskUtils";
import {
  normalizeWeekdays,
} from "../utils/recurrence";
import type {
  Task,
  RecurringTemplate,
} from "../types/routineBuilderTypes";

export const useRecurringTaskOperations = () => {
  // Handle removing a day from a recurring task (updates template)
  const handleRemoveDayFromRecurringTask = async (
    task: Task,
    dayToRemove: string,
    memberId: string,
    ensureRoutineExists: () => Promise<any>,
    setError: (error: string) => void,
    setRecurringTemplates: (templates: RecurringTemplate[]) => void,
    loadExistingRoutineData: (routineId: string, familyMembers: any[]) => Promise<void>,
    familyMembers: any[],
  ) => {
    console.log("[REMOVE-DAY] Removing day from recurring task:", {
      taskName: task.name,
      dayToRemove,
      memberId,
      recurringTemplateId: task.recurring_template_id,
    });

    if (!task.recurring_template_id) {
      console.log(
        "[REMOVE-DAY] ❌ Task has no recurring_template_id, cannot remove day",
      );
      return;
    }

    try {
      // Get routine data
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        setError("Failed to get routine information. Please try again.");
        return;
      }

      // Get current template data - extract actual task ID if it contains day suffix
      const actualTaskId = extractTaskId(task.id);
      const templateData = (await getTaskForEdit(
        routineData.id,
        actualTaskId,
      )) as any;
      const currentDays = normalizeWeekdays(
        templateData.template_days_of_week || [],
      );

      console.log("[REMOVE-DAY] Current template days:", currentDays);

      // Remove the day from the template
      const newDays = currentDays.filter(
        (day) => day !== dayToRemove.toLowerCase(),
      );

      if (newDays.length === 0) {
        // If no days remain, delete the entire template and all associated tasks
        console.log(
          "[REMOVE-DAY] No days remaining, deleting entire template and all tasks",
        );

        const deleteResult = (await bulkDeleteTasks(routineData.id, {
          recurring_template_id: task.recurring_template_id,
          delete_scope: "all_days",
          target_day: dayToRemove,
        })) as any;

        console.log(
          "[REMOVE-DAY] ✅ Template and all tasks deleted:",
          deleteResult,
        );

        // Refresh the routine data to get updated templates
        const fullData = await getRoutineFullData(routineData.id);
        setRecurringTemplates(fullData.recurring_templates || []);

        // Refresh calendar tasks by triggering a re-fetch
        await loadExistingRoutineData(routineData.id, familyMembers);

        return;
      }

      console.log("[REMOVE-DAY] New template days:", newDays);

      // Update the template
      const result = (await updateTemplateDays(
        routineData.id,
        task.recurring_template_id,
        {
          days_of_week: newDays,
        },
      )) as any;

      console.log("[REMOVE-DAY] ✅ Template updated:", result);

      // Refresh the routine data to get updated templates
      const fullData = await getRoutineFullData(routineData.id);
      setRecurringTemplates(fullData.recurring_templates || []);

      // Refresh calendar tasks by triggering a re-fetch
      // We'll let the useEffect handle the refresh when recurringTemplates changes

      console.log("[REMOVE-DAY] ✅ Day removed successfully");
    } catch (error) {
      console.error("[REMOVE-DAY] ❌ Error removing day:", error);
      setError("Failed to remove day from recurring task. Please try again.");
    }
  };

  return {
    handleRemoveDayFromRecurringTask,
  };
};

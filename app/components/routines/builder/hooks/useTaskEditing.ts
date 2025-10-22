import { getTaskForEdit, getRoutineFullData } from "../../../../lib/api";
import {
  extractTaskId,
  getTaskFrequencyType,
  getTaskDaysOfWeek,
} from "../utils/taskUtils";
import {
  optionFromTemplate,
  normalizeWeekdays,
  type Weekday,
} from "../utils/recurrence";
import { DAYS_OF_WEEK } from "../utils/calendarTransform";
import type {
  Task,
  RecurringTemplate,
  DaySelection,
  PendingDrop,
} from "../types/routineBuilderTypes";

export const useTaskEditing = () => {
  // Handle edit task - opens the Apply Tasks To modal
  const handleEditTask = async (
    selectedTaskForEdit: { task: Task; day: string; memberId: string } | null,
    currentRoutineId: string | null,
    calendarTasks: Record<string, { groups: any[]; individualTasks: Task[] }>,
    recurringTemplates: RecurringTemplate[],
    setRecurringTemplates: (templates: RecurringTemplate[]) => void,
    setPendingDrop: (drop: PendingDrop | null) => void,
    setTaskAssignmentMemberIds: (ids: string[]) => void,
    setDaySelection: (selection: DaySelection) => void,
    setEditableTaskName: (name: string) => void,
    setSelectedWhoOption: (option: string) => void,
    setSelectedRoutineGroup: (groupId: string) => void,
    setShowTaskMiniPopup: (show: boolean) => void,
    setMiniPopupPosition: (position: { x: number; y: number } | null) => void,
    setShowApplyToPopup: (show: boolean) => void,
    setIsCreatingTasks: (loading: boolean) => void,
    getMemberNameById: (id: string) => string,
  ) => {
    if (!selectedTaskForEdit) {
      console.log("[TASK-EDIT] ❌ No selectedTaskForEdit, cannot edit");
      return;
    }

    console.log("[TASK-EDIT] ===== EDIT TASK DEBUG START =====");
    console.log(
      "[TASK-EDIT] Opening edit modal for task:",
      selectedTaskForEdit.task.name,
    );
    
    // Set loading state to prevent modal from opening too early
    setIsCreatingTasks(true);
    console.log("[TASK-EDIT] Selected task for edit:", {
      taskId: selectedTaskForEdit.task.id,
      routineTaskId: selectedTaskForEdit.task.routine_task_id,
      memberCount: selectedTaskForEdit.task.member_count,
      assignees: selectedTaskForEdit.task.assignees?.length,
      isMultiMember:
        selectedTaskForEdit.task.member_count &&
        selectedTaskForEdit.task.member_count > 1,
    });
    console.log("[TASK-EDIT] Full task object:", selectedTaskForEdit.task);
    console.log("[TASK-EDIT] Task details:", {
      name: selectedTaskForEdit.task.name,
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      template_id: selectedTaskForEdit.task.template_id,
      is_system: selectedTaskForEdit.task.is_system,
      memberId: selectedTaskForEdit.task.memberId,
      id: selectedTaskForEdit.task.id,
    });

    // Skip API refresh to prevent overwriting correct frontend state
    console.log("[TASK-EDIT] 🔍 DEBUG: Skipping API refresh to preserve frontend state");
    console.log("[TASK-EDIT] 🔍 DEBUG: Current recurringTemplates state:", recurringTemplates);

    // Check if this task appears on multiple days in the calendar
    const taskAppearsOnDays: string[] = [];
    Object.keys(calendarTasks).forEach((day) => {
      const dayTasks = calendarTasks[day].individualTasks || [];
      const hasTaskOnDay = dayTasks.some((task) => {
        // Check by name and member ID for recurring tasks
        return (
          task.name === selectedTaskForEdit.task.name &&
          (task.memberId === selectedTaskForEdit.memberId ||
            task.memberId === selectedTaskForEdit.task.memberId)
        );
      });
      if (hasTaskOnDay) {
        taskAppearsOnDays.push(day);
      }
    });

    console.log(
      "[TASK-EDIT] Task appears on days (from calendar):",
      taskAppearsOnDays,
    );
    console.log(
      "[TASK-EDIT] Task appears on",
      taskAppearsOnDays.length,
      "days",
    );

    // Set up the task for editing
    setPendingDrop({
      type: "task",
      item: selectedTaskForEdit.task,
      targetMemberId: selectedTaskForEdit.memberId,
      targetMemberName: getMemberNameById(selectedTaskForEdit.memberId),
      targetDay: selectedTaskForEdit.day,
      fromGroup: undefined,
    });

    // For multi-member tasks, initialize taskAssignmentMemberIds with all assignees
    if (
      selectedTaskForEdit.task.member_count &&
      selectedTaskForEdit.task.member_count > 1 &&
      selectedTaskForEdit.task.assignees
    ) {
      console.log(
        "[TASK-EDIT] Multi-member task detected, initializing with all assignees:",
        selectedTaskForEdit.task.assignees.map((a) => ({
          id: a.id,
          name: a.name,
        })),
      );
      const assigneeIds = selectedTaskForEdit.task.assignees.map(
        (assignee) => assignee.id,
      );
      setTaskAssignmentMemberIds(assigneeIds);
    } else {
      console.log(
        "[TASK-EDIT] Single-member task, initializing with clicked member:",
        selectedTaskForEdit.memberId,
      );
      setTaskAssignmentMemberIds([selectedTaskForEdit.memberId]);
    }

    // Get fresh template data from API instead of stale state
    console.log(
      "[TASK-EDIT] 🔍 DEBUG: Getting fresh template data from API...",
    );

    let templateDays: Weekday[] = [];
    let frequencyType = "weekly";
    let hasException = false;

    if (selectedTaskForEdit.task.recurring_template_id) {
      try {
        // Get routine data first
        const routineData = await getRoutineFullData(currentRoutineId!);
        if (!routineData) {
          console.error("Failed to get routine information");
          return;
        }

        // Get fresh template data from the API
        const actualTaskId = extractTaskId(selectedTaskForEdit.task.id);
        console.log('[TASK-EDIT] 🔍 Task ID extraction:', {
          original_id: selectedTaskForEdit.task.id,
          extracted_id: actualTaskId,
          routine_id: currentRoutineId
        });
        const templateData = (await getTaskForEdit(
          currentRoutineId!,
          actualTaskId,
        )) as any;

        console.log(
          "[TASK-EDIT] 🔍 Fresh template data from API:",
          templateData,
        );
        console.log(
          "[TASK-EDIT] 🔍 Raw template_days_of_week:",
          templateData.template_days_of_week,
        );
        console.log(
          "[TASK-EDIT] 🔍 Raw template_frequency_type:",
          templateData.template_frequency_type,
        );

        // Use template data as source of truth
        templateDays = normalizeWeekdays(
          templateData.template_days_of_week || [],
        );
        frequencyType = templateData.template_frequency_type || "weekly";
        hasException = templateData.has_exception_for_date || false;

        console.log("[TASK-EDIT] ✅ Using fresh template data:", {
          templateDays,
          frequencyType,
          hasException,
          rawTemplateDays: templateData.template_days_of_week,
          rawFrequencyType: templateData.template_frequency_type,
        });
      } catch (error) {
        console.warn(
          "[TASK-EDIT] ⚠️ Failed to get fresh template data, falling back to state:",
          error,
        );
        // Fallback to stale state data
        frequencyType = getTaskFrequencyType(
          selectedTaskForEdit.task,
          recurringTemplates,
        );
        const templateDaysOfWeek = getTaskDaysOfWeek(
          selectedTaskForEdit.task,
          recurringTemplates,
        );
        templateDays = normalizeWeekdays(templateDaysOfWeek);
      }
    } else {
      // For tasks without templates, use empty days (should not happen with new system)
      templateDays = [];
      frequencyType = "weekly";
    }

    console.log("[TASK-EDIT] Template-based recurrence data:", {
      templateDays,
      hasException,
      templateFrequencyType: frequencyType,
    });

    // Determine recurrence option from template
    const recurrenceOption = optionFromTemplate(templateDays, hasException);

    console.log("[TASK-EDIT] 🔍 DEBUG: Template days and recurrence option:", {
      templateDays,
      templateDaysLength: templateDays.length,
      recurrenceOption,
      hasException,
      isEveryDay: templateDays.length === 7,
      allDays: DAYS_OF_WEEK
    });

    // Set day selection based on recurrence option
    // Default to 'custom' mode (Select specific days)
    let daySelectionMode: "everyday" | "custom" = "custom";
    let selectedDays: string[] = [selectedTaskForEdit.day];

    if (recurrenceOption === "EVERY_DAY") {
      daySelectionMode = "everyday";
      selectedDays = DAYS_OF_WEEK;
      console.log("[TASK-EDIT] 🔍 DEBUG: Setting EVERY_DAY mode with all days:", selectedDays);
    } else if (recurrenceOption === "SPECIFIC_DAYS") {
      daySelectionMode = "custom";
      selectedDays = templateDays.length > 0 ? templateDays : taskAppearsOnDays;
      console.log("[TASK-EDIT] 🔍 DEBUG: Setting SPECIFIC_DAYS mode with days:", selectedDays);
    }
    // Note: Removed "Just this day" option - now only "Every day" and "Select specific days"

    console.log("[TASK-EDIT] Final day selection based on template:", {
      recurrenceOption,
      mode: daySelectionMode,
      selectedDays,
      templateDays,
      hasException,
    });

    // Initialize day selection with the correct mode based on template frequency
    setDaySelection({ mode: daySelectionMode, selectedDays: selectedDays });

    console.log("[TASK-EDIT] ===== EDIT TASK DEBUG END =====");
    
    // Clear loading state now that data is ready
    setIsCreatingTasks(false);

    // Close mini popup but preserve selectedTaskForEdit for editing
    setShowTaskMiniPopup(false);
    setMiniPopupPosition(null);
    // Don't call closeTaskMiniPopup() as it clears selectedTaskForEdit

    setEditableTaskName(selectedTaskForEdit.task.name);
    setSelectedWhoOption("none");
    setSelectedRoutineGroup("none");

    // Open modal immediately since loading state is now cleared
    console.log(
      "[TASK-EDIT] 🔍 Opening edit modal with selectedTaskForEdit preserved:",
      selectedTaskForEdit,
    );
    setShowApplyToPopup(true);
  };

  return {
    handleEditTask,
  };
};

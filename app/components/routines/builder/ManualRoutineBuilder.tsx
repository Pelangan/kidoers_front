"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTaskOperations } from "../../../hooks/useTaskOperations";
import { useTaskOperations as useTaskOperationsBuilder } from "./hooks/useTaskOperations";
import { useTaskCreation } from "./hooks/useTaskCreation";
import { useRoutineDataLoader } from "./hooks/useRoutineDataLoader";
import {
  bulkUpdateDayOrders,
  patchRoutineTask,
  getTaskForEdit,
  bulkDeleteTasks,
  getRoutineFullData,
  updateTemplateDays,
} from "../../../lib/api";
import RoutineDetailsModal from "./RoutineDetailsModal";
import type {
  ManualRoutineBuilderProps,
  Task,
  TaskGroup,
  ApplyToOption,
  PendingDrop,
  DaySelection,
  FamilyMember,
  DaySpecificOrder,
  BulkDayOrderUpdate,
  RoutineScheduleData,
} from "./types/routineBuilderTypes";
import {
  extractMemberIdFromId,
  extractRoutineTaskIdFromId,
  getTotalTasksForDay,
  deriveScheduleFromCalendar,
  getTaskFrequencyType,
  getTaskDaysOfWeek,
  getTaskDisplayFrequency,
} from "./utils/taskUtils";
import {
  optionFromTemplate,
  helperLabel,
  optionToDays,
  validateRecurrenceSelection,
  normalizeWeekdays,
  extractTaskId,
  type RecurrenceOption,
  type Weekday,
} from "./utils/recurrence";
import { useRoutineData } from "./hooks/useRoutineData";
import { useFamilyMembers } from "./hooks/useFamilyMembers";
import { useCalendarTasks } from "./hooks/useCalendarTasks";
import { useTaskModals } from "./hooks/useTaskModals";
import { useTaskDragAndDrop } from "./hooks/useTaskDragAndDrop";
import { FamilyMemberSelector } from "./components/FamilyMemberSelector";
import { CalendarGrid } from "./components/CalendarGrid";
import { PlannerWeek } from "./components/PlannerWeek";
import TaskCreationModal from "./components/TaskCreationModal";
import TaskMiniPopup from "./components/TaskMiniPopup";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import RoutineDetailsCard from "./components/RoutineDetailsCard";
import BackButton from "./components/BackButton";
import SaveButtonSection from "./components/SaveButtonSection";
import { transformCalendarTasksToWeekData, shouldShowBuckets, DAYS_OF_WEEK } from "./utils/calendarTransform";
import { User, Baby, UserCheck, Users } from "lucide-react";


export default function ManualRoutineBuilder({
  familyId: propFamilyId,
  onComplete,
  isEditMode = false,
  onBack,
}: ManualRoutineBuilderProps = {}) {
  console.log(
    "[KIDOERS-ROUTINE] 🚀 ManualRoutineBuilder: Component mounted with props:",
    {
      propFamilyId,
      isEditMode,
      hasOnComplete: !!onComplete,
      hasOnBack: !!onBack,
    },
  );
  console.log(
    "[KIDOERS-ROUTINE] 🔍 Edit Mode Debug - isEditMode value:",
    isEditMode,
    "type:",
    typeof isEditMode,
  );
  const router = useRouter();
  const sp = useSearchParams();
  const familyId = propFamilyId || sp?.get("family");
  console.log(
    "[KIDOERS-ROUTINE] 🏠 ManualRoutineBuilder: Final familyId:",
    familyId,
  );

  // Debug component lifecycle
  useEffect(() => {
    console.log(
      "[KIDOERS-ROUTINE] ManualRoutineBuilder: Component mounted/updated",
    );
    return () => {
      console.log(
        "[KIDOERS-ROUTINE] ManualRoutineBuilder: Component unmounting",
      );
    };
  }, []);

  // Use routine data hook
  const {
    routine,
    routineName,
    isCreatingRoutine,
    hasUnsavedChanges,
    routineScheduleData,
    currentRoutineId,
    recurringTemplates,
    setRoutine,
    setRoutineName,
    setHasUnsavedChanges,
    setRoutineScheduleData,
    setCurrentRoutineId,
    setRecurringTemplates,
    ensureRoutineExists,
    handleSaveRoutineDetails,
    handleSaveRoutine,
  } = useRoutineData(familyId, isEditMode, onComplete);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Use task modals hook
  const {
    showApplyToPopup,
    showTaskMiniPopup,
    showDeleteConfirmModal,
    showRoutineDetails,
    showCreateGroupModal,
    editableTaskName,
    selectedTaskForEdit,
    miniPopupPosition,
    deleteScope,
    daySelection,
    selectedWhoOption,
    selectedRoutineGroup,
    taskAssignmentMemberIds,
    isCreatingTasks,
    isDeletingTask,
    setShowApplyToPopup,
    setShowTaskMiniPopup,
    setShowDeleteConfirmModal,
    setShowRoutineDetails,
    setShowCreateGroupModal,
    setEditableTaskName,
    setSelectedTaskForEdit,
    setMiniPopupPosition,
    setDeleteScope,
    setDaySelection,
    setSelectedWhoOption,
    setSelectedRoutineGroup,
    setTaskAssignmentMemberIds,
    setIsCreatingTasks,
    setIsDeletingTask,
    openTaskModal,
    closeTaskModal,
    openTaskMiniPopup,
    closeTaskMiniPopup,
    openDeleteConfirmModal,
    closeDeleteConfirmModal,
    openRoutineDetailsModal,
    closeRoutineDetailsModal,
    openCreateGroupModal,
    closeCreateGroupModal,
    resetFormState,
    closeAllModals,
  } = useTaskModals();
  const [routineGroups, setRoutineGroups] = useState<TaskGroup[]>([]);
  const [viewMode, setViewMode] = useState<"calendar" | "group">("calendar");

  // Task operations with undo functionality
  const { showUndoToast } = useTaskOperations();

  // Apply to options
  const applyToOptions: ApplyToOption[] = [
    {
      id: "none",
      label: "This member only",
      icon: <User className="w-4 h-4" />,
      filter: () => [],
    },
    {
      id: "all-kids",
      label: "All kids",
      icon: <Baby className="w-4 h-4" />,
      filter: (members) => members.filter((m) => m.type === "child"),
    },
    {
      id: "all-parents",
      label: "All parents",
      icon: <UserCheck className="w-4 h-4" />,
      filter: (members) => members.filter((m) => m.type === "parent"),
    },
    {
      id: "all-family",
      label: "All family",
      icon: <Users className="w-4 h-4" />,
      filter: (members) => members,
    },
  ];

  // Use family members hook
  const {
    familyMembers,
    enhancedFamilyMembers,
    selectedMemberIds,
    setFamilyMembers,
    setEnhancedFamilyMembers,
    setSelectedMemberIds,
    loadFamilyMembers,
    getMemberColors,
    getSelectedMembers,
    getSelectedMember, // For backward compatibility
    getMemberById,
    getMemberNameById,
  } = useFamilyMembers(familyId);

  // Use calendar tasks hook
  const {
    calendarTasks,
    setCalendarTasks,
    addTaskToCalendarUI,
    addTaskToCalendar,
    removeGroupFromCalendar,
    addGroupToCalendar,
    addGroupToCalendarUI,
    updateCalendarTasks,
    getTotalTasks,
  } = useCalendarTasks(selectedMemberIds[0], ensureRoutineExists, setError);

  // Load all initial data using the hook (moved after hook declarations)

  // Save day-specific order to backend
  const saveDaySpecificOrder = async (
    day: string,
    memberId: string,
    tasks: Task[],
  ) => {
    console.log(
      "[DRAG-ORDER] 🚀 saveDaySpecificOrder called in ManualRoutineBuilder!",
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

  // Use task drag and drop hook
  const {
    draggedTask,
    dragOverPosition,
    dayOrders,
    isDragging,
    setDraggedTask,
    setDragOverPosition,
    setDayOrders,
    setIsDragging,
    handleTaskDragStart,
    handleTaskDragOver,
    handleTaskDragLeave,
    handleTaskDrop,
    handleTaskDragEnd,
    moveTaskToPosition,
    getTasksWithDayOrder,
    loadDayOrders,
  } = useTaskDragAndDrop(
    calendarTasks,
    updateCalendarTasks,
    extractRoutineTaskIdFromId,
    currentRoutineId,
    saveDaySpecificOrder,
    recurringTemplates,
    () => loadExistingRoutineData(currentRoutineId!, enhancedFamilyMembers),
  );


  // Move task to a new day (cross-column dragging)
  const moveTaskToNewDay = async (
    task: Task,
    fromDay: string,
    toDay: string,
    memberId: string,
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

  // Handle task click for mini popup
  const handleTaskClick = (
    e: React.MouseEvent,
    task: Task,
    day: string,
    memberId: string,
  ) => {
    e.stopPropagation();
    console.log(
      "[TASK-CLICK] Task clicked:",
      task.name,
      "showTaskMiniPopup:",
      showTaskMiniPopup,
      "isDeletingTask:",
      isDeletingTask,
    );
    console.log("[TASK-CLICK] Task details:", {
      taskId: task.id,
      routineTaskId: task.routine_task_id,
      memberCount: task.member_count,
      assignees: task.assignees?.length,
      isMultiMember: task.member_count && task.member_count > 1,
    });

    // Prevent opening popup if it's already open or if we're deleting
    if (showTaskMiniPopup || isDeletingTask) {
      console.log(
        "[TASK-CLICK] Popup already open or deleting, ignoring click",
      );
      return;
    }

    // Add a small delay to prevent rapid clicks
    setTimeout(() => {
      if (!showTaskMiniPopup && !isDeletingTask) {
        console.log("[TASK-CLICK] Opening popup after delay");
        setSelectedTaskForEdit({ task, day, memberId });
        setMiniPopupPosition({ x: e.clientX, y: e.clientY });
        setShowTaskMiniPopup(true);
      }
    }, 50);
  };

  // handleColumnClick and handleColumnClickWrapper moved to useTaskCreation hook

  // Handle removing a day from a recurring task (updates template)
  const handleRemoveDayFromRecurringTask = async (
    task: Task,
    dayToRemove: string,
    memberId: string,
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

  // Handle edit task - opens the Apply Tasks To modal
  const handleEditTask = async () => {
    if (!selectedTaskForEdit) {
      console.log("[TASK-EDIT] ❌ No selectedTaskForEdit, cannot edit");
      return;
    }

    console.log("[TASK-EDIT] ===== EDIT TASK DEBUG START =====");
    console.log(
      "[TASK-EDIT] Opening edit modal for task:",
      selectedTaskForEdit.task.name,
    );
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
      days_of_week: selectedTaskForEdit.task.days_of_week,
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      template_id: selectedTaskForEdit.task.template_id,
      is_system: selectedTaskForEdit.task.is_system,
      memberId: selectedTaskForEdit.task.memberId,
      id: selectedTaskForEdit.task.id,
    });

    // Refresh routine data to ensure we have the latest template information
    if (currentRoutineId) {
      console.log(
        "[TASK-EDIT] 🔄 Refreshing routine data to get latest template info...",
      );
      try {
        const fullData = await getRoutineFullData(currentRoutineId);
        setRecurringTemplates(fullData.recurring_templates || []);
        console.log(
          "[TASK-EDIT] ✅ Updated recurring templates:",
          fullData.recurring_templates,
        );
      } catch (error) {
        console.warn("[TASK-EDIT] ⚠️ Failed to refresh routine data:", error);
      }
    }

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
        const routineData = await ensureRoutineExists();
        if (!routineData) {
          setError("Failed to get routine information. Please try again.");
          return;
        }

        // Get fresh template data from the API
        const actualTaskId = extractTaskId(selectedTaskForEdit.task.id);
        const templateData = (await getTaskForEdit(
          routineData.id,
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
      // For non-recurring tasks, use task data directly
      templateDays = normalizeWeekdays(
        selectedTaskForEdit.task.days_of_week || [],
      );
      frequencyType = selectedTaskForEdit.task.frequency || "weekly";
    }

    console.log("[TASK-EDIT] Template-based recurrence data:", {
      templateDays,
      hasException,
      templateFrequencyType: frequencyType,
    });

    // Determine recurrence option from template
    const recurrenceOption = optionFromTemplate(templateDays, hasException);

    // Set day selection based on recurrence option
    // Default to 'custom' mode (Select specific days)
    let daySelectionMode: "everyday" | "custom" = "custom";
    let selectedDays: string[] = [selectedTaskForEdit.day];

    if (recurrenceOption === "EVERY_DAY") {
      daySelectionMode = "everyday";
      selectedDays = DAYS_OF_WEEK;
    } else if (recurrenceOption === "SPECIFIC_DAYS") {
      daySelectionMode = "custom";
      selectedDays = templateDays.length > 0 ? templateDays : taskAppearsOnDays;
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

    // Close mini popup but preserve selectedTaskForEdit for editing
    setShowTaskMiniPopup(false);
    setMiniPopupPosition(null);
    // Don't call closeTaskMiniPopup() as it clears selectedTaskForEdit

    setEditableTaskName(selectedTaskForEdit.task.name);
    setSelectedWhoOption("none");
    setSelectedRoutineGroup("none");

    // Use setTimeout to ensure state update happens before modal opens
    setTimeout(() => {
      console.log(
        "[TASK-EDIT] 🔍 Opening edit modal with selectedTaskForEdit preserved:",
        selectedTaskForEdit,
      );
      setShowApplyToPopup(true);
    }, 0);
  };

  // handleApplyToSelection moved to useTaskCreation hook

  // Wrapper functions to handle error state
  const handleSaveRoutineDetailsWrapper = async (
    scheduleData: RoutineScheduleData,
  ) => {
    try {
      await handleSaveRoutineDetails(scheduleData);
      setShowRoutineDetails(false);
    } catch (err) {
      setError("Failed to save routine details. Please try again.");
    }
  };

  const handleSaveRoutineWrapper = async () => {
    setBusy(true);
    try {
      await handleSaveRoutine();
    } catch (error) {
      setError("Failed to save routine. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const totalTasks = getTotalTasks();

  // loadExistingRoutineData moved to useRoutineDataLoader hook

  // Routine data loader hook (data loading and initialization) - must come first
  const { loadAllData, loadExistingRoutineData } = useRoutineDataLoader({
    familyId,
    isEditMode,
    isLoadingData,
    selectedMemberIds,
    setBusy,
    setError,
    setIsLoadingData,
    setRoutine,
    setRoutineName,
    setHasUnsavedChanges,
    setCurrentRoutineId,
    setRecurringTemplates,
    setRoutineGroups,
    setEnhancedFamilyMembers,
    setCalendarTasks,
    setRoutineScheduleData,
    loadFamilyMembers,
    loadDayOrders,
  });

  // Task operations hook (delete, recurring deletion, etc.)
  const { handleDeleteIndividualTask, handleRecurringTaskDeletion } = useTaskOperationsBuilder({
    selectedTaskForEdit,
    calendarTasks,
    currentRoutineId,
    enhancedFamilyMembers,
    recurringTemplates,
    setCalendarTasks,
    setError,
    setShowTaskMiniPopup,
    setMiniPopupPosition,
    setSelectedTaskForEdit,
    setRecurringTemplates,
    ensureRoutineExists,
    openDeleteConfirmModal,
    closeDeleteConfirmModal,
    showUndoToast,
    loadExistingRoutineData,
  });

  // Task creation hook (column clicks, task creation logic)
  const { handleColumnClick, handleColumnClickWrapper, handleApplyToSelection } = useTaskCreation({
    selectedMemberIds,
    pendingDrop,
    editableTaskName,
    daySelection,
    selectedWhoOption,
    selectedRoutineGroup,
    taskAssignmentMemberIds,
    setPendingDrop,
    setEditableTaskName,
    setDaySelection,
    setSelectedWhoOption,
    setSelectedRoutineGroup,
    setTaskAssignmentMemberIds,
    setShowApplyToPopup,
    getMemberNameById,
  });

  // Load all initial data using the hook
  useEffect(() => {
    loadAllData();
  }, [familyId]); // Removed loadAllData from deps to prevent infinite loop

  return (
    <div
      data-testid="routine-builder"
      className={`${onComplete ? "min-h-0" : "min-h-screen"} bg-gray-50 flex flex-col`}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-2">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
                {error}
              </div>
            )}

            {/* Back Button for Edit Mode */}
            <BackButton isEditMode={isEditMode} onBack={onBack} />

            {/* Routine Details */}
            <RoutineDetailsCard
              routineName={routineName}
              onRoutineNameChange={setRoutineName}
              routine={routine}
              hasUnsavedChanges={hasUnsavedChanges}
              setHasUnsavedChanges={setHasUnsavedChanges}
              busy={busy}
              enhancedFamilyMembers={enhancedFamilyMembers}
              selectedMemberIds={selectedMemberIds}
              setSelectedMemberIds={setSelectedMemberIds}
              getMemberColors={getMemberColors}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />

            {/* Calendar Grid */}
            {isLoadingData ? (
              /* Loading Skeleton */
              <div className="grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <div
                    key={day}
                    className="border-r border-gray-200 last:border-r-0 min-h-[600px] flex flex-col"
                  >
                    {/* Day Header Skeleton */}
                    <div className="text-center p-3 bg-gray-100">
                      <div className="h-4 bg-gray-300 rounded w-20 mx-auto"></div>
                    </div>
                    <div className="border-b border-gray-200"></div>
                    {/* Task Placeholders */}
                    <div className="flex-1 p-3 space-y-2">
                      <div className="h-16 bg-gray-100 rounded"></div>
                      <div className="h-16 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              selectedMemberIds.length > 0 &&
              (shouldShowBuckets(selectedMemberIds, calendarTasks) ? (
                <PlannerWeek
                  weekData={transformCalendarTasksToWeekData(
                    calendarTasks,
                    selectedMemberIds,
                    familyMembers,
                  )}
                  selectedMemberIds={selectedMemberIds}
                  draggedTask={draggedTask}
                  dragOverPosition={dragOverPosition}
                  recurringTemplates={recurringTemplates}
                  familyMembers={familyMembers}
                  getMemberColors={getMemberColors}
                  onColumnClick={handleColumnClickWrapper}
                  onTaskDragStart={handleTaskDragStart}
                  onTaskDragEnd={handleTaskDragEnd}
                  onTaskDragOver={handleTaskDragOver}
                  onTaskDragLeave={handleTaskDragLeave}
                  onTaskDrop={handleTaskDrop}
                  onTaskClick={handleTaskClick}
                  onRemoveGroup={removeGroupFromCalendar}
                  getTasksWithDayOrder={getTasksWithDayOrder}
                  extractMemberIdFromId={extractMemberIdFromId}
                />
              ) : (
                <CalendarGrid
                  calendarTasks={calendarTasks}
                  selectedMemberIds={selectedMemberIds}
                  draggedTask={draggedTask}
                  dragOverPosition={dragOverPosition}
                  recurringTemplates={recurringTemplates}
                  familyMembers={familyMembers}
                  getMemberColors={getMemberColors}
                  onColumnClick={handleColumnClickWrapper}
                  onTaskDragStart={handleTaskDragStart}
                  onTaskDragEnd={handleTaskDragEnd}
                  onTaskDragOver={handleTaskDragOver}
                  onTaskDragLeave={handleTaskDragLeave}
                  onTaskDrop={handleTaskDrop}
                  onTaskClick={handleTaskClick}
                  onRemoveGroup={removeGroupFromCalendar}
                  getTasksWithDayOrder={getTasksWithDayOrder}
                  extractMemberIdFromId={extractMemberIdFromId}
                  getTotalTasksForDay={getTotalTasksForDay}
                />
              ))
            )}

            {/* Save Button */}
            <SaveButtonSection
              onSave={handleSaveRoutineWrapper}
              busy={busy}
              totalTasks={totalTasks}
              routineName={routineName}
              onComplete={onComplete}
            />
          </div>
        </div>

        {/* Create New Task Modal */}
        <TaskCreationModal
          isOpen={showApplyToPopup}
          onOpenChange={setShowApplyToPopup}
          editableTaskName={editableTaskName}
          onTaskNameChange={setEditableTaskName}
          daySelection={daySelection}
          onDaySelectionChange={setDaySelection}
          taskAssignmentMemberIds={taskAssignmentMemberIds}
          onTaskAssignmentMemberIdsChange={setTaskAssignmentMemberIds}
          familyMembers={familyMembers}
          selectedRoutineGroup={selectedRoutineGroup || "none"}
          onSelectedRoutineGroupChange={setSelectedRoutineGroup}
          routineGroups={routineGroups}
          pendingDrop={pendingDrop}
          selectedTaskForEdit={selectedTaskForEdit}
          isCreatingTasks={isCreatingTasks}
          onSave={handleApplyToSelection}
          onCreateNewGroup={() => setShowCreateGroupModal(true)}
        />

        {/* Task Mini Popup */}
        <TaskMiniPopup
          isOpen={showTaskMiniPopup}
          onClose={() => setShowTaskMiniPopup(false)}
          selectedTaskForEdit={selectedTaskForEdit}
          miniPopupPosition={miniPopupPosition}
          enhancedFamilyMembers={enhancedFamilyMembers}
          recurringTemplates={recurringTemplates}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteIndividualTask}
        />

        {/* Routine Details Modal */}
        <RoutineDetailsModal
          isOpen={showRoutineDetails}
          onClose={() => setShowRoutineDetails(false)}
          onSave={handleSaveRoutineDetailsWrapper}
          initialScheduleData={routineScheduleData || undefined}
          totalTasks={totalTasks}
          familyMembers={enhancedFamilyMembers.length}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteConfirmModal}
          onOpenChange={setShowDeleteConfirmModal}
          deleteScope={deleteScope}
          onDeleteScopeChange={setDeleteScope}
          onConfirm={() => handleRecurringTaskDeletion(deleteScope)}
        />

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import {
  ArrowLeft,
  Trash2,
  Save,
  GripVertical,
  User,
  Folder,
  Users,
  Baby,
  UserCheck,
  Check,
  Settings,
  Move,
  Plus,
  Loader2,
} from "lucide-react";
import {
  apiService,
  createRoutineDraft,
  patchRoutine,
  addRoutineGroup,
  addRoutineTask,
  deleteRoutineGroup,
  deleteRoutineTask,
  patchRoutineTask,
  updateOnboardingStep,
  getOnboardingRoutine,
  getRoutineGroups,
  getRoutineTasks,
  createTaskAssignment,
  getRoutineAssignments,
  createRoutineSchedule,
  generateTaskInstances,
  getRoutineSchedules,
  assignGroupTemplateToMembers,
  assignExistingGroupToMembers,
  getRoutineFullData,
  bulkUpdateDayOrders,
  bulkCreateIndividualTasks,
  bulkUpdateRecurringTasks,
  bulkDeleteTasks,
  getTaskForEdit,
  updateTaskTemplate,
  updateTemplateDays,
  createCloneTasks,
  deleteSeries,
} from "../../../lib/api";
import { useTaskOperations } from "../../../hooks/useTaskOperations";
import { generateAvatarUrl } from "../../ui/AvatarSelector";
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

// Day constants - Sunday moved to last position
const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Transform calendarTasks to weekData format for bucket system
const transformCalendarTasksToWeekData = (
  calendarTasks: Record<string, { groups: any[]; individualTasks: Task[] }>,
  selectedMemberIds: string[],
  familyMembers: Array<{
    id: string;
    name: string;
    role: string;
    avatar_url?: string | null;
    color: string;
  }>,
) => {
  console.log("[BUCKET-TRANSFORM] 🚀 Transforming calendarTasks to weekData:", {
    calendarTasksKeys: Object.keys(calendarTasks),
    selectedMemberIds,
    familyMembersCount: familyMembers.length,
  });

  const weekData = DAYS_OF_WEEK.map((day) => {
    const dayTasks = calendarTasks[day]?.individualTasks || [];
    console.log(`[BUCKET-TRANSFORM] 📅 Processing ${day}:`, {
      taskCount: dayTasks.length,
      tasks: dayTasks.map((t) => ({
        id: t.id,
        name: t.name,
        memberId: t.memberId,
        assignees: t.assignees?.length || 0,
      })),
    });

    // Group tasks by bucket type
    const sharedTasks: Task[] = [];
    const memberBuckets: Record<string, Task[]> = {};

    // Initialize member buckets for selected members
    selectedMemberIds.forEach((memberId) => {
      memberBuckets[memberId] = [];
    });

    // Deduplicate tasks by ID to prevent duplicate keys
    const seenTaskIds = new Set<string>();
    const uniqueTasks = dayTasks.filter((task) => {
      if (seenTaskIds.has(task.id)) {
        console.log(
          `[BUCKET-TRANSFORM] ⚠️ Duplicate task filtered out: ${task.id} - ${task.name}`,
        );
        return false;
      }
      seenTaskIds.add(task.id);
      return true;
    });

    console.log(
      `[BUCKET-TRANSFORM] 📊 After deduplication: ${uniqueTasks.length} unique tasks (was ${dayTasks.length})`,
    );

    // Categorize tasks into member buckets only
    uniqueTasks.forEach((task) => {
      // All tasks go to individual member buckets (no shared buckets)
      const assignedMembers =
        task.assignees?.map((a) => a.id) ||
        (task.memberId ? [task.memberId] : []);
      const assignedSelectedMembers = assignedMembers.filter((id: string) =>
        selectedMemberIds.includes(id),
      );

      console.log(`[BUCKET-TRANSFORM] 🎯 Task "${task.name}":`, {
        assignedMembers,
        assignedSelectedMembers,
        willGoToMember: assignedSelectedMembers.length === 1,
      });

      if (assignedSelectedMembers.length === 1) {
        // Single-member task goes to member's bucket
        const memberId = assignedSelectedMembers[0];
        memberBuckets[memberId].push(task);
      }
    });

    // Build buckets array - only member buckets
    const buckets: Array<{
      bucket_type: 'member';
      bucket_member_id: string;
      bucket_member_name: string;
      tasks: Task[];
    }> = [];

    // Always add member buckets for selected members (even if empty)
    // Use the order from selectedMemberIds to match the selector order
    selectedMemberIds.forEach((memberId) => {
      const member = familyMembers.find((m) => m.id === memberId);
      if (member) {
        buckets.push({
          bucket_type: "member" as const,
          bucket_member_id: member.id,
          bucket_member_name: member.name,
          tasks: memberBuckets[member.id] || [],
        });
      }
    });

    console.log(`[BUCKET-TRANSFORM] ✅ ${day} buckets:`, {
      bucketCount: buckets.length,
      buckets: buckets.map((b) => ({
        type: b.bucket_type,
        memberId: b.bucket_member_id,
        memberName: b.bucket_member_name,
        taskCount: b.tasks.length,
        taskIds: b.tasks.map((t) => t.id),
      })),
    });

    return {
      day_of_week: day,
      buckets,
    };
  });

  console.log("[BUCKET-TRANSFORM] 🎉 Final weekData:", weekData);
  return weekData;
};

// Helper function to determine if we should show buckets or simple calendar
const shouldShowBuckets = (
  selectedMemberIds: string[],
  calendarTasks: Record<string, { groups: any[]; individualTasks: Task[] }>,
) => {
  // Always show buckets if multiple members are selected
  if (selectedMemberIds.length > 1) {
    console.log(
      "[BUCKET-DECISION] 📊 Multiple members selected, showing buckets",
    );
    return true;
  }

  // If only one member selected, check for shared tasks affecting that member
  if (selectedMemberIds.length === 1) {
    const selectedMemberId = selectedMemberIds[0];

    // Check all days for tasks assigned to multiple members including the selected one
    const hasSharedTasks = DAYS_OF_WEEK.some((day) => {
      const dayTasks = calendarTasks[day]?.individualTasks || [];
      return dayTasks.some((task) => {
        const assignedMembers =
          task.assignees?.map((a) => a.id) ||
          (task.memberId ? [task.memberId] : []);
        const assignedSelectedMembers = assignedMembers.filter((id: string) =>
          selectedMemberIds.includes(id),
        );

        // Task is shared if it's assigned to multiple members and includes our selected member
        return assignedSelectedMembers.length > 0 && assignedMembers.length > 1;
      });
    });

    if (hasSharedTasks) {
      console.log(
        "[BUCKET-DECISION] 📊 Shared tasks found affecting selected member, showing buckets",
      );
      return true;
    } else {
      console.log(
        "[BUCKET-DECISION] 📊 No shared tasks, showing simple calendar",
      );
      return false;
    }
  }

  // No members selected - show simple calendar
  console.log(
    "[BUCKET-DECISION] 📊 No members selected, showing simple calendar",
  );
  return false;
};

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

  // Load all initial data (family members and existing routine)
  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      if (!familyId) {
        console.log(
          "[KIDOERS-ROUTINE] ⚠️ ManualRoutineBuilder: No familyId, redirecting to onboarding",
        );
        router.push("/onboarding"); // safety
        return;
      }

      // Prevent duplicate calls
      if (isLoadingData) {
        console.log(
          "[KIDOERS-ROUTINE] ⏸️ ManualRoutineBuilder: Already loading data, skipping duplicate call",
        );
        return;
      }

      console.log(
        "[KIDOERS-ROUTINE] 🚀 ManualRoutineBuilder: Starting loadAllData, familyId:",
        familyId,
        "isEditMode:",
        isEditMode,
      );
      setIsLoadingData(true);

      setBusy(true);
      setError(null);

      try {
        console.log(
          "[KIDOERS-ROUTINE] Starting to load all data for family:",
          familyId,
        );

        // Check current onboarding step and only update if needed (skip in edit mode)
        if (!isEditMode) {
          console.log(
            "[KIDOERS-ROUTINE] ManualRoutineBuilder: Checking current onboarding step...",
          );
          try {
            const onboardingStatus = await apiService.getOnboardingStatus();
            console.log(
              "[KIDOERS-ROUTINE] Current onboarding status:",
              onboardingStatus,
            );

            if (onboardingStatus.has_family && onboardingStatus.in_progress) {
              const currentStep = onboardingStatus.in_progress.setup_step;
              console.log("[KIDOERS-ROUTINE] Current step:", currentStep);

              if (currentStep !== "create_routine") {
                console.log(
                  "[KIDOERS-ROUTINE] Updating step from",
                  currentStep,
                  "to create_routine",
                );
                await updateOnboardingStep(familyId, "create_routine");
                console.log(
                  "[KIDOERS-ROUTINE] ManualRoutineBuilder: Onboarding step updated successfully",
                );
              } else {
                console.log(
                  "[KIDOERS-ROUTINE] Step already set to create_routine, skipping update",
                );
              }
            } else {
              console.log(
                "[KIDOERS-ROUTINE] No onboarding in progress, updating step to create_routine",
              );
              await updateOnboardingStep(familyId, "create_routine");
              console.log(
                "[KIDOERS-ROUTINE] ManualRoutineBuilder: Onboarding step updated successfully",
              );
            }
          } catch (error) {
            console.log(
              "[KIDOERS-ROUTINE] ManualRoutineBuilder: Error checking/updating step:",
              error,
            );
          }
        } else {
          console.log(
            "[KIDOERS-ROUTINE] ManualRoutineBuilder: In edit mode, skipping onboarding step update",
          );
        }

        // Load all data concurrently
        console.log(
          "[KIDOERS-ROUTINE] 🔄 ManualRoutineBuilder: Starting API call...",
        );

        // Load family members using the hook
        const enhanced = await loadFamilyMembers();

        // Try to load existing routine (onboarding routine first, then active routine)
        let existingRoutine = null;
        try {
          // First, try to load the onboarding routine (draft status with is_onboarding_routine = true)
          if (!isEditMode) {
            console.log(
              "[KIDOERS-ROUTINE] 📋 ManualRoutineBuilder: Loading onboarding routine for family...",
            );
            try {
              const onboardingRoutine = await getOnboardingRoutine(familyId);
              if (onboardingRoutine) {
                console.log(
                  "[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Onboarding routine found:",
                  onboardingRoutine,
                );
                existingRoutine = onboardingRoutine;
              }
            } catch (e: any) {
              console.log(
                "[KIDOERS-ROUTINE] No onboarding routine found (expected for new users):",
                e.message,
              );
            }
          }

          // If no onboarding routine found, try to load active routine
          if (!existingRoutine) {
            console.log(
              "[KIDOERS-ROUTINE] 📋 ManualRoutineBuilder: Loading existing routines for family...",
            );
            console.log(
              "[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling /routines?family_id=" +
                familyId,
            );
            const routines = await apiService.makeRequest<any[]>(
              `/routines?family_id=${familyId}`,
            );
            console.log(
              "[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Routines found:",
              routines?.length || 0,
              "routines",
            );

            // Find the active routine
            existingRoutine = routines.find((r) => r.status === "active");
          }

          if (existingRoutine) {
            console.log("[KIDOERS-ROUTINE] Routine found:", existingRoutine);
            setRoutine({
              id: existingRoutine.id,
              family_id: existingRoutine.family_id,
              name: existingRoutine.name,
              status: existingRoutine.status as "draft" | "active" | "archived",
            });
            setRoutineName(existingRoutine.name);

            // Mark as having no unsaved changes since we just loaded the routine
            setHasUnsavedChanges(false);
          } else {
            console.log(
              "[KIDOERS-ROUTINE] No existing routine found, will create new one when needed",
            );
          }
        } catch (e: any) {
          console.warn("[KIDOERS-ROUTINE] Error loading routines", {
            error: e,
          });
        }

        // Load existing routine data after enhanced family members are set
        if (existingRoutine && enhanced) {
          await loadExistingRoutineData(existingRoutine.id, enhanced);
        }

        console.log("[KIDOERS-ROUTINE] All data loaded successfully");
      } catch (e: any) {
        console.error("[KIDOERS-ROUTINE] ", "Error loading data:", e);
        setError(e?.message || "Failed to load data");
      } finally {
        if (isMounted) {
          setBusy(false);
          setIsLoadingData(false);
        }
      }
    };

    loadAllData();

    return () => {
      console.log(
        "[KIDOERS-ROUTINE] 🧹 ManualRoutineBuilder: useEffect cleanup - setting isMounted = false",
      );
      isMounted = false;
    };
  }, [familyId]); // Removed router dependency to prevent unnecessary re-runs

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

  // Handle column click to create new task (wrapper for both CalendarGrid and PlannerWeek)
  const handleColumnClickWrapper = async (
    day: string,
    bucketType?: string,
    bucketMemberId?: string,
  ) => {
    await handleColumnClick(day, bucketType, bucketMemberId);
  };

  // Handle series badge click - show popover with other tasks in the same series
  const handleSeriesBadgeClick = (seriesId: string, day: string) => {
    console.log('[KIDOERS-ROUTINE] 🏷️ Series badge clicked:', { seriesId, day });
    
    // Get all tasks in this series for this day
    const dayTasks = calendarTasks[day]?.individualTasks || [];
    const seriesTasks = dayTasks.filter(task => task.series_id === seriesId);
    
    console.log('[KIDOERS-ROUTINE] 🔍 Series tasks found:', seriesTasks);
    
    // TODO: Implement popover/modal to show other tasks in series
    // For now, just log the information
    alert(`Series ${seriesId} has ${seriesTasks.length} tasks on ${day}: ${seriesTasks.map(t => t.name).join(', ')}`);
  };

  // Handle edit all tasks in series
  const handleEditSeriesTasks = async () => {
    if (!selectedTaskForEdit?.task.series_id) {
      console.error('[KIDOERS-ROUTINE] ❌ No series_id found for task');
      return;
    }

    console.log('[KIDOERS-ROUTINE] 🔄 Editing series tasks:', selectedTaskForEdit.task.series_id);
    
    // Close mini popup
    setShowTaskMiniPopup(false);
    
    // TODO: Implement series edit modal
    // For now, show an alert with the series information
    const seriesId = selectedTaskForEdit.task.series_id;
    const allTasks = Object.values(calendarTasks)
      .flatMap(dayData => dayData.individualTasks)
      .filter(task => task.series_id === seriesId);
    
    alert(`Edit series "${selectedTaskForEdit.task.name}" (${seriesId}):\n${allTasks.length} tasks found:\n${allTasks.map(t => `- ${t.name} (${t.memberId})`).join('\n')}`);
  };

  // Handle delete all tasks in series
  const handleDeleteSeriesTasks = async () => {
    if (!selectedTaskForEdit?.task.series_id) {
      console.error('[KIDOERS-ROUTINE] ❌ No series_id found for task');
      return;
    }

    console.log('[KIDOERS-ROUTINE] 🗑️ Deleting series tasks:', selectedTaskForEdit.task.series_id);
    
    const seriesId = selectedTaskForEdit.task.series_id;
    const allTasks = Object.values(calendarTasks)
      .flatMap(dayData => dayData.individualTasks)
      .filter(task => task.series_id === seriesId);
    
    const confirmMessage = `Delete entire series "${selectedTaskForEdit.task.name}"?\n\nThis will delete ${allTasks.length} tasks:\n${allTasks.map(t => `- ${t.name} (${t.memberId})`).join('\n')}\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      try {
        // Close mini popup first
        setShowTaskMiniPopup(false);
        
        // Call the delete series API
        const response = await deleteSeries(seriesId, {
          series_id: seriesId,
          delete_scope: 'all_days'
        });
        
        console.log('[KIDOERS-ROUTINE] ✅ Series deleted:', response);
        
        // Refresh the calendar data
        const routineData = await ensureRoutineExists();
        if (routineData) {
          await loadExistingRoutineData(routineData.id, familyMembers);
        }
        
        // Show success message
        alert(`Successfully deleted series "${selectedTaskForEdit.task.name}" (${response.tasks_deleted} tasks)`);
        
      } catch (error) {
        console.error('[KIDOERS-ROUTINE] ❌ Error deleting series:', error);
        alert('Failed to delete series. Please try again.');
      }
    }
  };

  // Handle column click to create new task
  const handleColumnClick = async (
    day: string,
    bucketType?: string,
    bucketMemberId?: string,
  ) => {
    if (selectedMemberIds.length === 0) return;

    console.log(
      "[KIDOERS-ROUTINE] Column clicked for day:",
      day,
      "bucketType:",
      bucketType,
      "bucketMemberId:",
      bucketMemberId,
    );

    // Determine which member(s) to assign the task to based on the bucket clicked
    let targetMemberIds: string[] = [];
    let targetMemberName = "";

    if (bucketType === "member" && bucketMemberId) {
      // Clicked on a specific member's bucket - assign only to that member
      targetMemberIds = [bucketMemberId];
      targetMemberName = getMemberNameById(bucketMemberId);
      console.log(
        "[KIDOERS-ROUTINE] 🎯 Assigning to specific member:",
        targetMemberName,
      );
    } else if (bucketType === "shared") {
      // Clicked on shared bucket - assign to all currently selected members
      targetMemberIds = selectedMemberIds;
      targetMemberName = "All Selected Members";
      console.log(
        "[KIDOERS-ROUTINE] 🎯 Assigning to all selected members:",
        selectedMemberIds,
      );
    } else {
      // Clicked on day header or no bucket specified - use first selected member as fallback
      targetMemberIds = [selectedMemberIds[0]];
      targetMemberName = getMemberNameById(selectedMemberIds[0]);
      console.log(
        "[KIDOERS-ROUTINE] 🎯 Fallback: assigning to first selected member:",
        targetMemberName,
      );
    }

    // Create a new task with no title placeholder
    const newTask: Task = {
      id: `temp-${Date.now()}`,
      name: "(No title)",
      description: "",
      points: 5, // Default points
      estimatedMinutes: 30, // Default duration
      time_of_day: "morning", // Default time
      is_saved: false,
    };

    // Create pending drop object for the popup
    const pendingDropData: PendingDrop = {
      type: "task",
      item: newTask,
      targetMemberId: targetMemberIds[0], // Use first target member for compatibility
      targetMemberName: targetMemberName,
      targetDay: day,
    };

    // Set up the popup state
    setPendingDrop(pendingDropData);
    setEditableTaskName("(No title)");
    // Smart default: when creating from a day column, default to "Select specific days" with that day pre-checked
    setDaySelection({ mode: "custom", selectedDays: [day] });
    setSelectedWhoOption("none");
    setSelectedRoutineGroup("none");
    // Initialize task assignment with the target members based on bucket clicked
    setTaskAssignmentMemberIds(targetMemberIds);
    setShowApplyToPopup(true);

    console.log(
      "[KIDOERS-ROUTINE] Apply To Popup opened for new task creation",
    );
    console.log(
      "[KIDOERS-ROUTINE] 🎯 Pre-selected members for new task:",
      targetMemberIds,
    );
  };

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

  // Handle delete scope change (no real-time preview)
  const handleDeleteScopeChange = (
    newScope: "this_day" | "this_and_following" | "all_days",
  ) => {
    setDeleteScope(newScope);
  };
  const handleDeleteTask = async () => {
    if (!selectedTaskForEdit) return;

    console.log("[TASK-DELETE] Deleting task:", selectedTaskForEdit.task.name);

    // Check if this recurring task exists on multiple days with the SAME recurring_template_id
    const taskName = selectedTaskForEdit.task.name;
    const memberId = selectedTaskForEdit.memberId;
    const recurringTemplateId = selectedTaskForEdit.task.recurring_template_id;

    // Count how many days this recurring task appears on with the same template ID
    let taskAppearsOnDays = 0;
    Object.keys(calendarTasks).forEach((day) => {
      const dayTasks = calendarTasks[day].individualTasks || [];
      const hasTaskOnDay = dayTasks.some((task) => {
        // Match by name, member ID, AND recurring_template_id
        // This ensures we only count tasks that belong to the same recurring template
        const nameMatches = task.name === taskName;
        const memberMatches = task.memberId === memberId;
        const templateMatches =
          task.recurring_template_id === recurringTemplateId;

        return nameMatches && memberMatches && templateMatches;
      });
      if (hasTaskOnDay) {
        taskAppearsOnDays++;
      }
    });

    console.log(
      "[TASK-DELETE] Task appears on",
      taskAppearsOnDays,
      "days with same template",
    );
    console.log("[TASK-DELETE] Selected task:", selectedTaskForEdit.task);
    console.log("[TASK-DELETE] Task name:", taskName, "Member ID:", memberId);
    console.log("[TASK-DELETE] Recurring template ID:", recurringTemplateId);
    console.log("[TASK-DELETE] Should show modal?", taskAppearsOnDays > 1);

    // Debug: Check each day's tasks with same template
    Object.keys(calendarTasks).forEach((day) => {
      const dayTasks = calendarTasks[day].individualTasks || [];
      const matchingTasks = dayTasks.filter(
        (task) =>
          task.name === taskName &&
          task.memberId === memberId &&
          task.recurring_template_id === recurringTemplateId,
      );
      if (matchingTasks.length > 0) {
        console.log(
          `[TASK-DELETE] Day ${day} has ${matchingTasks.length} matching tasks with same template:`,
          matchingTasks.map((t) => ({
            id: t.id,
            name: t.name,
            memberId: t.memberId,
            templateId: t.recurring_template_id,
          })),
        );
      }
    });

    if (taskAppearsOnDays > 1) {
      // Show confirmation modal only for tasks that belong to the same recurring template
      console.log(
        "[TASK-DELETE] Showing delete modal - task belongs to recurring template with multiple days",
      );
      openDeleteConfirmModal();
      return;
    }

    // For single-day tasks or tasks without recurring template, delete immediately
    console.log(
      "[TASK-DELETE] Deleting immediately - single day or different templates",
    );
    await performTaskDeletion("this_day");
  };

  // Perform the actual task deletion
  const performTaskDeletion = async (
    scope: "this_day" | "this_and_following" | "all_days",
  ) => {
    if (!selectedTaskForEdit) return;

    // Set deleting flag to prevent any popup from opening
    setIsDeletingTask(true);

    // Store task info and original calendar state before clearing state
    const taskToDelete = selectedTaskForEdit;
    const originalCalendarTasks = JSON.parse(JSON.stringify(calendarTasks)); // Deep copy for undo

    // Close popups
    closeAllModals();
    setMiniPopupPosition(null);

    // Small delay to ensure popup is closed before removing task
    setTimeout(async () => {
      try {
        // Get routine ID for backend deletion
        const routineData = await ensureRoutineExists();
        if (!routineData) {
          setError("Failed to get routine information. Please try again.");
          return;
        }

        // Check if this is a recurring task
        console.log("[TASK-DELETE] 🔍 Task deletion debug:", {
          taskId: taskToDelete.task.id,
          taskName: taskToDelete.task.name,
          hasRecurringTemplateId: !!taskToDelete.task.recurring_template_id,
          recurringTemplateId: taskToDelete.task.recurring_template_id,
          hasTemplateId: !!taskToDelete.task.template_id,
          templateId: taskToDelete.task.template_id,
          isSystem: !!taskToDelete.task.is_system,
          routineId: routineData.id,
          scope: scope,
          targetDay: taskToDelete.day,
          memberId: taskToDelete.memberId,
          fullTaskObject: taskToDelete.task,
        });

        // Check if this is a recurring task by looking at the task data or by checking if it appears on multiple days
        const isRecurringTask =
          taskToDelete.task.recurring_template_id ||
          taskToDelete.task.template_id ||
          taskToDelete.task.is_system;

        // Additional check: if task appears on multiple days, it's likely recurring
        const taskAppearsOnMultipleDays =
          Object.keys(calendarTasks).filter((day) => {
            const dayTasks = calendarTasks[day].individualTasks || [];
            return dayTasks.some(
              (task) =>
                task.name === taskToDelete.task.name &&
                task.memberId === taskToDelete.memberId,
            );
          }).length > 1;

        const shouldUseBulkDelete =
          isRecurringTask || taskAppearsOnMultipleDays;

        console.log("[TASK-DELETE] 🔍 Recurring task detection:", {
          isRecurringTask,
          taskAppearsOnMultipleDays,
          shouldUseBulkDelete,
          recurringTemplateId: taskToDelete.task.recurring_template_id,
        });

        if (shouldUseBulkDelete) {
          // For recurring tasks, handle different scopes appropriately
          console.log(
            "[TASK-DELETE] 🗑️ Handling recurring task deletion:",
            taskToDelete.task.name,
          );

          if (scope === "this_day" && taskToDelete.task.recurring_template_id) {
            // For "this day only" on recurring tasks, delete just this occurrence using bulk delete
            console.log(
              "[TASK-DELETE] 🔄 Deleting this occurrence of recurring task",
            );

            const result = await bulkDeleteTasks(routineData.id, {
              recurring_template_id: taskToDelete.task.recurring_template_id,
              delete_scope: "this_day",
              target_day: taskToDelete.day,
              member_id: taskToDelete.memberId,
            });
            console.log("[TASK-DELETE] ✅ This occurrence deleted:", result);
          } else {
            // For "this and following" or "all days", use bulk delete
            console.log("[TASK-DELETE] 🔄 Using bulk delete for scope:", scope);

            // Check if this is a multi-member task (new system) or legacy bulk task (old system)
            const isMultiMemberTask =
              taskToDelete.task.routine_task_id &&
              (taskToDelete.task.member_count || 0) > 1;

            if (isMultiMemberTask) {
              // Use multi-member delete API for new multi-member tasks
              console.log("[TASK-DELETE] 🔄 Using multi-member delete API");

              const result = await bulkDeleteTasks(routineData.id, {
                task_template_id: taskToDelete.task.routine_task_id!,
                delete_scope: scope,
                target_day: taskToDelete.task.days_of_week?.[0],
                member_id: taskToDelete.task.memberId,
              });
              console.log(
                "[TASK-DELETE] ✅ Multi-member delete result:",
                result,
              );
            } else {
              // Use legacy bulk delete for old system tasks
              console.log("[TASK-DELETE] 🔄 Using legacy bulk delete API");

              // For recurring tasks, we need to use the recurring_template_id, not the individual task id
              let taskTemplateId =
                taskToDelete.task.recurring_template_id ||
                taskToDelete.task.template_id;

              // Fallback: if we don't have the recurring_template_id, try to get it from the backend data
              if (!taskTemplateId) {
                console.log(
                  "[TASK-DELETE] 🔍 No recurring_template_id found, looking up in backend data...",
                );
                // This should have been loaded in loadExistingRoutineData
                // For now, we'll use the routine_task_id as fallback
                taskTemplateId =
                  taskToDelete.task.routine_task_id || taskToDelete.task.id;
              }

              console.log(
                "[TASK-DELETE] 🔍 Using task_template_id:",
                taskTemplateId,
              );
              console.log("[TASK-DELETE] 🔍 Sending to backend:", {
                routine_id: routineData.id,
                task_template_id: taskTemplateId,
                delete_scope: scope,
                target_day: taskToDelete.day,
                member_id: taskToDelete.memberId,
              });

              const result = await bulkDeleteTasks(routineData.id, {
                recurring_template_id: taskTemplateId,
                delete_scope: scope,
                target_day: taskToDelete.day,
                member_id: taskToDelete.memberId,
              });
              console.log("[TASK-DELETE] ✅ Bulk delete result:", result);

              // Log cleanup results
              if (
                result.cleaned_templates &&
                result.cleaned_templates.length > 0
              ) {
                console.log(
                  "[TASK-DELETE] 🧹 Cleaned up orphaned templates:",
                  result.cleaned_templates,
                );
              }
            }
          }
        } else {
          // Use regular delete for custom tasks
          console.log(
            "[TASK-DELETE] 🗑️ Deleting custom task from backend:",
            taskToDelete.task.routine_task_id || taskToDelete.task.id,
          );
          await deleteRoutineTask(
            routineData.id,
            taskToDelete.task.routine_task_id || taskToDelete.task.id,
          );
          console.log(
            "[TASK-DELETE] ✅ Task deleted from backend successfully",
          );
        }

        // Remove from calendar state based on scope
        setCalendarTasks((prev) => {
          const newCalendarTasks = { ...prev };

          if (scope === "this_day") {
            // Remove only from the current day
            // For recurring tasks, filter by recurring_template_id; for custom tasks, filter by id
            const recurringTaskId =
              taskToDelete.task.recurring_template_id ||
              taskToDelete.task.template_id ||
              taskToDelete.task.id;

            newCalendarTasks[taskToDelete.day] = {
              ...newCalendarTasks[taskToDelete.day],
              individualTasks: newCalendarTasks[
                taskToDelete.day
              ].individualTasks.filter((t) => {
                if (
                  taskToDelete.task.recurring_template_id ||
                  taskToDelete.task.template_id ||
                  taskToDelete.task.is_system
                ) {
                  // For recurring tasks, filter by recurring_template_id
                  return (
                    t.recurring_template_id !== recurringTaskId &&
                    t.template_id !== recurringTaskId &&
                    t.id !== recurringTaskId
                  );
                } else {
                  // For custom tasks, filter by exact id
                  return t.id !== taskToDelete.task.id;
                }
              }),
            };
          } else if (scope === "this_and_following") {
            // Remove from current day and all following days
            const dayOrder = [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ];
            const currentDayIndex = dayOrder.indexOf(taskToDelete.day);
            const followingDays = dayOrder.slice(currentDayIndex);

            // For recurring tasks, filter by recurring_template_id; for custom tasks, filter by id
            const recurringTaskId =
              taskToDelete.task.recurring_template_id ||
              taskToDelete.task.template_id ||
              taskToDelete.task.id;

            console.log(
              "[TASK-DELETE] 🎯 Frontend: Deleting from following days:",
              followingDays,
            );
            console.log(
              "[TASK-DELETE] 🎯 Frontend: Recurring task ID:",
              recurringTaskId,
            );
            console.log(
              "[TASK-DELETE] 🎯 Frontend: Task to delete:",
              taskToDelete.task,
            );

            followingDays.forEach((day) => {
              if (newCalendarTasks[day]) {
                const beforeCount =
                  newCalendarTasks[day].individualTasks.length;
                const isRecurring =
                  taskToDelete.task.recurring_template_id ||
                  taskToDelete.task.template_id ||
                  taskToDelete.task.is_system;

                newCalendarTasks[day] = {
                  ...newCalendarTasks[day],
                  individualTasks: newCalendarTasks[day].individualTasks.filter(
                    (t) => {
                      if (isRecurring) {
                        // For recurring tasks, filter by recurring_template_id
                        const shouldKeep =
                          t.recurring_template_id !== recurringTaskId &&
                          t.template_id !== recurringTaskId &&
                          t.id !== recurringTaskId;
                        if (!shouldKeep) {
                          console.log(
                            `[TASK-DELETE] 🗑️ Frontend: Removing recurring task from ${day}:`,
                            t.name,
                            t.id,
                          );
                        }
                        return shouldKeep;
                      } else {
                        // For custom tasks, filter by exact id
                        return t.id !== taskToDelete.task.id;
                      }
                    },
                  ),
                };

                const afterCount = newCalendarTasks[day].individualTasks.length;
                console.log(
                  `[TASK-DELETE] 📊 Frontend: Day ${day}: ${beforeCount} → ${afterCount} tasks`,
                );
              }
            });
          } else if (scope === "all_days") {
            // Remove from all days
            // For recurring tasks, filter by recurring_template_id; for custom tasks, filter by id
            const recurringTaskId =
              taskToDelete.task.recurring_template_id ||
              taskToDelete.task.template_id ||
              taskToDelete.task.id;

            Object.keys(newCalendarTasks).forEach((day) => {
              newCalendarTasks[day] = {
                ...newCalendarTasks[day],
                individualTasks: newCalendarTasks[day].individualTasks.filter(
                  (t) => {
                    if (
                      taskToDelete.task.recurring_template_id ||
                      taskToDelete.task.template_id ||
                      taskToDelete.task.is_system
                    ) {
                      // For recurring tasks, filter by recurring_template_id
                      return (
                        t.recurring_template_id !== recurringTaskId &&
                        t.template_id !== recurringTaskId &&
                        t.id !== recurringTaskId
                      );
                    } else {
                      // For custom tasks, filter by exact id
                      return t.id !== taskToDelete.task.id;
                    }
                  },
                ),
              };
            });
          }

          return newCalendarTasks;
        });

        console.log("[TASK-DELETE] ✅ Task deleted from UI successfully");

        // Show undo toast
        const operationId = `delete-${taskToDelete.task.id}-${Date.now()}`;

        // Store task data needed for undo (before it's removed from state)
        const taskDataForUndo = {
          name: taskToDelete.task.name,
          description: taskToDelete.task.description || undefined,
          points: taskToDelete.task.points,
          duration_mins: taskToDelete.task.estimatedMinutes,
          time_of_day: taskToDelete.task.time_of_day || undefined,
          frequency: (taskToDelete.task.frequency || "specific_days") as
            | "one_off"
            | "daily"
            | "specific_days"
            | "weekly",
          days_of_week: taskToDelete.task.days_of_week || [taskToDelete.day],
          member_ids: taskToDelete.task.assignees?.map((a) => a.id) || [
            taskToDelete.memberId,
          ],
        };

        const undoFunction = async () => {
          try {
            console.log(
              "[TASK-UNDO] 🔄 Restoring task in backend...",
              taskDataForUndo,
            );

            // Recreate the task in the backend using bulk individual tasks
            if (currentRoutineId && enhancedFamilyMembers.length > 0) {
              const bulkPayload = {
                task_template: {
                  name: taskDataForUndo.name,
                  description: taskDataForUndo.description,
                  points: taskDataForUndo.points,
                  duration_mins: taskDataForUndo.duration_mins,
                  time_of_day: taskDataForUndo.time_of_day,
                  is_system: false,
                },
                assignments: taskDataForUndo.member_ids.map((memberId) => ({
                  member_id: memberId,
                  days_of_week: taskDataForUndo.days_of_week || [],
                  order_index: 0,
                })),
                new_days_of_week: taskDataForUndo.days_of_week || [],
              };
              await bulkCreateIndividualTasks(currentRoutineId, bulkPayload);
              console.log("[TASK-UNDO] ✅ Task recreated in backend");

              // Reload the entire routine data - this will rebuild calendar correctly
              await loadExistingRoutineData(
                currentRoutineId,
                enhancedFamilyMembers,
              );

              console.log("[TASK-UNDO] ✅ Task fully restored (UI + Backend)");
            } else {
              // Fallback: just restore UI state if no routine ID
              setCalendarTasks(originalCalendarTasks);
              console.log("[TASK-UNDO] ⚠️ Restored UI only (no routine ID)");
            }
          } catch (error) {
            console.error("[TASK-UNDO] ❌ Error undoing task deletion:", error);
            throw error;
          }
        };

        // Refresh recurring templates to get updated data from backend
        if (currentRoutineId) {
          console.log(
            "[TASK-DELETE] 🔄 Refreshing recurring templates after deletion...",
          );
          try {
            const fullData = await getRoutineFullData(currentRoutineId);
            // Force a new array reference to ensure React re-renders
            setRecurringTemplates([...(fullData.recurring_templates || [])]);
            console.log(
              "[TASK-DELETE] ✅ Updated recurring templates:",
              fullData.recurring_templates,
            );

            // Force a re-render of calendar tasks to ensure task cards update
            setCalendarTasks((prev) => ({ ...prev }));
          } catch (error) {
            console.warn(
              "[TASK-DELETE] ⚠️ Failed to refresh recurring templates:",
              error,
            );
          }
        }

        const message =
          scope === "this_day"
            ? "Task deleted"
            : scope === "this_and_following"
              ? "Task deleted from this day onwards"
              : "All task instances deleted";

        showUndoToast(
          {
            id: operationId,
            type: "delete",
            taskData: taskToDelete,
            originalCalendarTasks,
            undoFunction,
          },
          message,
        );
      } catch (error) {
        console.error("[TASK-DELETE] ❌ Error deleting task:", error);
        setError("Failed to delete task. Please try again.");
      } finally {
        // Reset deleting flag after a longer delay
        setTimeout(() => {
          setIsDeletingTask(false);
        }, 500);
      }
    }, 100); // Small delay to ensure popup is closed
  };

  const handleApplyToSelection = async (applyToId?: string) => {
    const selectedApplyToId = applyToId || selectedWhoOption;
    console.log(
      "[KIDOERS-ROUTINE] 🚀 handleApplyToSelection called with applyToId:",
      selectedApplyToId,
    );

    if (!pendingDrop) {
      console.log("[DRAG-ORDER] ❌ No pending drop found");
      return;
    }

    // Store original calendar state for undo functionality
    const originalCalendarTasks = JSON.parse(JSON.stringify(calendarTasks));

    setIsCreatingTasks(true);

    try {
      console.log("[KIDOERS-ROUTINE] 📋 Applying task/group:", {
        type: pendingDrop.type,
        item: pendingDrop.item,
        targetMemberId: pendingDrop.targetMemberId,
        applyToId: selectedApplyToId,
        daySelection,
      });

      // Determine which days to add the task to based on day selection
      let targetDays: string[] = [];

      if (daySelection.mode === "everyday") {
        targetDays = DAYS_OF_WEEK;
      } else if (daySelection.mode === "custom") {
        targetDays = daySelection.selectedDays;
      }

      console.log("[KIDOERS-ROUTINE] Target days:", targetDays);

      // Check if we're editing an existing recurring task
      const isEditingRecurringTask =
        selectedTaskForEdit &&
        selectedTaskForEdit.task.recurring_template_id &&
        pendingDrop.type === "task" &&
        pendingDrop.item.id === selectedTaskForEdit.task.id;

      console.log("[KIDOERS-ROUTINE] 🔍 Edit mode check:", {
        isEditingRecurringTask,
        hasSelectedTaskForEdit: !!selectedTaskForEdit,
        hasRecurringTemplateId: selectedTaskForEdit?.task.recurring_template_id,
        pendingDropType: pendingDrop.type,
        taskIdsMatch: selectedTaskForEdit?.task.id === pendingDrop.item.id,
      });

      // Use selected member IDs from the multi-member selector
      let targetMemberIds: string[] =
        taskAssignmentMemberIds.length > 0
          ? taskAssignmentMemberIds
          : [pendingDrop.targetMemberId];

      console.log("[KIDOERS-ROUTINE] 🔍 Assignment Debug Info:");
      console.log(
        "[KIDOERS-ROUTINE] - taskAssignmentMemberIds:",
        taskAssignmentMemberIds,
      );
      console.log("[KIDOERS-ROUTINE] - targetMemberIds:", targetMemberIds);
      console.log(
        "[KIDOERS-ROUTINE] - pendingDrop.targetMemberId:",
        pendingDrop.targetMemberId,
      );

      // Handle task creation with bulk API for better performance
      if (pendingDrop.type === "task") {
        // Ensure routine exists first
        const routineData = await ensureRoutineExists();
        if (!routineData) {
          setError("Failed to create routine. Please try again.");
          return;
        }

        // Check if we're editing an existing recurring task
        if (isEditingRecurringTask && selectedTaskForEdit) {
          console.log(
            "[KIDOERS-ROUTINE] 🔄 Updating existing recurring task with template-based approach",
          );

          const task = pendingDrop.item as Task;

          // Validate day selection
          const validationError = validateRecurrenceSelection(
            daySelection.mode === "everyday" ? "EVERY_DAY" : "SPECIFIC_DAYS",
            normalizeWeekdays(targetDays),
          );

          if (validationError) {
            setError(validationError);
            return;
          }

          // Update template data using new API
          // The backend will automatically determine frequency_type based on days_of_week
          const templateUpdatePayload = {
            name: editableTaskName || task.name,
            description: task.description || undefined,
            points: task.points,
            duration_mins: task.estimatedMinutes,
            time_of_day: task.time_of_day || undefined,
            days_of_week: normalizeWeekdays(targetDays),
          };

          console.log(
            "[KIDOERS-ROUTINE] 📦 Template update payload:",
            templateUpdatePayload,
          );

          // Call the new template update API - extract actual task ID if it contains day suffix
          const actualTaskId = extractTaskId(selectedTaskForEdit.task.id);
          const result = (await updateTaskTemplate(
            routineData.id,
            actualTaskId,
            templateUpdatePayload,
          )) as any;
          console.log("[KIDOERS-ROUTINE] ✅ Template update result:", result);

          // Refresh recurring templates to get updated data
          console.log(
            "[KIDOERS-ROUTINE] 🔄 Refreshing recurring templates after update...",
          );
          try {
            const fullData = await getRoutineFullData(routineData.id);
            setRecurringTemplates([...(fullData.recurring_templates || [])]);
            console.log(
              "[KIDOERS-ROUTINE] ✅ Updated recurring templates:",
              fullData.recurring_templates,
            );
          } catch (error) {
            console.warn(
              "[KIDOERS-ROUTINE] ⚠️ Failed to refresh recurring templates:",
              error,
            );
          }

          // Reload calendar tasks from backend to get updated task names
          console.log(
            "[KIDOERS-ROUTINE] 🔄 Reloading calendar tasks from backend...",
          );
          try {
            await loadExistingRoutineData(routineData.id, familyMembers);
            console.log(
              "[KIDOERS-ROUTINE] ✅ Calendar tasks reloaded with updated names",
            );
          } catch (error) {
            console.warn(
              "[KIDOERS-ROUTINE] ⚠️ Failed to reload calendar tasks:",
              error,
            );
          }

          // Close modal and reset state
          setShowApplyToPopup(false);
          setPendingDrop(null);
          setDaySelection({ mode: "everyday", selectedDays: [] });
          setSelectedWhoOption("none");
          setEditableTaskName("");
          setSelectedTaskForEdit(null);

          return; // Exit early for recurring task updates
        }

        // Check if we're editing an existing multi-member task
        // Also check if it's a multi-member task by member_count and assignees
        const isMultiMemberTask =
          selectedTaskForEdit &&
          (selectedTaskForEdit.task.routine_task_id ||
            (selectedTaskForEdit.task.member_count &&
              selectedTaskForEdit.task.member_count > 1) ||
            (selectedTaskForEdit.task.assignees &&
              selectedTaskForEdit.task.assignees.length > 1));

        console.log(
          "[KIDOERS-ROUTINE] 🔍 DEBUG: Checking if editing existing multi-member task:",
          {
            hasSelectedTaskForEdit: !!selectedTaskForEdit,
            taskRoutineTaskId: selectedTaskForEdit?.task.routine_task_id,
            taskMemberCount: selectedTaskForEdit?.task.member_count,
            taskAssignees: selectedTaskForEdit?.task.assignees?.length,
            isMultiMemberTask: isMultiMemberTask,
            fullTask: selectedTaskForEdit?.task,
          },
        );

        if (isMultiMemberTask) {
          const taskId =
            selectedTaskForEdit.task.routine_task_id ||
            selectedTaskForEdit.task.id;
          console.log(
            "[KIDOERS-ROUTINE] 🔄 Updating existing multi-member task:",
            taskId,
          );

          // Update the existing task with new assignees
          const task = pendingDrop.item as Task;

          // Update the existing task instead of deleting and recreating
          const updatePayload = {
            recurring_template_id: selectedTaskForEdit.task.recurring_template_id || taskId,
            task_template: {
              name: editableTaskName || task.name,
              description: task.description || undefined,
              points: task.points,
              duration_mins: task.estimatedMinutes,
              time_of_day: task.time_of_day || undefined,
            },
            assignments: targetMemberIds.map(memberId => ({
              member_id: memberId,
              days_of_week: targetDays,
              order_index: 0,
            })),
            new_days_of_week: targetDays,
          };

          console.log(
            "[KIDOERS-ROUTINE] 📦 Bulk update payload:",
            updatePayload,
          );
          const result = await bulkUpdateRecurringTasks(
            routineData.id,
            updatePayload,
          );
          console.log("[KIDOERS-ROUTINE] ✅ Bulk task update result:", result);

          // Update UI by modifying the existing task
          const newCalendarTasks = { ...calendarTasks };

          // Find and update the existing task in the UI
          Object.keys(newCalendarTasks).forEach((day) => {
            const taskIndex = newCalendarTasks[day].individualTasks.findIndex(
              (t) => t.routine_task_id === taskId || t.id === taskId,
            );

            if (taskIndex >= 0) {
              // Update the existing task with new assignee information
              const updatedTask = {
                ...newCalendarTasks[day].individualTasks[taskIndex],
                name: editableTaskName || task.name,
                description: task.description || null,
                points: task.points,
                duration_mins: task.estimatedMinutes,
                time_of_day: task.time_of_day || undefined,
                member_count: targetMemberIds.length,
                assignees: targetMemberIds.map((memberId) => {
                  const member = enhancedFamilyMembers.find(
                    (m) => m.id === memberId,
                  );
                  return {
                    id: member!.id,
                    name: member!.name,
                    role: member!.type || "member",
                    avatar_url: member!.avatar_url,
                    color: member!.color,
                  };
                }),
              };

              newCalendarTasks[day].individualTasks[taskIndex] = updatedTask;
              console.log(
                `[KIDOERS-ROUTINE] 🔄 Updated existing task in ${day}:`,
                updatedTask.name,
                "routine_task_id:",
                updatedTask.routine_task_id,
                "member_count:",
                updatedTask.member_count,
              );
            }
          });

          setCalendarTasks(newCalendarTasks);

          // Show undo toast for task update
          const operationId = `update-${taskId}-${Date.now()}`;
          const undoFunction = async () => {
            try {
              // Restore the original calendar state
              setCalendarTasks(originalCalendarTasks);
              console.log("[TASK-UNDO] ✅ Task update reverted in UI");
            } catch (error) {
              console.error("[TASK-UNDO] ❌ Error undoing task update:", error);
              throw error;
            }
          };

          showUndoToast(
            {
              id: operationId,
              type: "update",
              taskData: {
                taskId,
                originalTask: task,
                updatedTask: {
                  name: editableTaskName || task.name,
                  memberIds: targetMemberIds,
                },
              },
              originalCalendarTasks,
              undoFunction,
            },
            "Task updated",
          );

          // Close modal and reset state
          setShowApplyToPopup(false);
          setPendingDrop(null);
          setDaySelection({ mode: "everyday", selectedDays: [] });
          setSelectedWhoOption("none");
          setEditableTaskName("");
          setSelectedTaskForEdit(null);

          return; // Exit early for multi-member task updates
        }

        console.log(
          "[KIDOERS-ROUTINE] 🚀 Using multi-member API for task creation (condition failed)",
        );
        console.log("[KIDOERS-ROUTINE] 🔍 DEBUG: Why condition failed:", {
          selectedTaskForEdit: !!selectedTaskForEdit,
          routineTaskId: selectedTaskForEdit?.task.routine_task_id,
          condition:
            selectedTaskForEdit && selectedTaskForEdit.task.routine_task_id,
        });

        // Prepare multi-member task creation payload
        const task = pendingDrop.item as Task;

        // Determine frequency and date based on day selection
        let frequency: "one_off" | "daily" | "specific_days" | "weekly" =
          "one_off";
        let date: string | undefined = undefined;
        let days_of_week: string[] | undefined = undefined;

        if (daySelection.mode === "everyday") {
          frequency = "daily";
          days_of_week = DAYS_OF_WEEK;
        } else if (daySelection.mode === "custom") {
          // Custom day selection: 1-6 days
          // (Includes single-day recurring tasks, treated as specific_days not one_off)
          frequency = "specific_days";
          days_of_week = targetDays;
        }

        // Use clone tasks API for multi-member tasks or bulk individual for single member
        if (targetMemberIds.length > 1) {
          // Use clone tasks API for multiple members
          const clonePayload = {
            routine_id: routineData.id,
            name: editableTaskName || task.name,
            description: task.description || undefined,
            points: task.points,
            duration_mins: task.estimatedMinutes,
            time_of_day: task.time_of_day || "any",
            days_of_week: days_of_week || [],
            members: targetMemberIds,
            group_id: undefined,
          };

          console.log(
            "[KIDOERS-ROUTINE] 📦 Using clone tasks API with payload:",
            clonePayload,
          );
          const result = await createCloneTasks(clonePayload);
          console.log(
            "[KIDOERS-ROUTINE] ✅ Clone tasks creation result:",
            result,
          );

          // Update UI with cloned tasks
          const newCalendarTasks = { ...calendarTasks };

          // Process clone tasks response
          console.log(
            "[KIDOERS-ROUTINE] 🔄 Processing clone tasks response:",
            result.tasks,
          );

          // Group tasks by day for UI display
          const tasksByDay: Record<string, any[]> = {};

          for (const createdTask of result.tasks) {
            const taskDays = createdTask.template.days_of_week || [];

            for (const day of taskDays) {
              if (!tasksByDay[day]) {
                tasksByDay[day] = [];
              }

              const taskForUI = {
                id: `${createdTask.task.id}_${day}`,
                routine_task_id: createdTask.task.id,
                memberId: createdTask.task.member_id,
                name: editableTaskName || task.name,
                description: task.description,
                points: task.points,
                duration_mins: task.estimatedMinutes,
                time_of_day: task.time_of_day || "any",
                frequency: frequency,
                days_of_week: [day],
                is_saved: true,
                template_id: task.is_system ? task.id : undefined,
                recurring_template_id: createdTask.task.recurring_template_id,
                from_group: undefined,
                estimatedMinutes: task.estimatedMinutes || 5,
                member_count: 1, // Each clone is for one member
                assignees: [
                  {
                    id: createdTask.task.member_id,
                    name: createdTask.member_name,
                    role: "member",
                  },
                ],
                series_id: createdTask.task.series_id, // Add series_id for clone tasks
              };

              tasksByDay[day].push(taskForUI);
            }
          }

          // Add tasks to calendar
          for (const [day, dayTasks] of Object.entries(tasksByDay)) {
            if (newCalendarTasks[day]) {
              newCalendarTasks[day].individualTasks.push(...dayTasks);
            }
          }

          setCalendarTasks(newCalendarTasks);

          // Show success message
          console.log(
            "[KIDOERS-ROUTINE] ✅ Clone tasks created successfully:",
            result.message,
          );

        } else {
          // Use bulk individual tasks API for single member
          const bulkPayload = {
            task_template: {
              name: editableTaskName || task.name,
              description: task.description || undefined,
              points: task.points,
              duration_mins: task.estimatedMinutes,
              time_of_day: task.time_of_day || undefined,
              is_system: task.is_system || false,
            },
            assignments: targetMemberIds.map((memberId) => ({
              member_id: memberId,
              days_of_week: days_of_week || [],
              order_index: 0,
            })),
            new_days_of_week: days_of_week || [],
          };

          console.log(
            "[KIDOERS-ROUTINE] 📦 Using bulk individual tasks API with payload:",
            bulkPayload,
          );
          const result = await bulkCreateIndividualTasks(
            routineData.id,
            bulkPayload,
          );
          console.log(
            "[KIDOERS-ROUTINE] ✅ Bulk individual tasks creation result:",
            result,
          );

        // Update UI with created tasks and instances
        const newCalendarTasks = { ...calendarTasks };

        // Handle bulk individual tasks API response (creates one row per day)
        console.log(
          "[KIDOERS-ROUTINE] 🔄 Processing bulk individual tasks response:",
          result.created_tasks,
        );

        // Group tasks by day for UI display
        const tasksByDay: Record<string, any[]> = {};

        for (const createdTask of result.created_tasks) {
          const taskDays = createdTask.days_of_week || [];

          for (const day of taskDays) {
            if (!tasksByDay[day]) {
              tasksByDay[day] = [];
            }

            const taskForUI = {
              id: `${createdTask.id}_${day}`,
              routine_task_id: createdTask.id,
              memberId: targetMemberIds[0], // Single member for bulk individual tasks
              name: createdTask.name,
              description: createdTask.description,
              points: createdTask.points,
              duration_mins: createdTask.duration_mins,
              time_of_day: createdTask.time_of_day,
              frequency: frequency,
              days_of_week: [day], // Each task row has only one day
              is_saved: true,
              template_id: task.is_system ? task.id : undefined,
              recurring_template_id: (createdTask as any).recurring_template_id || undefined,
              from_group: undefined,
              estimatedMinutes: task.estimatedMinutes || 5,
              member_count: 1, // Single member
              assignees: [
                {
                  id: targetMemberIds[0],
                  name:
                    familyMembers.find((m) => m.id === targetMemberIds[0])
                      ?.name || "Unknown",
                  role:
                    familyMembers.find((m) => m.id === targetMemberIds[0])
                      ?.role || "child",
                  avatar_url:
                    familyMembers.find((m) => m.id === targetMemberIds[0])
                      ?.avatar_url || null,
                  color:
                    familyMembers.find((m) => m.id === targetMemberIds[0])
                      ?.color || "#000000",
                },
              ],
            };

            tasksByDay[day].push(taskForUI);
          }
        }

        // Add tasks to calendar UI
        for (const [day, dayTasks] of Object.entries(tasksByDay)) {
          if (!newCalendarTasks[day]) {
            newCalendarTasks[day] = { individualTasks: [], groups: [] };
          }

          for (const taskForUI of dayTasks) {
            const existingTaskIndex = newCalendarTasks[
              day
            ].individualTasks.findIndex(
              (existingTask) =>
                existingTask.routine_task_id === taskForUI.routine_task_id,
            );

            if (existingTaskIndex >= 0) {
              newCalendarTasks[day].individualTasks[existingTaskIndex] =
                taskForUI;
              console.log(
                `[KIDOERS-ROUTINE] 🔄 Updated individual task in UI: ${taskForUI.name} for ${day}`,
              );
            } else {
              newCalendarTasks[day].individualTasks.push(taskForUI);
              console.log(
                `[KIDOERS-ROUTINE] ➕ Added individual task to UI: ${taskForUI.name} for ${day}`,
              );
            }
          }
        }

        setCalendarTasks(newCalendarTasks);
        console.log("[KIDOERS-ROUTINE] ✅ UI updated with bulk created tasks");

        // Refresh routine data from server to ensure consistency
        if (routineData.id) {
          console.log(
            "[KIDOERS-ROUTINE] 🔄 Refreshing routine data from server...",
          );
          try {
            const refreshedData = await getRoutineFullData(routineData.id);
            console.log(
              "[KIDOERS-ROUTINE] ✅ Server data refreshed:",
              refreshedData,
            );

            // Update recurring templates with fresh data
            setRecurringTemplates(refreshedData.recurring_templates || []);

            // You could also refresh the calendar tasks from server data here if needed
            // But for now, the local state update should be sufficient
          } catch (error) {
            console.warn(
              "[KIDOERS-ROUTINE] ⚠️ Failed to refresh server data:",
              error,
            );
          }
        }
        } // end: else (bulk individual tasks)
      } else if (pendingDrop.type === "group") {
        // Helper function to reduce nesting complexity
        const applyGroupToDaysAndMembers = (
          group: TaskGroup,
          days: string[],
          memberIds: string[],
          selectedApplyToIdLocal: string,
        ) => {
          for (const d of days) {
            for (const mId of memberIds) {
              // keep log simple to avoid template/comma confusion
              console.log("[KIDOERS-ROUTINE] Adding group", {
                day: d,
                memberId: mId,
              });
              addGroupToCalendar(
                mId,
                group,
                selectedApplyToIdLocal,
                d,
                pendingDrop.selectedTasks,
              );
            }
          }
        };

        // Handle group creation
        applyGroupToDaysAndMembers(
          pendingDrop.item as TaskGroup,
          targetDays,
          targetMemberIds,
          selectedApplyToId,
        );
      } // end: pendingDrop.type === "group"

      // Close popup and reset
      setShowApplyToPopup(false);
      setPendingDrop(null);
      setDaySelection({ mode: "everyday", selectedDays: [] });
      setSelectedWhoOption("none");
      setEditableTaskName("");
    } catch (error) {
      console.error(
        "[KIDOERS-ROUTINE] ❌ Error in handleApplyToSelection:",
        error,
      );
      setError("Failed to create tasks. Please try again.");
    } finally {
      setIsCreatingTasks(false);
    }
  };

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

  // Load existing routine data using the new full-data endpoint
  const loadExistingRoutineData = async (
    routineId: string,
    enhancedMembers: any[],
  ) => {
    setCurrentRoutineId(routineId);
    try {
      // Load complete routine data
      console.log(
        "[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling getRoutineFullData()",
      );
      const fullData = await getRoutineFullData(routineId);
      console.log(
        "[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: Full routine data loaded:",
        fullData,
      );

      // Load recurring templates
      console.log(
        "[KIDOERS-ROUTINE] 📋 Loading recurring templates:",
        fullData.recurring_templates,
      );
      setRecurringTemplates(fullData.recurring_templates || []);

      // Debug: Log individual tasks data
      console.log(
        "[KIDOERS-ROUTINE] 🔍 Individual tasks from backend:",
        fullData.individual_tasks.map((task) => ({
          id: task.id,
          name: task.name,
          days_of_week: task.days_of_week,
          recurring_template_id: task.recurring_template_id,
        })),
      );

      // Debug: Check if recurring_template_id matches database
      console.log(
        "[KIDOERS-ROUTINE] 🔍 DEBUG: Expected recurring_template_id from database: 93c6f050-b2e5-459f-b203-ead4d9303668",
      );
      console.log(
        "[KIDOERS-ROUTINE] 🔍 DEBUG: Actual recurring_template_ids from backend:",
        fullData.individual_tasks.map((t) => t.recurring_template_id),
      );

      // Debug: Log the specific task we're looking for
      const targetTask = fullData.individual_tasks.find(
        (task) => task.name === "recurrent",
      );
      if (targetTask) {
        console.log("[KIDOERS-ROUTINE] 🎯 Target task from backend:", {
          id: targetTask.id,
          name: targetTask.name,
          recurring_template_id: targetTask.recurring_template_id,
          days_of_week: targetTask.days_of_week,
        });
      }

      // Transform backend data to frontend format
      const transformedGroups: TaskGroup[] = fullData.groups.map((group) => ({
        id: group.id,
        name: group.name,
        description: "",
        tasks: group.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          description: task.description || "",
          points: task.points,
          estimatedMinutes: task.duration_mins || 5,
          time_of_day: task.time_of_day as
            | "morning"
            | "afternoon"
            | "evening"
            | "night"
            | undefined,
          is_saved: true,
          template_id: undefined,
          recurring_template_id: task.recurring_template_id || undefined,
          days_of_week: task.days_of_week,
        })),
        color: "bg-blue-100 border-blue-300",
        time_of_day: group.time_of_day as
          | "morning"
          | "afternoon"
          | "evening"
          | "night"
          | undefined,
        is_saved: true,
        template_id: undefined,
      }));

      // Set routine groups for the modal
      setRoutineGroups(transformedGroups);

      // Transform individual tasks
      const individualTasks: Task[] = fullData.individual_tasks.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description || "",
        points: task.points,
        estimatedMinutes: task.duration_mins || 5,
        time_of_day: task.time_of_day as
          | "morning"
          | "afternoon"
          | "evening"
          | "night"
          | undefined,
        is_saved: true,
        template_id: undefined,
        recurring_template_id: task.recurring_template_id || undefined,
        days_of_week: task.days_of_week,
        frequency: task.frequency, // Add frequency property
      }));

      console.log("[KIDOERS-ROUTINE] Transformed groups:", transformedGroups);
      console.log(
        "[KIDOERS-ROUTINE] Transformed individual tasks:",
        individualTasks,
      );

      // Debug: Check if the target task has recurring_template_id after transformation
      const transformedTargetTask = individualTasks.find(
        (task) => task.name === "recurrent",
      );
      if (transformedTargetTask) {
        console.log("[KIDOERS-ROUTINE] 🎯 Target task after transformation:", {
          id: transformedTargetTask.id,
          name: transformedTargetTask.name,
          recurring_template_id: transformedTargetTask.recurring_template_id,
          days_of_week: transformedTargetTask.days_of_week,
        });
      }

      // Load day-specific orders
      console.log(
        "[DRAG-ORDER] 📋 ManualRoutineBuilder: Loading day-specific orders",
      );
      loadDayOrders(fullData.day_orders || []);
      console.log(
        "[DRAG-ORDER] ✅ ManualRoutineBuilder: Day orders loaded:",
        fullData.day_orders,
      );

      // Create a map of task assignments by member
      const assignmentsByMember = new Map<string, string[]>(); // memberId -> taskIds

      // Process group tasks assignments
      for (const group of fullData.groups) {
        for (const task of group.tasks) {
          for (const assignment of task.assignments) {
            const memberId = assignment.member_id;
            const taskId = assignment.routine_task_id;
            if (!assignmentsByMember.has(memberId)) {
              assignmentsByMember.set(memberId, []);
            }
            assignmentsByMember.get(memberId)!.push(taskId);
          }
        }
      }

      // Process individual tasks assignments
      for (const task of fullData.individual_tasks) {
        for (const assignment of task.assignments) {
          const memberId = assignment.member_id;
          const taskId = assignment.routine_task_id;
          if (!assignmentsByMember.has(memberId)) {
            assignmentsByMember.set(memberId, []);
          }
          assignmentsByMember.get(memberId)!.push(taskId);
        }
      }

      console.log(
        "[KIDOERS-ROUTINE] Assignments by member:",
        assignmentsByMember,
      );

      // Distribute tasks and groups to the correct family members
      setEnhancedFamilyMembers((members) =>
        members.map((member) => {
          const memberTaskIds = assignmentsByMember.get(member.id) || [];

          // Filter groups that have tasks assigned to this member
          const memberGroups = transformedGroups
            .filter((group) =>
              group.tasks.some((task) => memberTaskIds.includes(task.id)),
            )
            .map((group) => ({
              ...group,
              tasks: group.tasks.filter((task) =>
                memberTaskIds.includes(task.id),
              ),
            }));

          // Filter individual tasks assigned to this member
          const memberIndividualTasks = individualTasks.filter((task) =>
            memberTaskIds.includes(task.id),
          );

          console.log("[KIDOERS-ROUTINE] Member assignments", {
            memberName: member.name,
            memberId: member.id,
            memberTaskIds,
            memberGroups: memberGroups.length,
            memberIndividualTasks: memberIndividualTasks.length,
          });

          return {
            ...member,
            groups: memberGroups,
            individualTasks: memberIndividualTasks,
          };
        }),
      );

      console.log(
        "[KIDOERS-ROUTINE] Loaded routine data with proper task assignments",
      );

      // Populate the calendar with tasks based on their days_of_week
      // Clear existing tasks to avoid duplication
      const newCalendarTasks: Record<
        string,
        { groups: TaskGroup[]; individualTasks: Task[] }
      > = {
        sunday: { individualTasks: [], groups: [] },
        monday: { individualTasks: [], groups: [] },
        tuesday: { individualTasks: [], groups: [] },
        wednesday: { individualTasks: [], groups: [] },
        thursday: { individualTasks: [], groups: [] },
        friday: { individualTasks: [], groups: [] },
        saturday: { individualTasks: [], groups: [] },
      };

      // Process individual tasks - Assign tasks to their correct members based on assignments
      console.log(
        "[KIDOERS-ROUTINE] 🔍 Processing individual tasks for calendar population",
      );
      console.log("[KIDOERS-ROUTINE] 🔍 selectedMemberIds:", selectedMemberIds);
      console.log(
        "[KIDOERS-ROUTINE] 🔍 enhancedMembers[0]?.id:",
        enhancedMembers[0]?.id,
      );

      for (const task of individualTasks) {
        console.log(
          "[KIDOERS-ROUTINE] 🔍 Task:",
          task.name,
          "days_of_week:",
          task.days_of_week,
          "frequency:",
          task.frequency,
        );

        if (task.frequency === "one_off") {
          // For one_off tasks, use the days_of_week from the task data
          console.log(
            "[KIDOERS-ROUTINE] 🔍 Processing one_off task:",
            task.name,
            "days_of_week:",
            task.days_of_week,
          );

          // Get assignments from the original backend data
          const backendTask = fullData.individual_tasks.find(
            (bt) => bt.id === task.id,
          );

          if (
            backendTask?.assignments &&
            backendTask.assignments.length > 0 &&
            task.days_of_week &&
            task.days_of_week.length > 0
          ) {
            // For one_off tasks, use the days_of_week from the task data
            for (const day of task.days_of_week) {
              if (newCalendarTasks[day]) {
                // Create a single task instance with all assignees for multi-member tasks
                // This ensures the task appears for all members, not just individual instances
                const taskWithAssignees = {
                  ...task,
                  id: `${task.id}_${day}`, // Single ID for the day
                  memberId: backendTask.assignments[0].member_id, // Use first member as primary
                  is_saved: true,
                  routine_task_id: task.id,
                  member_count: backendTask.assignments.length,
                  assignees: backendTask.assignments
                    .map((assignment) => {
                      const member = enhancedMembers.find(
                        (m) => m.id === assignment.member_id,
                      );
                      console.log("[KIDOERS-ROUTINE] 🔍 Creating assignee:", {
                        assignmentMemberId: assignment.member_id,
                        foundMember: member
                          ? { id: member.id, name: member.name }
                          : null,
                        allEnhancedMemberIds: enhancedMembers.map((m) => m.id),
                      });
                      return member
                        ? {
                            id: assignment.member_id,
                            name: member.name,
                            role: member.role,
                            avatar_url: member.avatar_url || null,
                            color: member.color,
                          }
                        : null;
                    })
                    .filter(
                      (assignee): assignee is NonNullable<typeof assignee> =>
                        assignee !== null,
                    ),
                };

                console.log("[KIDOERS-ROUTINE] 🔍 Final task with assignees:", {
                  taskName: task.name,
                  assigneesCount: taskWithAssignees.assignees.length,
                  assignees: taskWithAssignees.assignees.map((a) => ({
                    id: a.id,
                    name: a.name,
                  })),
                });

                newCalendarTasks[day].individualTasks.push(taskWithAssignees);
                console.log(
                  "[KIDOERS-ROUTINE] ✅ Added one_off multi-member task to calendar:",
                  task.name,
                  "on day:",
                  day,
                  "with",
                  backendTask.assignments.length,
                  "assignees",
                );
              }
            }
          } else {
            console.warn(
              "[KIDOERS-ROUTINE] ⚠️ One-off task has no days_of_week or assignments:",
              task.name,
            );
          }
        } else if (task.days_of_week && task.days_of_week.length > 0) {
          // Add this task to each day it's scheduled for, for each assigned member
          for (const day of task.days_of_week) {
            if (newCalendarTasks[day]) {
              // Get assignments from the original backend data
              const backendTask = fullData.individual_tasks.find(
                (bt) => bt.id === task.id,
              );
              if (
                backendTask?.assignments &&
                backendTask.assignments.length > 0
              ) {
                // Create a single task instance with all assignees for multi-member tasks
                // This ensures the task appears for all members, not just individual instances
                const taskWithAssignees = {
                  ...task,
                  id: `${task.id}_${day}`, // Single ID for the day
                  memberId: backendTask.assignments[0].member_id, // Use first member as primary
                  is_saved: true,
                  routine_task_id: task.id,
                  member_count: backendTask.assignments.length,
                  assignees: backendTask.assignments
                    .map((assignment) => {
                      const member = enhancedMembers.find(
                        (m) => m.id === assignment.member_id,
                      );
                      return member
                        ? {
                            id: assignment.member_id,
                            name: member.name,
                            role: member.role,
                            avatar_url: member.avatar_url || null,
                            color: member.color,
                          }
                        : null;
                    })
                    .filter(
                      (assignee): assignee is NonNullable<typeof assignee> =>
                        assignee !== null,
                    ),
                };

                console.log(
                  "[KIDOERS-ROUTINE] 🔍 Final recurring task with assignees:",
                  {
                    taskName: task.name,
                    assigneesCount: taskWithAssignees.assignees.length,
                    assignees: taskWithAssignees.assignees.map((a) => ({
                      id: a.id,
                      name: a.name,
                    })),
                  },
                );

                newCalendarTasks[day].individualTasks.push(taskWithAssignees);
                console.log(
                  "[KIDOERS-ROUTINE] ✅ Added recurring multi-member task to calendar:",
                  task.name,
                  "on day:",
                  day,
                  "with",
                  backendTask.assignments.length,
                  "assignees",
                );
              } else {
                console.warn(
                  "[KIDOERS-ROUTINE] ⚠️ Task has no assignments, skipping:",
                  task.name,
                  "on day:",
                  day,
                );
              }
            }
          }
        }
      }

      // Process group tasks
      for (const group of transformedGroups) {
        const memberTaskIds =
          assignmentsByMember.get(
            selectedMemberIds[0] || enhancedMembers[0]?.id,
          ) || [];
        const memberGroupTasks = group.tasks.filter((task) =>
          memberTaskIds.includes(task.id),
        );

        if (memberGroupTasks.length > 0) {
          // Add groups to days based on their tasks' days_of_week
          const allDays = new Set<string>();
          memberGroupTasks.forEach((task) => {
            if (task.days_of_week) {
              task.days_of_week.forEach((day) => allDays.add(day));
            }
          });

          for (const day of allDays) {
            if (newCalendarTasks[day]) {
              const tasksForDay = memberGroupTasks.filter(
                (task) => task.days_of_week && task.days_of_week.includes(day),
              );

              newCalendarTasks[day].groups.push({
                ...group,
                tasks: tasksForDay,
              });
            }
          }
        }
      }

      setCalendarTasks(newCalendarTasks);
      console.log(
        "[KIDOERS-ROUTINE] Populated calendar with existing tasks:",
        newCalendarTasks,
      );

      // Load routine schedule data
      if (fullData.schedules && fullData.schedules.length > 0) {
        console.log(
          "[KIDOERS-ROUTINE] 📅 ManualRoutineBuilder: Loading routine schedule data...",
        );

        // Find the active schedule
        const activeSchedule = fullData.schedules.find((s) => s.is_active);
        if (activeSchedule) {
          console.log(
            "[KIDOERS-ROUTINE] Active schedule found:",
            activeSchedule,
          );
          // Convert the schedule data to the format expected by RoutineDetailsModal
          const scheduleData: RoutineScheduleData = {
            scope: activeSchedule.scope as
              | "everyday"
              | "weekdays"
              | "weekends"
              | "custom",
            days_of_week: activeSchedule.days_of_week || [],
            start_date: activeSchedule.start_date
              ? new Date(activeSchedule.start_date)
              : undefined,
            end_date: activeSchedule.end_date
              ? new Date(activeSchedule.end_date)
              : undefined,
            timezone: activeSchedule.timezone || "UTC",
            is_active: true,
          };
          setRoutineScheduleData(scheduleData);
          console.log(
            "[KIDOERS-ROUTINE] Set routine schedule data:",
            scheduleData,
          );
        } else {
          console.log("[KIDOERS-ROUTINE] No active schedule found");
        }
      }
    } catch (e: any) {
      console.error("[KIDOERS-ROUTINE] ", "Error loading routine data:", e);
    }
  };

  return (
    <div
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
            {isEditMode && onBack && (
              <div className="mb-4">
                <Button
                  onClick={onBack}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Chores
                </Button>
              </div>
            )}

            {/* Routine Details */}
            <Card className="bg-white border border-gray-200">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div className="flex items-end gap-4">
                      <div className="flex-1 max-w-md">
                        <Label htmlFor="routineName">Planner Name</Label>
                        <div className="relative">
                          <Input
                            id="routineName"
                            placeholder="My Planner"
                            value={routineName}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setRoutineName(newName);

                              // Mark as having unsaved changes if name is different from current routine
                              if (routine && routine.name !== newName.trim()) {
                                setHasUnsavedChanges(true);
                              } else if (
                                routine &&
                                routine.name === newName.trim()
                              ) {
                                setHasUnsavedChanges(false);
                              }
                            }}
                            className="bg-white"
                            disabled={busy}
                          />
                        </div>
                        {!routineName.trim() && (
                          <p className="text-sm text-amber-600 mt-1">
                            Planner name is required to save your planner
                          </p>
                        )}
                      </div>

                      {/* Family Member Selector */}
                      <FamilyMemberSelector
                        enhancedFamilyMembers={enhancedFamilyMembers}
                        selectedMemberIds={selectedMemberIds}
                        setSelectedMemberIds={setSelectedMemberIds}
                        getMemberColors={getMemberColors}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                      />
                    </div>
                  </div>

                  {selectedMemberIds.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Please select one or more family members to start building
                      their routine
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                  onSeriesBadgeClick={handleSeriesBadgeClick}
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
                  onSeriesBadgeClick={handleSeriesBadgeClick}
                />
              ))
            )}

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleSaveRoutineWrapper}
                disabled={totalTasks === 0 || busy || !routineName.trim()}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white flex items-center justify-center space-x-2 flex-1"
              >
                {busy ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      💾{" "}
                      {onComplete ? "Complete Onboarding" : "Save My Planner"}
                    </span>
                  </>
                )}
              </Button>
            </div>

            {(totalTasks === 0 || !routineName.trim()) && (
              <p className="text-center text-sm text-amber-600">
                {!routineName.trim()
                  ? "Please enter a planner name to continue"
                  : "Click on a day to add tasks to your routine"}
              </p>
            )}
          </div>
        </div>

        {/* Create New Task Modal */}
        <Dialog open={showApplyToPopup} onOpenChange={setShowApplyToPopup}>
          <DialogContent className="sm:max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                {selectedTaskForEdit ? "Edit Task" : "Create New Task"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Task Title */}
              <div className="space-y-2">
                <Input
                  value={editableTaskName}
                  onChange={(e) => setEditableTaskName(e.target.value)}
                  placeholder="(No title)"
                  className="w-full border-0 border-b-2 border-gray-300 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-none bg-transparent px-0"
                />
              </div>

              {/* Date and Time */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {pendingDrop?.targetDay
                      ? pendingDrop.targetDay.charAt(0).toUpperCase() +
                        pendingDrop.targetDay.slice(1)
                      : "Select day"}
                  </span>
                </div>
              </div>

              {/* Task Duration */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <Label className="text-sm font-medium text-gray-700">
                    When should this task be done?
                  </Label>
                </div>
                <Select
                  value={(() => {
                    const selectValue =
                      daySelection.mode === "everyday"
                        ? "every-day"
                        : "custom-days";
                    console.log(
                      "[MODAL-SELECT] 🔍 DEBUG: daySelection.mode:",
                      daySelection.mode,
                      "calculated selectValue:",
                      selectValue,
                    );
                    return selectValue;
                  })()}
                  onValueChange={(value) => {
                    console.log(
                      "[MODAL-SELECT] Day selection changed to:",
                      value,
                      "Current daySelection:",
                      daySelection,
                    );
                    if (value === "every-day") {
                      setDaySelection({
                        mode: "everyday",
                        selectedDays: DAYS_OF_WEEK,
                      });
                    } else if (value === "custom-days") {
                      // Smart default: pre-check the day from context or current selection
                      const defaultDay =
                        pendingDrop?.targetDay ||
                        daySelection.selectedDays[0] ||
                        "monday";
                      setDaySelection({
                        mode: "custom",
                        selectedDays: [defaultDay],
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem
                      value="every-day"
                      className="bg-white hover:bg-gray-50"
                    >
                      Every day
                    </SelectItem>
                    <SelectItem
                      value="custom-days"
                      className="bg-white hover:bg-gray-50"
                    >
                      Select specific days
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Helper Label */}
                {(() => {
                  const templateDays = normalizeWeekdays(
                    daySelection.selectedDays,
                  );
                  const hasException = false; // TODO: Implement exception checking
                  const helperText = helperLabel(templateDays, hasException);

                  return (
                    <div className="ml-6">
                      <div className="text-sm text-gray-600 italic">
                        {helperText}
                      </div>
                    </div>
                  );
                })()}

                {/* Day Chips - Always visible when "Select specific days" is active */}
                {(() => {
                  const showDayChips = daySelection.mode === "custom";

                  if (!showDayChips) return null;

                  return (
                    <div className="ml-6 space-y-2">
                      <div className="text-xs text-gray-600 mb-2">
                        Select days:
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const dayIndex = DAYS_OF_WEEK.indexOf(day);
                          const isSelected =
                            daySelection.selectedDays.includes(day);

                          return (
                            <label
                              key={day}
                              className={`flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setDaySelection((prev) => ({
                                      ...prev,
                                      selectedDays: [...prev.selectedDays, day],
                                    }));
                                  } else {
                                    setDaySelection((prev) => ({
                                      ...prev,
                                      selectedDays: prev.selectedDays.filter(
                                        (d) => d !== day,
                                      ),
                                    }));
                                  }
                                }}
                                className="sr-only"
                              />
                              <div
                                className={`w-3 h-3 rounded-full ${isSelected ? "bg-blue-500" : "bg-gray-300"}`}
                              ></div>
                              <span className="text-xs font-medium mt-1">
                                {DAY_NAMES[dayIndex]}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Validation Error */}
                      {daySelection.selectedDays.length === 0 && (
                        <div className="text-sm text-red-600 mt-2">
                          Select at least one day
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Task Assignee */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <Label className="text-sm font-medium text-gray-700">
                    Who should do this task?
                  </Label>
                </div>

                {/* Quick Selection Buttons */}
                <div className="space-y-4">
                  <div className="flex gap-3">
                    {(() => {
                      const allFamilyCount = familyMembers.length;
                      const allKidsCount = familyMembers.filter(m => m.role === 'child').length;
                      const allParentsCount = familyMembers.filter(m => m.role === 'parent').length;
                      
                      const isAllFamilySelected = taskAssignmentMemberIds.length === allFamilyCount && allFamilyCount > 0;
                      const isAllKidsSelected = taskAssignmentMemberIds.length === allKidsCount && allKidsCount > 0 && 
                        familyMembers.filter(m => m.role === 'child').every(m => taskAssignmentMemberIds.includes(m.id));
                      const isAllParentsSelected = taskAssignmentMemberIds.length === allParentsCount && allParentsCount > 0 &&
                        familyMembers.filter(m => m.role === 'parent').every(m => taskAssignmentMemberIds.includes(m.id));

                      return (
                        <>
                          <button
                            onClick={() => {
                              if (isAllFamilySelected) {
                                setTaskAssignmentMemberIds([]);
                              } else {
                                setTaskAssignmentMemberIds(familyMembers.map(m => m.id));
                              }
                            }}
                            className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${
                              isAllFamilySelected
                                ? 'border-gray-800 bg-gray-100 text-gray-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            All Family ({allFamilyCount})
                          </button>
                          
                          {allKidsCount > 0 && (
                            <button
                              onClick={() => {
                                const kids = familyMembers.filter(m => m.role === 'child');
                                if (isAllKidsSelected) {
                                  setTaskAssignmentMemberIds(taskAssignmentMemberIds.filter(id => 
                                    !kids.some(k => k.id === id)
                                  ));
                                } else {
                                  const nonKids = taskAssignmentMemberIds.filter(id => 
                                    !kids.some(k => k.id === id)
                                  );
                                  setTaskAssignmentMemberIds([...nonKids, ...kids.map(k => k.id)]);
                                }
                              }}
                              className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${
                                isAllKidsSelected
                                  ? 'border-gray-800 bg-gray-100 text-gray-800'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              All Kids ({allKidsCount})
                            </button>
                          )}
                          
                          {allParentsCount > 0 && (
                            <button
                              onClick={() => {
                                const parents = familyMembers.filter(m => m.role === 'parent');
                                if (isAllParentsSelected) {
                                  setTaskAssignmentMemberIds(taskAssignmentMemberIds.filter(id => 
                                    !parents.some(p => p.id === id)
                                  ));
                                } else {
                                  const nonParents = taskAssignmentMemberIds.filter(id => 
                                    !parents.some(p => p.id === id)
                                  );
                                  setTaskAssignmentMemberIds([...nonParents, ...parents.map(p => p.id)]);
                                }
                              }}
                              className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${
                                isAllParentsSelected
                                  ? 'border-gray-800 bg-gray-100 text-gray-800'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              All Parents ({allParentsCount})
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>


                  {/* Individual Selection */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Individual Selection</h4>
                    
                    {/* Member Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {familyMembers.map((member) => {
                        const isSelected = taskAssignmentMemberIds.includes(member.id);
                        return (
                          <button
                            key={member.id}
                            onClick={() => {
                              if (isSelected) {
                                setTaskAssignmentMemberIds(taskAssignmentMemberIds.filter(id => id !== member.id));
                              } else {
                                setTaskAssignmentMemberIds([...taskAssignmentMemberIds, member.id]);
                              }
                            }}
                            className={`relative p-2 rounded-lg border-2 transition-all text-left ${
                              isSelected 
                                ? 'border-gray-800 bg-gray-50' 
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                            <div className="flex flex-col items-center space-y-1">
                              <img
                                src={member.avatar_url || generateAvatarUrl(member.avatar_seed || member.id, member.avatar_style || 'bottts', member.avatar_options || {})}
                                alt={member.name}
                                className="w-8 h-8 rounded-full"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div
                                className="w-8 h-8 rounded-full bg-gray-500 text-white text-xs font-medium items-center justify-center hidden"
                                style={{ display: 'none' }}
                              >
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-900">
                                  {member.name}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {member.role}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Helper Text */}
                  <div className="text-xs text-gray-500 italic text-center">
                    We will create one task per selected member.
                  </div>
                </div>
              </div>

              {/* Routine Assignment */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <Label className="text-sm font-medium text-gray-700">
                    Assign to routine (optional)
                  </Label>
                </div>
                <div className="space-y-2">
                  <Select
                    value={selectedRoutineGroup || "none"}
                    onValueChange={setSelectedRoutineGroup}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Choose a routine or create new" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">
                        No routine assignment
                      </SelectItem>
                      {routineGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new">
                        Create new routine
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRoutineGroup === "create-new" && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateGroupModal(true)}
                        className="flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create new routine</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={() => handleApplyToSelection()}
                  disabled={
                    isCreatingTasks ||
                    (daySelection.mode === "custom" &&
                      daySelection.selectedDays.length === 0)
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingTasks ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Mini Popup */}
        {showTaskMiniPopup && selectedTaskForEdit && miniPopupPosition && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowTaskMiniPopup(false)}
          >
            <div
              className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[320px] max-w-[400px]"
              style={(() => {
                // Smart positioning to avoid popup getting cut off at screen edges
                const popupWidth = 360; // Approximate width (320-400px)
                const popupHeight = 300; // Approximate height
                const padding = 10; // Padding from screen edge

                // Calculate horizontal position
                let left = miniPopupPosition.x;
                let transformX = "-50%"; // Default: center on click

                // Check if popup would go off left edge
                if (miniPopupPosition.x - popupWidth / 2 < padding) {
                  left = padding;
                  transformX = "0%"; // Align left edge to position
                }
                // Check if popup would go off right edge
                else if (
                  miniPopupPosition.x + popupWidth / 2 >
                  window.innerWidth - padding
                ) {
                  left = window.innerWidth - padding;
                  transformX = "-100%"; // Align right edge to position
                }

                // Calculate vertical position
                let top = miniPopupPosition.y;
                let transformY = "-100%"; // Default: above click

                // If not enough space above, show below
                if (miniPopupPosition.y - popupHeight < padding) {
                  transformY = "10px"; // Small offset below click
                }

                return {
                  left: `${left}px`,
                  top: `${top}px`,
                  transform: `translate(${transformX}, ${transformY})`,
                };
              })()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with actions */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedTaskForEdit.task.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTask();
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Edit task"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask();
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete task"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                  {/* Series batch actions - only show if task has series_id */}
                  {selectedTaskForEdit.task.series_id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSeriesTasks();
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit all tasks in series"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSeriesTasks();
                        }}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                        title="Delete all tasks in series"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTaskMiniPopup(false);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Close"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Day */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="capitalize">{selectedTaskForEdit.day}</span>
                </div>

                {/* Assigned to */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span>
                    {(() => {
                      const task = selectedTaskForEdit.task;

                      // For multi-member tasks, display all assignees
                      if (task.assignees && task.assignees.length > 1) {
                        const assigneeNames = task.assignees
                          .map((assignee) => assignee.name)
                          .join(", ");
                        return `Assigned to ${assigneeNames}`;
                      }

                      // For single-member tasks, try to find the member
                      if (task.assignees && task.assignees.length === 1) {
                        return `Assigned to ${task.assignees[0].name}`;
                      }

                      // Fallback: try to find member by memberId
                      const member = enhancedFamilyMembers.find(
                        (m) => m.id === selectedTaskForEdit.memberId,
                      );
                      return `Assigned to ${member?.name || "Unknown"}`;
                    })()}
                  </span>
                </div>

                {/* Frequency */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    {getTaskDisplayFrequency(
                      selectedTaskForEdit.task,
                      recurringTemplates,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
        <Dialog
          open={showDeleteConfirmModal}
          onOpenChange={setShowDeleteConfirmModal}
        >
          <DialogContent className="sm:max-w-md bg-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-800">
                Delete recurring event
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="this-event"
                    name="delete-scope"
                    value="this_day"
                    checked={deleteScope === "this_day"}
                    onChange={(e) =>
                      handleDeleteScopeChange(e.target.value as "this_day")
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="this-event"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    This event
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="this-and-following"
                    name="delete-scope"
                    value="this_and_following"
                    checked={deleteScope === "this_and_following"}
                    onChange={(e) =>
                      handleDeleteScopeChange(
                        e.target.value as "this_and_following",
                      )
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="this-and-following"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    This and following events
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id="all-events"
                    name="delete-scope"
                    value="all_days"
                    checked={deleteScope === "all_days"}
                    onChange={(e) =>
                      handleDeleteScopeChange(e.target.value as "all_days")
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="all-events"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    All events
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                onClick={() => setShowDeleteConfirmModal(false)}
                variant="outline"
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => performTaskDeletion(deleteScope)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

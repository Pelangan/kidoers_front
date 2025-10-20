"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTaskOperations } from "../../../hooks/useTaskOperations";
import { useTaskOperations as useTaskOperationsBuilder, type DeleteScope } from "./hooks/useTaskOperations";
import { useTaskCreation } from "./hooks/useTaskCreation";
import { useRoutineDataLoader } from "./hooks/useRoutineDataLoader";
import {
  bulkUpdateDayOrders,
  patchRoutineTask,
  getTaskForEdit,
  bulkDeleteTasks,
  getRoutineFullData,
  updateTemplateDays,
  bulkCreateIndividualTasks,
  bulkUpdateRecurringTasks,
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
import { useTaskOrdering } from "./hooks/useTaskOrdering";
import { useRecurringTaskOperations } from "./hooks/useRecurringTaskOperations";
import { useTaskEditing } from "./hooks/useTaskEditing";
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
  const router = useRouter();
  const sp = useSearchParams();
  const familyId = propFamilyId || sp?.get("family");


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

  // Use task ordering hook
  const {
    dayOrders,
    setDayOrders,
    saveDaySpecificOrder,
    moveTaskToNewDay,
  } = useTaskOrdering();

  // Use task drag and drop hook
  const {
    draggedTask,
    dragOverPosition,
    isDragging,
    setDraggedTask,
    setDragOverPosition,
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
    (day: string, memberId: string, tasks: Task[]) => saveDaySpecificOrder(day, memberId, tasks, currentRoutineId!),
    recurringTemplates,
    () => loadExistingRoutineData(currentRoutineId!, enhancedFamilyMembers),
  );

  // Use recurring task operations hook
  const { handleRemoveDayFromRecurringTask } = useRecurringTaskOperations();

  // Use task editing hook
  const { handleEditTask: handleEditTaskInternal } = useTaskEditing();

  // Wrapper for handleEditTask to pass all required parameters
  const handleEditTask = () => {
    handleEditTaskInternal(
      selectedTaskForEdit,
      currentRoutineId,
      calendarTasks,
      recurringTemplates,
      setRecurringTemplates,
      setPendingDrop,
      setTaskAssignmentMemberIds,
      setDaySelection,
      setEditableTaskName,
      setSelectedWhoOption,
      setSelectedRoutineGroup,
      setShowTaskMiniPopup,
      setMiniPopupPosition,
      setShowApplyToPopup,
      getMemberNameById,
    );
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
      "[TASK-CLICK] 🔍 Task clicked:",
      task.name,
      "showTaskMiniPopup:",
      showTaskMiniPopup,
      "isDeletingTask:",
      isDeletingTask,
    );
    console.log("[TASK-CLICK] 🔍 Task details:", {
      taskId: task.id,
      routineTaskId: task.routine_task_id,
      memberCount: task.member_count,
      assignees: task.assignees?.length,
      isMultiMember: task.member_count && task.member_count > 1,
    });

    // Prevent opening popup if it's already open or if we're deleting
    if (showTaskMiniPopup || isDeletingTask) {
      console.log(
        "[TASK-CLICK] ❌ Popup already open or deleting, ignoring click",
      );
      return;
    }

    // Add a small delay to prevent rapid clicks
    setTimeout(() => {
      if (!showTaskMiniPopup && !isDeletingTask) {
        console.log("[TASK-CLICK] ✅ Opening popup after delay");
        setSelectedTaskForEdit({ task, day, memberId });
        setMiniPopupPosition({ x: e.clientX, y: e.clientY });
        setShowTaskMiniPopup(true);
        console.log("[TASK-CLICK] ✅ Mini popup state set to true");
      }
    }, 50);
  };

  // handleColumnClick and handleColumnClickWrapper moved to useTaskCreation hook



  // Restored handleApplyToSelection implementation
  const handleApplyToSelection = async (applyToId?: string) => {
    const selectedApplyToId = applyToId || selectedWhoOption;
    
    if (!pendingDrop) {
      return;
    }

    setIsCreatingTasks(true);

    try {
      // Determine which days to add the task to based on day selection
      let targetDays: string[] = [];
      
      if (daySelection.mode === 'everyday') {
        targetDays = DAYS_OF_WEEK;
      } else if (daySelection.mode === 'custom') {
        targetDays = daySelection.selectedDays;
      }

      // Check if we're editing an existing recurring task
      const isEditingRecurringTask = selectedTaskForEdit && 
                                   selectedTaskForEdit.task.recurring_template_id && 
                                   pendingDrop.type === 'task' &&
                                   pendingDrop.item.id === selectedTaskForEdit.task.id;

      // Determine which members should receive the task based on applyToId
      let targetMemberIds: string[] = [];
      
      if (selectedApplyToId === 'none') {
        // Only the member the task was dropped on
        targetMemberIds = [pendingDrop.targetMemberId];
      } else if (selectedApplyToId === 'all-kids') {
        // All children in the family
        const kids = enhancedFamilyMembers.filter(member => member.type === 'child');
        targetMemberIds = kids.map(member => member.id);
      } else if (selectedApplyToId === 'all-parents') {
        // All parents in the family
        const parents = enhancedFamilyMembers.filter(member => member.type === 'parent');
        targetMemberIds = parents.map(member => member.id);
      } else if (selectedApplyToId === 'all-family') {
        // All family members
        targetMemberIds = enhancedFamilyMembers.map(member => member.id);
      } else {
        // Fallback to single member
        targetMemberIds = [pendingDrop.targetMemberId];
      }

      // Handle task creation/update
      if (pendingDrop.type === 'task') {
        // Ensure routine exists first
        const routineData = await ensureRoutineExists();
        if (!routineData) {
          setError('Failed to create routine. Please try again.');
          return;
        }

        // Check if we're editing an existing recurring task
        if (isEditingRecurringTask && selectedTaskForEdit) {
          const task = pendingDrop.item as Task;
          const updatePayload = {
            recurring_template_id: selectedTaskForEdit.task.recurring_template_id!,
            task_template: {
              name: editableTaskName || task.name,
              description: task.description || undefined,
              points: task.points,
              duration_mins: task.estimatedMinutes,
              time_of_day: task.time_of_day || undefined,
              from_task_template_id: task.is_system ? task.id : undefined
            },
            assignments: targetMemberIds.map(memberId => ({
              member_id: memberId,
              days_of_week: targetDays,
              order_index: 0
            })),
            new_days_of_week: targetDays
          };

          // Call the recurring task update API
          const result = await bulkUpdateRecurringTasks(routineData.id, updatePayload);

          // Update UI with the changes
          // First, remove all existing tasks for this recurring template
          const newCalendarTasks = { ...calendarTasks };
          Object.keys(newCalendarTasks).forEach(day => {
            newCalendarTasks[day] = {
              ...newCalendarTasks[day],
              individualTasks: newCalendarTasks[day].individualTasks.filter(task => 
                task.recurring_template_id !== selectedTaskForEdit.task.recurring_template_id
              )
            };
          });

          // Add the updated tasks
          for (const updatedTask of result.updated_tasks) {
            const day = updatedTask.days_of_week[0]; // Each task is for one day
            if (!newCalendarTasks[day]) {
              newCalendarTasks[day] = { individualTasks: [], groups: [] };
            }
            
            // Add task to UI for each assigned member
            for (const assignment of updatedTask.assignments) {
              const taskForUI = {
                ...updatedTask,
                memberId: assignment.member_id,
                is_saved: true,
                // Ensure deletion and ordering logic can find backend ID
                routine_task_id: updatedTask.id,
                template_id: updatedTask.recurring_template_id || undefined,
                recurring_template_id: updatedTask.recurring_template_id || undefined,
                from_group: undefined,
                estimatedMinutes: updatedTask.duration_mins || 5,
                time_of_day: updatedTask.time_of_day as "morning" | "afternoon" | "evening" | "night" | undefined
              };
              
              newCalendarTasks[day].individualTasks.push(taskForUI);
            }
          }

          setCalendarTasks(newCalendarTasks);

          // Close modal and reset state
          setShowApplyToPopup(false);
          setPendingDrop(null);
          setDaySelection({ mode: 'custom', selectedDays: [] });
          setSelectedWhoOption('none');
          setEditableTaskName('');
          setSelectedTaskForEdit(null);

          return; // Exit early for recurring task updates
        }

        // If editing a single (non-recurring) existing task, PATCH instead of creating a new one
        const isEditingSingleTask =
          !!selectedTaskForEdit &&
          !selectedTaskForEdit.task.recurring_template_id &&
          pendingDrop.item.id === selectedTaskForEdit.task.id;

        if (isEditingSingleTask) {
          try {
            const taskId = extractTaskId(selectedTaskForEdit.task.id);
            await patchRoutineTask(routineData.id, taskId, {
              name: editableTaskName || selectedTaskForEdit.task.name,
            });

            // Update UI name in place
            const updated = { ...calendarTasks };
            Object.keys(updated).forEach((day) => {
              updated[day] = {
                ...updated[day],
                individualTasks: (updated[day].individualTasks || []).map((t) =>
                  t.id === selectedTaskForEdit.task.id
                    ? { ...t, name: editableTaskName || selectedTaskForEdit.task.name }
                    : t,
                ),
              };
            });
            setCalendarTasks(updated);

            // Close modal and reset state
            setShowApplyToPopup(false);
            setPendingDrop(null);
            setDaySelection({ mode: 'custom', selectedDays: [] });
            setSelectedWhoOption('none');
            setEditableTaskName('');
            setSelectedTaskForEdit(null);

            return; // Exit after successful update
          } catch (err) {
            console.error('[KIDOERS-ROUTINE] ❌ Failed to update task name:', err);
            // Fall through to creation path only if update fails explicitly
          }
        }

        console.log('[KIDOERS-ROUTINE] 🚀 Using bulk API for task creation');

        // Prepare bulk task creation payload
        const task = pendingDrop.item as Task;
        const bulkPayload = {
          task_template: {
            name: editableTaskName || task.name,
            description: task.description || undefined,
            points: task.points,
            duration_mins: task.estimatedMinutes,
            time_of_day: task.time_of_day || undefined,
            from_task_template_id: task.is_system ? task.id : undefined
          },
          assignments: targetMemberIds.map(memberId => ({
            member_id: memberId,
            days_of_week: targetDays,
            order_index: 0
          })),
          create_recurring_template: true // Always create recurring template
        };

        // Call bulk API
        const result = await bulkCreateIndividualTasks(routineData.id, bulkPayload);

        // Update UI with created tasks
        const newCalendarTasks = { ...calendarTasks };
        for (const createdTask of result.created_tasks) {
          // Get the day from the template's days_of_week (since routine_tasks.days_of_week is now NULL)
          // For now, we'll use the targetDays from the UI since each task is created for specific days
          const taskDays = targetDays; // Use the days from the UI selection
          
          // Add task to UI for each assigned day and member
          for (const day of taskDays) {
            if (!newCalendarTasks[day]) {
              newCalendarTasks[day] = { individualTasks: [], groups: [] };
            }
            
            for (const memberId of targetMemberIds) {
              const taskForUI = {
                ...createdTask,
                memberId: memberId,
                is_saved: true,
                // Ensure deletion and ordering logic can find backend ID
                routine_task_id: createdTask.id,
                estimatedMinutes: createdTask.duration_mins || 30, // Default to 30 minutes if not specified
                time_of_day: createdTask.time_of_day as "morning" | "afternoon" | "evening" | "night" | null,
                recurring_template_id: createdTask.recurring_template_id || 'temp-id'
              };
            
            // Check if task already exists in UI state to avoid duplicates
            const existingTaskIndex = newCalendarTasks[day].individualTasks.findIndex(
              existingTask => existingTask.id === taskForUI.id && existingTask.memberId === memberId
            );
            
              if (existingTaskIndex >= 0) {
                // Update existing task
                newCalendarTasks[day].individualTasks[existingTaskIndex] = taskForUI;
              } else {
                // Add new task
                newCalendarTasks[day].individualTasks.push(taskForUI);
              }
            }
          }
        }
        
        setCalendarTasks(newCalendarTasks);
      } else if (pendingDrop.type === 'group') {
        // Handle group creation (keep existing logic for now)
        for (const day of targetDays) {
          for (const memberId of targetMemberIds) {
            addGroupToCalendar(memberId, pendingDrop.item as TaskGroup, selectedApplyToId, day, pendingDrop.selectedTasks);
          }
        }
      }

      // Close popup and reset
      setShowApplyToPopup(false);
      setPendingDrop(null);
      setDaySelection({ mode: 'custom', selectedDays: [] });
      setSelectedWhoOption('none');
      setEditableTaskName('');
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ❌ Error in handleApplyToSelection:', error);
      setError('Failed to create tasks. Please try again.');
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
  const { handleColumnClick, handleColumnClickWrapper } = useTaskCreation({
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

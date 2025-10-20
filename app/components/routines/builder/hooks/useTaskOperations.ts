import { useCallback } from 'react'
import {
  deleteRoutineTask,
  bulkDeleteTasks,
  bulkCreateIndividualTasks,
  getRoutineFullData,
  updateTemplateDays,
} from '../../../../lib/api'
import type {
  Task,
  EnhancedFamilyMember,
  RecurringTemplate,
} from '../types/routineBuilderTypes'

interface UseTaskOperationsProps {
  // State from main component
  selectedTaskForEdit: { task: Task; day: string; memberId: string } | null
  calendarTasks: Record<string, { groups: any[]; individualTasks: Task[] }>
  currentRoutineId: string | null
  enhancedFamilyMembers: EnhancedFamilyMember[]
  recurringTemplates: RecurringTemplate[]
  
  // Setters from main component
  setCalendarTasks: (updater: (prev: Record<string, { groups: any[]; individualTasks: Task[] }>) => Record<string, { groups: any[]; individualTasks: Task[] }>) => void
  setError: (error: string | null) => void
  setShowTaskMiniPopup: (show: boolean) => void
  setMiniPopupPosition: (position: { x: number; y: number } | null) => void
  setSelectedTaskForEdit: (task: { task: Task; day: string; memberId: string } | null) => void
  setRecurringTemplates: (templates: RecurringTemplate[]) => void
  
  // Functions from other hooks
  ensureRoutineExists: () => Promise<{ id: string } | null>
  openDeleteConfirmModal: () => void
  closeDeleteConfirmModal: () => void
  showUndoToast: (operation: any, message: string) => void
  loadExistingRoutineData: (routineId: string, members: EnhancedFamilyMember[]) => Promise<void>
}

// Day constants - Sunday moved to last position
const DAYS_OF_WEEK = [
  "monday",
  "tuesday", 
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

export const useTaskOperations = ({
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
}: UseTaskOperationsProps) => {
  
  // Handle delete individual task - check if it's recurring first
  const handleDeleteIndividualTask = useCallback(async () => {
    if (!selectedTaskForEdit?.task.routine_task_id) {
      console.error('[KIDOERS-ROUTINE] ❌ No routine_task_id found for task');
      return;
    }

    // Get recurrence data from template
    const template = recurringTemplates.find(t => t.id === selectedTaskForEdit.task.recurring_template_id);
    const taskDays = template?.days_of_week || [];

    console.log('[KIDOERS-ROUTINE] 🗑️ Checking task for deletion:', {
      task_id: selectedTaskForEdit.task.routine_task_id,
      name: selectedTaskForEdit.task.name,
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      template_days: taskDays
    });

    // Check if this is a recurring task (has recurring_template_id and multiple days)
    const isRecurringTask = selectedTaskForEdit.task.recurring_template_id && 
                           taskDays.length > 1;

    if (isRecurringTask) {
      console.log('[KIDOERS-ROUTINE] 🔄 This is a recurring task, showing deletion modal');
      // Close mini popup first
      setShowTaskMiniPopup(false);
      setMiniPopupPosition(null);
      // Show the recurring task deletion modal
      openDeleteConfirmModal();
      return;
    }

    // For non-recurring tasks, delete immediately
    console.log('[KIDOERS-ROUTINE] 🗑️ Deleting individual task immediately:', selectedTaskForEdit.task.routine_task_id);
    
    // Store task info and original calendar state for undo
    const taskToDelete = selectedTaskForEdit;
    const originalCalendarTasks = JSON.parse(JSON.stringify(calendarTasks)); // Deep copy for undo

    try {
      // Close mini popup first
      setShowTaskMiniPopup(false);
      setMiniPopupPosition(null);
      
      // Get routine data and use individual task deletion API
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        console.error('[KIDOERS-ROUTINE] ❌ No routine data available');
        setError("Failed to get routine information. Please try again.");
        return;
      }
      
      // Delete only the specific task by its routine_task_id
      await deleteRoutineTask(routineData.id, selectedTaskForEdit.task.routine_task_id);
      
      console.log('[KIDOERS-ROUTINE] ✅ Task deleted successfully');

      // Remove from calendar state
      setCalendarTasks((prev) => {
        const newCalendarTasks = { ...prev };
        
        // Remove only the specific task for the specific member
        Object.keys(newCalendarTasks).forEach((day) => {
          newCalendarTasks[day] = {
            ...newCalendarTasks[day],
            individualTasks: newCalendarTasks[day].individualTasks.filter((t) => {
              // Remove only the exact task with the same routine_task_id and member_id
              return !(t.routine_task_id === selectedTaskForEdit.task.routine_task_id &&
                       t.memberId === selectedTaskForEdit.memberId);
            }),
          };
        });
        
        return newCalendarTasks;
      });

      // Show undo toast with proper functionality
      const operationId = `delete-${taskToDelete.task.id}-${Date.now()}`;

      // Store task data needed for undo
      // Get template data for the task being deleted
      const deleteTemplate = recurringTemplates.find(t => t.id === taskToDelete.task.recurring_template_id);
      const deleteTaskDays = deleteTemplate?.days_of_week || [taskToDelete.day];

      const taskDataForUndo = {
        name: taskToDelete.task.name,
        description: taskToDelete.task.description || undefined,
        points: taskToDelete.task.points,
        duration_mins: taskToDelete.task.estimatedMinutes,
        time_of_day: taskToDelete.task.time_of_day || undefined,
        frequency: (deleteTemplate?.frequency_type || "specific_days") as
          | "one_off"
          | "daily"
          | "specific_days"
          | "weekly",
        days_of_week: deleteTaskDays,
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
                days_of_week: deleteTaskDays,
                order_index: 0,
              })),
              create_recurring_template: true,
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

      showUndoToast(
        {
          id: operationId,
          type: "delete",
          taskData: taskToDelete,
          originalCalendarTasks,
          undoFunction,
        },
        "Task deleted",
      );
      
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ❌ Failed to delete task:', error);
      setError("Failed to delete task. Please try again.");
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setError("");
      }, 5000);
    }
  }, [
    selectedTaskForEdit,
    calendarTasks,
    currentRoutineId,
    enhancedFamilyMembers,
    setCalendarTasks,
    setError,
    setShowTaskMiniPopup,
    setMiniPopupPosition,
    openDeleteConfirmModal,
    ensureRoutineExists,
    showUndoToast,
    loadExistingRoutineData,
  ]);

  // Handle recurring task deletion with scope selection
  const handleRecurringTaskDeletion = useCallback(async (scope: 'this_day' | 'this_and_following' | 'all_days') => {
    if (!selectedTaskForEdit?.task.routine_task_id || !selectedTaskForEdit?.task.recurring_template_id) {
      console.error('[KIDOERS-ROUTINE] ❌ No routine_task_id or recurring_template_id found for task');
      return;
    }

    console.log('[KIDOERS-ROUTINE] 🗑️ Deleting recurring task with scope:', scope);
    
    // Store task info and original calendar state for undo
    const taskToDelete = selectedTaskForEdit;
    const originalCalendarTasks = JSON.parse(JSON.stringify(calendarTasks)); // Deep copy for undo

    try {
      // Close modals first
      closeDeleteConfirmModal();
      setSelectedTaskForEdit(null);
      
      // Get routine data
      const routineData = await ensureRoutineExists();
      if (!routineData) {
        console.error('[KIDOERS-ROUTINE] ❌ No routine data available');
        setError("Failed to get routine information. Please try again.");
        return;
      }
      
      // Use bulk delete API for recurring tasks
      await bulkDeleteTasks(routineData.id, {
        recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
        delete_scope: scope,
        target_day: selectedTaskForEdit.day,
        member_id: selectedTaskForEdit.memberId
      });
      
      console.log('[KIDOERS-ROUTINE] ✅ Recurring task deleted successfully with scope:', scope);

      // Remove from calendar state based on scope
      setCalendarTasks((prev) => {
        const newCalendarTasks = { ...prev };
        
        if (scope === 'all_days') {
          // Remove all tasks with this recurring_template_id
          Object.keys(newCalendarTasks).forEach((day) => {
            newCalendarTasks[day] = {
              ...newCalendarTasks[day],
              individualTasks: newCalendarTasks[day].individualTasks.filter((t) => {
                return t.recurring_template_id !== selectedTaskForEdit.task.recurring_template_id ||
                       t.memberId !== selectedTaskForEdit.memberId;
              }),
            };
          });
        } else {
          // Remove specific task or tasks from this day forward
          Object.keys(newCalendarTasks).forEach((day) => {
            const shouldRemove = scope === 'this_day' ? 
              day === selectedTaskForEdit.day :
              DAYS_OF_WEEK.indexOf(day) >= DAYS_OF_WEEK.indexOf(selectedTaskForEdit.day);
              
            if (shouldRemove) {
              newCalendarTasks[day] = {
                ...newCalendarTasks[day],
                individualTasks: newCalendarTasks[day].individualTasks.filter((t) => {
                  return !(t.recurring_template_id === selectedTaskForEdit.task.recurring_template_id &&
                           t.memberId === selectedTaskForEdit.memberId);
                }),
              };
            }
          });
        }
        
        return newCalendarTasks;
      });

      // Show undo toast with proper functionality
      const operationId = `delete-recurring-${taskToDelete.task.id}-${Date.now()}`;

      const undoFunction = async () => {
        try {
          console.log("[TASK-UNDO] 🔄 Restoring recurring task in backend...", taskToDelete);

          // Recreate the task in the backend using bulk individual tasks
          if (currentRoutineId && enhancedFamilyMembers.length > 0) {
            // Get template data for the task being deleted
            const deleteTemplate = recurringTemplates.find(t => t.id === taskToDelete.task.recurring_template_id);
            const deleteTaskDays = deleteTemplate?.days_of_week || [taskToDelete.day];
            
            const bulkPayload = {
              task_template: {
                name: taskToDelete.task.name,
                description: taskToDelete.task.description || undefined,
                points: taskToDelete.task.points,
                duration_mins: taskToDelete.task.estimatedMinutes,
                time_of_day: taskToDelete.task.time_of_day || undefined,
                is_system: false,
              },
              assignments: [{
                member_id: taskToDelete.memberId,
                days_of_week: deleteTaskDays,
                order_index: 0,
              }],
              create_recurring_template: true,
            };
            await bulkCreateIndividualTasks(currentRoutineId, bulkPayload);
            console.log("[TASK-UNDO] ✅ Recurring task recreated in backend");

            // Reload the entire routine data - this will rebuild calendar correctly
            await loadExistingRoutineData(currentRoutineId, enhancedFamilyMembers);
            console.log("[TASK-UNDO] ✅ Recurring task fully restored (UI + Backend)");
          } else {
            // Fallback: just restore UI state if no routine ID
            setCalendarTasks(originalCalendarTasks);
            console.log("[TASK-UNDO] ⚠️ Restored UI only (no routine ID)");
          }
        } catch (error) {
          console.error("[TASK-UNDO] ❌ Error undoing recurring task deletion:", error);
          throw error;
        }
      };

      showUndoToast(
        {
          id: operationId,
          type: "delete",
          taskData: taskToDelete,
          originalCalendarTasks,
          undoFunction,
        },
        `Task deleted (${scope.replace('_', ' ')})`,
      );

    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ❌ Failed to delete recurring task:', error);
      setError("Failed to delete task. Please try again.");

      // Clear error message after 5 seconds
      setTimeout(() => {
        setError("");
      }, 5000);
    }
  }, [
    selectedTaskForEdit,
    calendarTasks,
    currentRoutineId,
    enhancedFamilyMembers,
    setCalendarTasks,
    setError,
    setSelectedTaskForEdit,
    closeDeleteConfirmModal,
    ensureRoutineExists,
    showUndoToast,
    loadExistingRoutineData,
  ]);

  return {
    handleDeleteIndividualTask,
    handleRecurringTaskDeletion,
  }
}

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

// Delete scope types
export type DeleteScope = 'instance' | 'following' | 'series';

// Planner card type for delete decisions
export interface PlannerCard {
  id: string;
  routine_status: 'draft' | 'active';
  name: string;
  time_of_day: 'any'|'morning'|'afternoon'|'evening';
  date: string;     // the column's date (for "this event only")
  weekday: string; // 'monday'...'sunday' (the column)
  recurring_template_id: string;
  recurrence: {
    days_of_week: string[];
  };
}

// Helper to decide whether to show delete modal based on days_of_week length
export function getDeleteModalModel(card: PlannerCard) {
  const isPlannerEdit = card.routine_status === 'draft';
  if (!isPlannerEdit) return { show: false, options: [] as DeleteScope[] };

  const count = card.recurrence?.days_of_week?.length ?? 0;
  
  console.log('[KIDOERS-ROUTINE] getDeleteModalModel:', {
    card_name: card.name,
    card_weekday: card.weekday,
    recurrence_days: card.recurrence?.days_of_week,
    count: count,
    isPlannerEdit: isPlannerEdit
  });

  // RULE: 
  // - count >= 2  -> show modal (user can choose scope)
  // - count === 1 -> NO modal (just a small confirm; deleting equals "series")
  // - count === 0 -> shouldn't happen for weekly planner
  const show = count >= 2;

  if (!show) return { show: false, options: [] as DeleteScope[] };

  // For now we support: This event only, All events
  // (Hide "This and following" until we implement split-series)
  return { show: true, options: ['instance', 'series'] as DeleteScope[] };
}

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
  
  // Remove specific day from template (for "This event only")
  const removeDayFromTemplate = useCallback(async (card: PlannerCard) => {
    if (!currentRoutineId) return;

    const days = card.recurrence.days_of_week ?? [];
    const targetWeekday = card.weekday.toLowerCase(); // Ensure target weekday is lowercase

    console.log('[KIDOERS-ROUTINE] removeDayFromTemplate - Initial days:', days);
    console.log('[KIDOERS-ROUTINE] removeDayFromTemplate - Card weekday (normalized):', targetWeekday);
    console.log('[KIDOERS-ROUTINE] removeDayFromTemplate - Days length:', days.length);
    
    // CRITICAL: Check if we have valid template data
    if (!days || days.length === 0) {
      console.error('[KIDOERS-ROUTINE] ❌ removeDayFromTemplate: No days found in card.recurrence.days_of_week');
      console.error('[KIDOERS-ROUTINE] ❌ Card data:', { 
        card_id: card.id, 
        card_weekday: card.weekday, 
        recurrence_days: card.recurrence.days_of_week,
        template_id: card.recurring_template_id 
      });
      setError('Cannot remove day: template data not found. Please refresh and try again.');
      return;
    }
    
    if (days.length <= 1) {
      // If only one day left, delete the entire template
      console.log('[KIDOERS-ROUTINE] 🔄 Only one day left, deleting entire template');
      await bulkDeleteTasks(currentRoutineId!, {
        recurring_template_id: card.recurring_template_id,
        delete_scope: 'all_days'
      });
    } else {
      // Remove the specific weekday from the template
      const updated = days.filter(d => d !== targetWeekday); // Use normalized weekday for filtering
      console.log(`[KIDOERS-ROUTINE] 🔄 Removing ${targetWeekday} from template, remaining: ${updated}`);
      console.log(`[KIDOERS-ROUTINE] 🔄 Original days: [${days.join(', ')}]`);
      console.log(`[KIDOERS-ROUTINE] 🔄 Updated days: [${updated.join(', ')}]`);
      
      if (updated.length === 0) {
        console.warn('[KIDOERS-ROUTINE] ⚠️ Filtered days array is empty, this should trigger full deletion via backend logic.');
      }
      
      // Update template with remaining days
      await updateTemplateDays(currentRoutineId!, card.recurring_template_id, { days_of_week: updated });
    }
  }, [currentRoutineId, updateTemplateDays, bulkDeleteTasks]);

  // Delete entire series (remove weekday or delete template)
  const deleteSeries = useCallback(async (card: PlannerCard) => {
    if (!currentRoutineId) return;

    const days = card.recurrence.days_of_week ?? [];
    
    if (days.length > 1) {
      // Remove the specific weekday from the rule
      const updated = days.filter(d => d !== card.weekday);
      console.log(`[KIDOERS-ROUTINE] 🔄 Removing ${card.weekday} from series, remaining: ${updated}`);
      
      // Update template with remaining days
      await updateTemplateDays(currentRoutineId!, card.recurring_template_id, { days_of_week: updated });
    } else {
      // Last weekday → delete the entire template
      console.log('[KIDOERS-ROUTINE] 🔄 Deleting entire series (last weekday)');
      await bulkDeleteTasks(currentRoutineId!, {
        recurring_template_id: card.recurring_template_id,
        delete_scope: 'all_days'
      });
    }
  }, [currentRoutineId, updateTemplateDays, bulkDeleteTasks]);

  // Handle delete choice based on scope
  const handleDeleteChoice = useCallback(async (choice: DeleteScope, card: PlannerCard) => {
    if (!currentRoutineId) {
      console.error('[KIDOERS-ROUTINE] ❌ No routine ID for deletion');
      return;
    }

    try {
      switch (choice) {
        case 'instance':
          // "This event only" - remove the specific day from the template
          console.log('[KIDOERS-ROUTINE] 🔄 Removing this occurrence by updating template');
          await removeDayFromTemplate(card);
          break;

        case 'series':
          await deleteSeries(card);
          break;

        // case 'following':  // add later with split-series support
      }

      // Refresh data after deletion
      await loadExistingRoutineData(currentRoutineId, enhancedFamilyMembers);
      
      // Close mini popup and reset state
      setShowTaskMiniPopup(false);
      setMiniPopupPosition(null);
      setSelectedTaskForEdit(null);
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] ❌ Error in handleDeleteChoice:', error);
      setError('Failed to delete task. Please try again.');
    }
  }, [currentRoutineId, enhancedFamilyMembers, loadExistingRoutineData, setError, removeDayFromTemplate, setShowTaskMiniPopup, setMiniPopupPosition, setSelectedTaskForEdit]);

  // Handle delete individual task - check if it's recurring first
  const handleDeleteIndividualTask = useCallback(async () => {
    if (!selectedTaskForEdit?.task.routine_task_id) {
      console.error('[KIDOERS-ROUTINE] ❌ No routine_task_id found for task');
      return;
    }

    // Get recurrence data from template - CRITICAL: Do this BEFORE any deletion logic
    let template = recurringTemplates.find(t => t.id === selectedTaskForEdit.task.recurring_template_id);
    let taskDays = template?.days_of_week || [];

    console.log('[KIDOERS-ROUTINE] 🔍 Template lookup debug:', {
      task_recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      recurringTemplates_count: recurringTemplates.length,
      recurringTemplates_ids: recurringTemplates.map(t => t.id),
      template_found: !!template,
      template_days: template?.days_of_week
    });

    // If template not found locally, try to fetch it from the backend
    if (!template && selectedTaskForEdit.task.recurring_template_id && currentRoutineId) {
      console.log('[KIDOERS-ROUTINE] 🔍 Template not found locally, fetching from backend...');
      try {
        const fullData = await getRoutineFullData(currentRoutineId);
        console.log('[KIDOERS-ROUTINE] 🔍 Backend fetch result:', {
          fullData_recurring_templates_count: fullData.recurring_templates?.length || 0,
          fullData_recurring_templates_ids: fullData.recurring_templates?.map(t => t.id) || [],
          looking_for_id: selectedTaskForEdit.task.recurring_template_id
        });
        
        template = fullData.recurring_templates?.find(t => t.id === selectedTaskForEdit.task.recurring_template_id);
        taskDays = template?.days_of_week || [];
        console.log('[KIDOERS-ROUTINE] 🔍 Fetched template from backend:', { template_found: !!template, days: taskDays });
        
        // Update local recurringTemplates if we found the template
        if (template) {
          console.log('[KIDOERS-ROUTINE] 🔄 Updating local recurringTemplates with fetched template');
          setRecurringTemplates(prev => {
            const exists = prev.find(t => t.id === template.id);
            if (!exists) {
              return [...prev, template];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('[KIDOERS-ROUTINE] ❌ Failed to fetch template from backend:', error);
      }
    }

    // CRITICAL: If we still don't have template data, we can't proceed with deletion
    if (!template || !taskDays.length) {
      console.error('[KIDOERS-ROUTINE] ❌ Cannot proceed with deletion: no template or empty days');
      console.error('[KIDOERS-ROUTINE] ❌ Template found:', !!template, 'Days:', taskDays);
      setError('Cannot delete task: template data not found. Please refresh and try again.');
      return;
    }

    console.log('[KIDOERS-ROUTINE] 🗑️ Checking task for deletion:', {
      task_id: selectedTaskForEdit.task.routine_task_id,
      name: selectedTaskForEdit.task.name,
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      template_found: !!template,
      template_days: taskDays,
      template_days_length: taskDays.length,
      selected_day: selectedTaskForEdit.day,
      all_templates: recurringTemplates.map(t => ({ id: t.id, name: t.name, days: t.days_of_week }))
    });

    // Create planner card for delete decision using length-of-days rule
    const card: PlannerCard = {
      id: selectedTaskForEdit.task.id,
      routine_status: 'draft', // Assume draft mode for now
      name: selectedTaskForEdit.task.name,
      time_of_day: (selectedTaskForEdit.task.time_of_day as 'any'|'morning'|'afternoon'|'evening') || 'any',
      date: selectedTaskForEdit.day, // The day this task appears on
      weekday: selectedTaskForEdit.day.toLowerCase(), // Ensure lowercase
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id || '',
      recurrence: {
        days_of_week: taskDays
      }
    };

    console.log('[KIDOERS-ROUTINE] 🔍 Created planner card:', {
      card_id: card.id,
      card_weekday: card.weekday,
      card_recurrence_days: card.recurrence.days_of_week,
      card_recurrence_length: card.recurrence.days_of_week.length
    });

    const model = getDeleteModalModel(card);

    console.log('[KIDOERS-ROUTINE] 🔍 Delete modal decision:', {
      card_days_count: card.recurrence.days_of_week.length,
      model_show: model.show,
      model_options: model.options
    });

    if (!model.show) {
      // Single-day weekly → delete entire series (or tiny confirm first)
      console.log('[KIDOERS-ROUTINE] 🔄 Single-day task, deleting entire series');
      await handleDeleteChoice('series', card);
      return;
    }

    // Multi-day task → show modal
    console.log('[KIDOERS-ROUTINE] 🔄 Multi-day task, showing deletion modal');
    setShowTaskMiniPopup(false);
    setMiniPopupPosition(null);
    openDeleteConfirmModal();
    return; // IMPORTANT: Exit here to prevent falling through to non-recurring logic

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

  // Handle recurring task deletion with scope selection (updated to use DeleteScope)
  const handleRecurringTaskDeletion = useCallback(async (scope: DeleteScope) => {
    if (!selectedTaskForEdit?.task.routine_task_id || !selectedTaskForEdit?.task.recurring_template_id) {
      console.error('[KIDOERS-ROUTINE] ❌ No routine_task_id or recurring_template_id found for task');
      return;
    }

    console.log('[KIDOERS-ROUTINE] 🗑️ Deleting recurring task with scope:', scope);
    
    // Create planner card for consistent handling
    const template = recurringTemplates.find(t => t.id === selectedTaskForEdit.task.recurring_template_id);
    const card: PlannerCard = {
      id: selectedTaskForEdit.task.id,
      routine_status: 'draft',
      name: selectedTaskForEdit.task.name,
      time_of_day: (selectedTaskForEdit.task.time_of_day as 'any'|'morning'|'afternoon'|'evening') || 'any',
      date: selectedTaskForEdit.day,
      weekday: selectedTaskForEdit.day,
      recurring_template_id: selectedTaskForEdit.task.recurring_template_id,
      recurrence: {
        days_of_week: template?.days_of_week || []
      }
    };

    // Close modals first
    closeDeleteConfirmModal();
    setSelectedTaskForEdit(null);
    
    // Use the unified delete choice handler
    await handleDeleteChoice(scope, card);

  }, [selectedTaskForEdit, recurringTemplates, closeDeleteConfirmModal, setSelectedTaskForEdit, handleDeleteChoice]);

  return {
    handleDeleteIndividualTask,
    handleRecurringTaskDeletion,
  }
}

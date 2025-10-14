import { useState } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useToast } from '@/app/hooks/useToast';
import type { FamilyMember, CalendarTask, RoutineGroup } from '@/app/types';

interface UseApplyToSelectionProps {
  familyMembers: FamilyMember[];
  enhancedFamilyMembers: FamilyMember[];
  selectedMemberIds: string[];
  calendarTasks: CalendarTask;
  setCalendarTasks: (tasks: CalendarTask | ((prev: CalendarTask) => CalendarTask)) => void;
  routine: any;
  routineGroups: RoutineGroup[];
  currentRoutineId: string | null;
  pendingDrop: any;
  setPendingDrop: (drop: any) => void;
  selectedTaskForEdit: any;
  setSelectedTaskForEdit: (task: any) => void;
  closeAllModals: () => void;
  showUndoToast: (id: string, type: string, taskData: any, originalData: any, undoFunction: () => void) => void;
}

export const useApplyToSelection = ({
  familyMembers,
  enhancedFamilyMembers,
  selectedMemberIds,
  calendarTasks,
  setCalendarTasks,
  routine,
  routineGroups,
  currentRoutineId,
  pendingDrop,
  setPendingDrop,
  selectedTaskForEdit,
  setSelectedTaskForEdit,
  closeAllModals,
  showUndoToast,
}: UseApplyToSelectionProps) => {
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sp = useSupabase();
  const { toast } = useToast();

  const handleApplyToSelection = async (selectedApplyToId: string) => {
    if (!pendingDrop || !selectedApplyToId) return;

    setIsApplying(true);
    setError(null);

    try {
      const originalCalendarTasks = { ...calendarTasks };
      const { type, item, targetMemberId } = pendingDrop;
      const applyToId = selectedApplyToId;
      const daySelection = pendingDrop.daySelection || [];

      // Determine target days
      const targetDays = daySelection.length > 0 ? daySelection : [pendingDrop.targetDay];

      // Check if we're editing a recurring task
      const isEditingRecurringTask = selectedTaskForEdit && 
        selectedTaskForEdit.task.recurring_template_id && 
        selectedTaskForEdit.task.recurring_template_id !== '';

      if (isEditingRecurringTask) {
        await handleRecurringTaskEdit(applyToId, targetDays);
      } else if (type === 'group' && item) {
        await handleGroupApplication(item, applyToId, targetDays);
      } else if (type === 'task' && item) {
        await handleTaskApplication(item, applyToId, targetDays);
      }

      // Clear pending drop and close modals
      setPendingDrop(null);
      closeAllModals();
      
      toast({
        title: "Success",
        description: "Tasks applied successfully",
      });

    } catch (err) {
      console.error('Error applying to selection:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: "Error",
        description: "Failed to apply tasks",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleRecurringTaskEdit = async (applyToId: string, targetDays: string[]) => {
    // Implementation for recurring task editing
    // This would contain the logic from lines 1734-1845 in the original component
    console.log('Editing recurring task:', { applyToId, targetDays });
  };

  const handleGroupApplication = async (group: any, applyToId: string, targetDays: string[]) => {
    // Implementation for group application
    // This would contain the logic from lines 1855-2006 in the original component
    console.log('Applying group:', { group, applyToId, targetDays });
  };

  const handleTaskApplication = async (task: any, applyToId: string, targetDays: string[]) => {
    // Implementation for individual task application
    // This would contain the logic from lines 2006-2238 in the original component
    console.log('Applying task:', { task, applyToId, targetDays });
  };

  return {
    handleApplyToSelection,
    isApplying,
    error,
  };
};

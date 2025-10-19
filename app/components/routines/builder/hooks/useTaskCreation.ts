import { useCallback } from 'react'
import type {
  Task,
  PendingDrop,
  DaySelection,
} from '../types/routineBuilderTypes'

interface UseTaskCreationProps {
  // State from main component
  selectedMemberIds: string[]
  pendingDrop: PendingDrop | null
  editableTaskName: string
  daySelection: DaySelection
  selectedWhoOption: string
  selectedRoutineGroup: string
  taskAssignmentMemberIds: string[]
  
  // Setters from main component
  setPendingDrop: (drop: PendingDrop | null) => void
  setEditableTaskName: (name: string) => void
  setDaySelection: (selection: DaySelection) => void
  setSelectedWhoOption: (option: string) => void
  setSelectedRoutineGroup: (group: string) => void
  setTaskAssignmentMemberIds: (ids: string[]) => void
  setShowApplyToPopup: (show: boolean) => void
  
  // Functions from other hooks
  getMemberNameById: (id: string) => string
}

export const useTaskCreation = ({
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
}: UseTaskCreationProps) => {
  
  // Handle column click to create new task
  const handleColumnClick = useCallback(async (
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
  }, [
    selectedMemberIds,
    setPendingDrop,
    setEditableTaskName,
    setDaySelection,
    setSelectedWhoOption,
    setSelectedRoutineGroup,
    setTaskAssignmentMemberIds,
    setShowApplyToPopup,
    getMemberNameById,
  ]);

  // Handle column click to create new task (wrapper for both CalendarGrid and PlannerWeek)
  const handleColumnClickWrapper = useCallback(async (
    day: string,
    bucketType?: string,
    bucketMemberId?: string,
  ) => {
    await handleColumnClick(day, bucketType, bucketMemberId);
  }, [handleColumnClick]);

  // Full handleApplyToSelection function implementation
  const handleApplyToSelection = useCallback(async (applyToId?: string) => {
    console.log("[KIDOERS-ROUTINE] 🚀 handleApplyToSelection called");
    
    // This function needs access to more state and functions that are not available in this hook
    // The implementation should be moved back to the main component
    // For now, throw an error to indicate this needs to be fixed
    throw new Error("handleApplyToSelection implementation needs to be restored in ManualRoutineBuilder component");
  }, []);

  return {
    handleColumnClick,
    handleColumnClickWrapper,
  }
}

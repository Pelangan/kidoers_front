import type { Task } from "../types/routineBuilderTypes";

// Day constants - Sunday moved to last position
export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Transform calendarTasks to weekData format for bucket system
export const transformCalendarTasksToWeekData = (
  calendarTasks: Record<string, { groups: any[]; individualTasks: Task[] }>,
  selectedMemberIds: string[],
  familyMembers: Array<{
    id: string;
    name: string;
    role: string;
    avatar_url?: string | null;
    color: string;
  }>,
  routineFilter?: 'ALL' | 'UNASSIGNED' | string,  // Filter by routine group_id
) => {
  // Fast path for single member - skip complex transformation
  if (selectedMemberIds.length === 1) {
    const selectedMemberId = selectedMemberIds[0];
    const member = familyMembers.find(m => m.id === selectedMemberId);
    
    const weekData = DAYS_OF_WEEK.map((day) => {
      // Get individual tasks
      const individualTasks = calendarTasks[day]?.individualTasks || [];
      
      // Flatten tasks from groups - tasks with group_id should also appear as individual tasks
      const groupTasks: Task[] = [];
      const groups = calendarTasks[day]?.groups || [];
      groups.forEach((group: any) => {
        if (group.tasks && Array.isArray(group.tasks)) {
          groupTasks.push(...group.tasks);
        }
      });
      
      // Combine individual tasks and group tasks
      const dayTasks = [...individualTasks, ...groupTasks];
      
      // Deduplication and filtering for single member
      const seenTaskIds = new Set<string>();
      const filteredTasks = dayTasks.filter((task) => {
        // Deduplication
        if (seenTaskIds.has(task.id)) return false;
        seenTaskIds.add(task.id);
        
        // Routine filter - filter by group_id
        if (routineFilter && routineFilter !== 'ALL') {
          if (routineFilter === 'UNASSIGNED') {
            // Show only tasks with no group_id
            if (task.group_id !== null && task.group_id !== undefined) {
              return false;
            }
          } else {
            // Show only tasks with matching group_id
            if (task.group_id !== routineFilter) {
              return false;
            }
          }
        }
        
        // Member filtering - only include tasks assigned to the selected member
        const assignedMembers =
          task.assignees?.map((a) => a.id) ||
          (task.memberId ? [task.memberId] : []);
        const assignedSelectedMembers = assignedMembers.filter((id: string) =>
          selectedMemberIds.includes(id),
        );
        
        // Include task if it's assigned to the selected member
        return assignedSelectedMembers.length > 0;
      });

      return {
        day_of_week: day,
        buckets: [{
          bucket_type: "member" as const,
          bucket_member_id: selectedMemberId,
          bucket_member_name: member?.name || "Unknown",
          tasks: filteredTasks,
        }],
      };
    });

    return weekData;
  }

  // Complex transformation for multiple members
  const weekData = DAYS_OF_WEEK.map((day) => {
    // Get individual tasks
    const individualTasks = calendarTasks[day]?.individualTasks || [];
    
    // Flatten tasks from groups - tasks with group_id should also appear as individual tasks
    const groupTasks: Task[] = [];
    const groups = calendarTasks[day]?.groups || [];
    groups.forEach((group: any) => {
      if (group.tasks && Array.isArray(group.tasks)) {
        groupTasks.push(...group.tasks);
      }
    });
    
    // Combine individual tasks and group tasks
    const dayTasks = [...individualTasks, ...groupTasks];

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
        return false;
      }
      seenTaskIds.add(task.id);
      return true;
    });

    // Categorize tasks into member buckets only
    uniqueTasks.forEach((task) => {
      // Routine filter - filter by group_id
      if (routineFilter && routineFilter !== 'ALL') {
        if (routineFilter === 'UNASSIGNED') {
          // Show only tasks with no group_id
          if (task.group_id !== null && task.group_id !== undefined) {
            return;  // Skip this task
          }
        } else {
          // Show only tasks with matching group_id
          if (task.group_id !== routineFilter) {
            return;  // Skip this task
          }
        }
      }
      
      // All tasks go to individual member buckets (no shared buckets)
      const assignedMembers =
        task.assignees?.map((a) => a.id) ||
        (task.memberId ? [task.memberId] : []);
      const assignedSelectedMembers = assignedMembers.filter((id: string) =>
        selectedMemberIds.includes(id),
      );

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
    // Use the order from familyMembers to maintain consistent ordering (not selection order)
    familyMembers.forEach((member) => {
      if (selectedMemberIds.includes(member.id)) {
        buckets.push({
          bucket_type: "member" as const,
          bucket_member_id: member.id,
          bucket_member_name: member.name,
          tasks: memberBuckets[member.id] || [],
        });
      }
    });

    return {
      day_of_week: day,
      buckets,
    };
  });

  return weekData;
};

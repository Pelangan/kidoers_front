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
export const shouldShowBuckets = (
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

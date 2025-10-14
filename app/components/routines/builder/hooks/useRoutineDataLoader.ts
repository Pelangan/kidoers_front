import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateOnboardingStep,
  getOnboardingRoutine,
  getRoutineFullData,
} from '../../../../lib/api'
import { apiService } from '../../../../lib/api'
import type {
  Task,
  TaskGroup,
  EnhancedFamilyMember,
  RecurringTemplate,
  RoutineScheduleData,
} from '../types/routineBuilderTypes'

interface UseRoutineDataLoaderProps {
  // Props from main component
  familyId: string | null
  isEditMode: boolean
  
  // State from main component
  isLoadingData: boolean
  selectedMemberIds: string[]
  
  // Setters from main component
  setBusy: (busy: boolean) => void
  setError: (error: string | null) => void
  setIsLoadingData: (loading: boolean) => void
  setRoutine: (routine: any) => void
  setRoutineName: (name: string) => void
  setHasUnsavedChanges: (hasChanges: boolean) => void
  setCurrentRoutineId: (id: string | null) => void
  setRecurringTemplates: (templates: RecurringTemplate[]) => void
  setRoutineGroups: (groups: TaskGroup[]) => void
  setEnhancedFamilyMembers: (updater: (prev: EnhancedFamilyMember[]) => EnhancedFamilyMember[]) => void
  setCalendarTasks: (tasks: Record<string, { groups: any[]; individualTasks: Task[] }>) => void
  setRoutineScheduleData: (data: RoutineScheduleData | null) => void
  
  // Functions from other hooks
  loadFamilyMembers: () => Promise<EnhancedFamilyMember[] | undefined>
  loadDayOrders: (orders: any[]) => void
}

export const useRoutineDataLoader = ({
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
}: UseRoutineDataLoaderProps) => {
  
  const router = useRouter()
  const isLoadingRef = useRef(false)
  
  // Load existing routine data using the new full-data endpoint
  const loadExistingRoutineData = useCallback(async (
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
  }, [
    setCurrentRoutineId,
    setRecurringTemplates,
    setRoutineGroups,
    setEnhancedFamilyMembers,
    setCalendarTasks,
    setRoutineScheduleData,
    selectedMemberIds,
    loadDayOrders,
  ]);

  // Load all initial data (family members and existing routine)
  const loadAllData = useCallback(async () => {
    let isMounted = true;

    const loadAllDataInternal = async () => {
      if (!familyId) {
        console.log(
          "[KIDOERS-ROUTINE] ⚠️ ManualRoutineBuilder: No familyId, redirecting to onboarding",
        );
        router.push("/onboarding"); // safety
        return;
      }

      // Prevent duplicate calls using ref instead of state
      if (isLoadingRef.current) {
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
      isLoadingRef.current = true;
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
        if (!enhanced) {
          console.error("[KIDOERS-ROUTINE] Failed to load family members");
          setError("Failed to load family members");
          return;
        }

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
          isLoadingRef.current = false;
          setBusy(false);
          setIsLoadingData(false);
        }
      }
    };

    loadAllDataInternal();

    return () => {
      console.log(
        "[KIDOERS-ROUTINE] 🧹 ManualRoutineBuilder: useEffect cleanup - setting isMounted = false",
      );
      isMounted = false;
    };
  }, [
    familyId,
    isEditMode,
    router,
    setIsLoadingData,
    setBusy,
    setError,
    setRoutine,
    setRoutineName,
    setHasUnsavedChanges,
    loadFamilyMembers,
    // loadExistingRoutineData removed from deps - it's defined in the same hook
    // isLoadingData removed from deps - using ref instead to prevent infinite loop
  ]);

  return {
    loadAllData,
    loadExistingRoutineData,
  }
}

import React from 'react'
import { TaskItem } from './TaskItem'
import { TaskGroup } from './TaskGroup'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'

interface DayColumnProps {
  day: string
  dayTasks: { groups: TaskGroupType[]; individualTasks: Task[] }
  selectedMemberIds: string[]
  draggedTask: { task: Task; day: string; memberId: string } | null
  dragOverPosition: { day: string; memberId: string; position: 'before' | 'after'; targetTaskId?: string } | null
  recurringTemplates: RecurringTemplate[]
  familyMembers: Array<{
    id: string
    name: string
    role: string
    avatar_url?: string | null
    color: string
  }>
  getMemberColors?: (color: string) => { border: string; bg: string; bgColor: string; borderColor: string }
  onColumnClick: (day: string) => void
  onTaskDragStart: (e: React.DragEvent, task: Task, day: string, memberId: string) => void
  onTaskDragEnd: () => void
  onTaskDragOver: (e: React.DragEvent, day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string) => void
  onTaskDragLeave: () => void
  onTaskDrop: (e: React.DragEvent, targetDay: string, targetMemberId: string) => void
  onTaskClick: (e: React.MouseEvent, task: Task, day: string, memberId: string) => void
  onRemoveGroup: (day: string, groupId: string) => void
  getTasksWithDayOrder: (tasks: Task[], day: string, memberId: string) => Task[]
  extractMemberIdFromId: (id: string, selectedMemberId: string) => string
  getTotalTasksForDay: (day: string, calendarTasks: any, selectedMemberId: string) => number
}

export const DayColumn: React.FC<DayColumnProps> = ({
  day,
  dayTasks,
  selectedMemberIds,
  draggedTask,
  dragOverPosition,
  recurringTemplates,
  familyMembers,
  getMemberColors,
  onColumnClick,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDrop,
  onTaskClick,
  onRemoveGroup,
  getTasksWithDayOrder,
  extractMemberIdFromId,
  getTotalTasksForDay
}) => {
  // Debug: Log when selectedMemberIds changes
  console.log('[KIDOERS-ROUTINE] 🔄 DayColumn re-rendered:', { day, selectedMemberIds });
  console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - dayTasks received:', { day, dayTasks, individualTasksCount: dayTasks?.individualTasks?.length || 0 });
  
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day)
  
  // Calculate total tasks for all selected members
  const totalDayTasks = selectedMemberIds.reduce((total, memberId) => {
    return total + getTotalTasksForDay(day, { [day]: dayTasks }, memberId)
  }, 0)
  
  // Debug: Log totalDayTasks calculation
  console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - totalDayTasks calculation:', { 
    day, 
    selectedMemberIds, 
    totalDayTasks, 
    individualTasksCount: dayTasks?.individualTasks?.length || 0 
  });

  return (
    <div
      key={day}
      className="border-r border-gray-200 last:border-r-0 min-h-[900px] flex flex-col cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onColumnClick(day)}
    >
      {/* Day Header */}
      <div className="text-center p-3 bg-gray-50">
        <div className="text-sm font-semibold text-gray-700">{dayNames[dayIndex]}</div>
      </div>

      {/* Separator Line */}
      <div className="border-b border-gray-200"></div>

      {/* Tasks Area */}
      <div className="flex-1 p-3 bg-white space-y-2">
        {totalDayTasks > 0 && (
          <>
            {/* Groups - Filtered by Selected Members */}
            {dayTasks.groups
              .filter((group: TaskGroupType) => {
                // Extract member ID from group ID (format: templateId-memberId-day-timestamp)
                const groupMemberId = extractMemberIdFromId(group.id, selectedMemberIds[0])
                return selectedMemberIds.includes(groupMemberId)
              })
              .map((group: TaskGroupType) => (
                <TaskGroup
                  key={group.id}
                  group={group}
                  day={day}
                  memberId={extractMemberIdFromId(group.id, selectedMemberIds[0])}
                  draggedTask={draggedTask}
                  recurringTemplates={recurringTemplates}
                  onDragStart={onTaskDragStart}
                  onDragEnd={onTaskDragEnd}
                  onRemoveGroup={onRemoveGroup}
                />
              ))}

            {/* Individual Tasks - Filtered by Selected Members */}
            {(() => {
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - Processing day:', day);
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - dayTasks:', dayTasks);
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - dayTasks.individualTasks:', dayTasks.individualTasks);
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - selectedMemberIds:', selectedMemberIds);
              
              // Check if individualTasks exists and has length
              if (!dayTasks.individualTasks || dayTasks.individualTasks.length === 0) {
                console.log('[KIDOERS-ROUTINE] ⚠️ No individual tasks to process for day:', day);
                return [];
              }
              
              const filteredTasks = dayTasks.individualTasks.filter((task: Task) => {
                // Debug: Log task structure to understand why multi-member filtering isn't working
                console.log('[KIDOERS-ROUTINE] 🔍 Task structure debug:', {
                  taskId: task.id,
                  taskName: task.name,
                  memberCount: task.member_count,
                  hasAssignees: !!task.assignees,
                  assigneesLength: task.assignees?.length,
                  taskMemberId: task.memberId,
                  selectedMemberIds
                });
                
                // For multi-member tasks, show to all assigned members
                if (task.member_count && task.member_count > 1 && task.assignees) {
                  const isAssignedToAnySelectedMember = task.assignees.some(assignee => 
                    selectedMemberIds.includes(assignee.id)
                  );
                  console.log('[KIDOERS-ROUTINE] Multi-member task filtering:', { 
                    taskId: task.id, 
                    taskName: task.name, 
                    memberCount: task.member_count,
                    isAssignedToAnySelectedMember,
                    selectedMemberIds
                  });
                  return isAssignedToAnySelectedMember;
                }
                
                // For single-member tasks, filter by selected member IDs
                const matches = task.memberId && selectedMemberIds.includes(task.memberId);
                console.log('[KIDOERS-ROUTINE] Single-member task filtering:', { 
                  taskId: task.id, 
                  taskName: task.name, 
                  taskMemberId: task.memberId, 
                  selectedMemberIds, 
                  matches
                });
                return matches;
              });
              
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - filteredTasks:', filteredTasks);
              
              return getTasksWithDayOrder(filteredTasks, day, selectedMemberIds[0]);
            })()
              .map((task: Task, taskIndex: number, taskArray: Task[]) => (
                <div key={`${task.id}-${task.memberId || selectedMemberIds[0]}-${day}`}>
                  {/* Drop zone before this task */}
                  <div
                    className={`h-1 transition-colors ${
                      dragOverPosition?.day === day && 
                        dragOverPosition?.memberId === (task.memberId || selectedMemberIds[0]) &&
                      dragOverPosition?.position === 'before' && 
                      dragOverPosition?.targetTaskId === task.id
                        ? 'bg-blue-500' 
                        : 'hover:bg-blue-200'
                    }`}
                    onDragOver={(e) => onTaskDragOver(e, day, task.memberId || selectedMemberIds[0], 'before', task.id)}
                    onDragLeave={onTaskDragLeave}
                    onDrop={(e) => onTaskDrop(e, day, task.memberId || selectedMemberIds[0])}
                  />
                  
                  <TaskItem
                    task={task}
                    day={day}
                    memberId={task.memberId || selectedMemberIds[0]}
                    isDragging={draggedTask?.task.id === task.id}
                    recurringTemplates={recurringTemplates}
                    familyMembers={familyMembers}
                    getMemberColors={getMemberColors}
                    onDragStart={onTaskDragStart}
                    onDragEnd={onTaskDragEnd}
                    onClick={onTaskClick}
                  />
                  
                  {/* Drop zone after this task */}
                  {taskIndex === taskArray.length - 1 && (
                    <div
                      className={`h-1 transition-colors ${
                        dragOverPosition?.day === day && 
                        dragOverPosition?.memberId === task.memberId && 
                        dragOverPosition?.position === 'after' && 
                        dragOverPosition?.targetTaskId === task.id
                          ? 'bg-blue-500' 
                          : 'hover:bg-blue-200'
                      }`}
                      onDragOver={(e) => onTaskDragOver(e, day, task.memberId || selectedMemberIds[0], 'after', task.id)}
                      onDragLeave={onTaskDragLeave}
                      onDrop={(e) => onTaskDrop(e, day, task.memberId || selectedMemberIds[0])}
                    />
                  )}
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  )
}

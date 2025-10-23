import React from 'react'
import { TaskItem } from './TaskItem'
import { TaskGroup } from './TaskGroup'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'

interface DayColumnProps {
  day: string
  dayTasks: { groups: TaskGroupType[]; individualTasks: Task[] }
  selectedMemberIds: string[]
  draggedTask: { task: Task; day: string; memberId: string; isCopyOperation?: boolean } | null
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
  onSeriesBadgeClick?: (seriesId: string, day: string) => void // Handler for series badge click
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
  getTotalTasksForDay,
  onSeriesBadgeClick,
}) => {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day)
  
  // Calculate total tasks for all selected members
  const totalDayTasks = selectedMemberIds.reduce((total, memberId) => {
    return total + getTotalTasksForDay(day, { [day]: dayTasks }, memberId)
  }, 0)

  // Check if column is being dragged over
  const isColumnDraggedOver = draggedTask && dragOverPosition?.day === day
  const isColumnEmpty = totalDayTasks === 0

  return (
    <div
      key={day}
      className={`border-r border-gray-200 last:border-r-0 min-h-[900px] flex flex-col cursor-pointer transition-all ${
        isColumnDraggedOver 
          ? 'bg-blue-50 border-blue-300 border-2' 
          : 'hover:bg-gray-50'
      }`}
      onClick={() => onColumnClick(day)}
    >
      {/* Tasks Area */}
      <div className="flex-1 p-3 bg-white space-y-1 relative">
        {/* Empty Column Drop Zone */}
        {isColumnEmpty && draggedTask && (
          <div
            className={`absolute inset-0 transition-all ${
              isColumnDraggedOver 
                ? 'bg-blue-100 border-2 border-dashed border-blue-400' 
                : 'bg-gray-50 border-2 border-dashed border-gray-300'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTaskDragOver(e, day, selectedMemberIds[0], 'after')
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTaskDragLeave()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTaskDrop(e, day, selectedMemberIds[0])
            }}
          />
        )}

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
              // Check if individualTasks exists and has length
              if (!dayTasks.individualTasks || dayTasks.individualTasks.length === 0) {
                return [];
              }
              
              const filteredTasks = dayTasks.individualTasks.filter((task: Task) => {
                // For multi-member tasks, show to all assigned members
                if (task.member_count && task.member_count > 1 && task.assignees) {
                  const isAssignedToAnySelectedMember = task.assignees.some(assignee => 
                    selectedMemberIds.includes(assignee.id)
                  );
                  return isAssignedToAnySelectedMember;
                }
                
                // For single-member tasks, filter by selected member IDs
                const matches = task.memberId && selectedMemberIds.includes(task.memberId);
                return matches;
              });
              
              return getTasksWithDayOrder(filteredTasks, day, selectedMemberIds[0]);
            })()
              .map((task: Task, taskIndex: number, taskArray: Task[]) => (
                <div key={`${task.id}-${task.memberId || selectedMemberIds[0]}-${day}`}>
                  {/* Drop zone before this task */}
                  <div
                    className={`rounded transition-all duration-200 ease-in-out ${
                      draggedTask && dragOverPosition?.day === day && 
                        dragOverPosition?.memberId === (task.memberId || selectedMemberIds[0]) &&
                        dragOverPosition?.position === 'before' && 
                        dragOverPosition?.targetTaskId === task.id
                          ? 'max-h-2 bg-blue-400 border-2 border-dashed border-blue-600' 
                          : draggedTask 
                            ? 'max-h-2 hover:bg-blue-100 hover:border-2 hover:border-dashed hover:border-blue-300'
                            : 'max-h-0'
                    }`}
                    style={{
                      overflow: 'hidden',
                      height: draggedTask ? '8px' : '0px'
                    }}
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
                    allDayTasks={dayTasks.individualTasks}
                    onSeriesBadgeClick={onSeriesBadgeClick}
                    isCopyOperation={draggedTask?.isCopyOperation || false}
                  />
                  
                  {/* Drop zone after this task */}
                  {taskIndex === taskArray.length - 1 && (
                    <div
                      className={`rounded transition-all duration-200 ease-in-out ${
                        draggedTask && dragOverPosition?.day === day && 
                        dragOverPosition?.memberId === task.memberId && 
                        dragOverPosition?.position === 'after' && 
                        dragOverPosition?.targetTaskId === task.id
                          ? 'max-h-2 bg-blue-400 border-2 border-dashed border-blue-600' 
                          : draggedTask 
                            ? 'max-h-2 hover:bg-blue-100 hover:border-2 hover:border-dashed hover:border-blue-300'
                            : 'max-h-0'
                      }`}
                      style={{
                        overflow: 'hidden',
                        height: draggedTask ? '8px' : '0px'
                      }}
                      onDragOver={(e) => onTaskDragOver(e, day, task.memberId || selectedMemberIds[0], 'after', task.id)}
                      onDragLeave={onTaskDragLeave}
                      onDrop={(e) => onTaskDrop(e, day, task.memberId || selectedMemberIds[0])}
                    />
                  )}
                </div>
              ))}
          </>
        )}
        
        {/* Bottom drop zone for non-empty columns - makes it easier to add tasks at the end */}
        {!isColumnEmpty && draggedTask && (
          <div
            className={`mt-2 h-16 rounded transition-all ${
              isColumnDraggedOver && !dragOverPosition?.targetTaskId
                ? 'bg-blue-100 border-2 border-dashed border-blue-400' 
                : 'border-2 border-dashed border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTaskDragOver(e, day, selectedMemberIds[0], 'after')
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTaskDragLeave()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTaskDrop(e, day, selectedMemberIds[0])
            }}
          />
        )}
      </div>
    </div>
  )
}

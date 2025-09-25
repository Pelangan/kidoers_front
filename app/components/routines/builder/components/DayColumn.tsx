import React from 'react'
import { TaskItem } from './TaskItem'
import { TaskGroup } from './TaskGroup'
import type { Task, TaskGroup as TaskGroupType } from '../types/routineBuilderTypes'

interface DayColumnProps {
  day: string
  dayTasks: { groups: TaskGroupType[]; individualTasks: Task[] }
  selectedMemberId: string
  draggedTask: { task: Task; day: string; memberId: string } | null
  dragOverPosition: { day: string; memberId: string; position: 'before' | 'after'; targetTaskId?: string } | null
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
  selectedMemberId,
  draggedTask,
  dragOverPosition,
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
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day)
  const totalDayTasks = getTotalTasksForDay(day, { [day]: dayTasks }, selectedMemberId)

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
            {/* Groups - Filtered by Selected Member */}
            {dayTasks.groups
              .filter((group: TaskGroupType) => {
                // Extract member ID from group ID (format: templateId-memberId-day-timestamp)
                const groupMemberId = extractMemberIdFromId(group.id, selectedMemberId)
                return groupMemberId === selectedMemberId
              })
              .map((group: TaskGroupType) => (
                <TaskGroup
                  key={group.id}
                  group={group}
                  day={day}
                  memberId={selectedMemberId}
                  draggedTask={draggedTask}
                  onDragStart={onTaskDragStart}
                  onDragEnd={onTaskDragEnd}
                  onRemoveGroup={onRemoveGroup}
                />
              ))}

            {/* Individual Tasks - Filtered by Selected Member */}
            {(() => {
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - Processing day:', day);
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - dayTasks.individualTasks:', dayTasks.individualTasks);
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - selectedMemberId:', selectedMemberId);
              
              const filteredTasks = dayTasks.individualTasks.filter((task: Task) => {
                // Filter tasks by selected member ID
                const matches = task.memberId === selectedMemberId
                console.log('[KIDOERS-ROUTINE] Filtering task:', { 
                  taskId: task.id, 
                  taskName: task.name, 
                  taskMemberId: task.memberId, 
                  selectedMemberId, 
                  matches
                })
                return matches
              });
              
              console.log('[KIDOERS-ROUTINE] 🔍 DayColumn - filteredTasks:', filteredTasks);
              
              return getTasksWithDayOrder(filteredTasks, day, selectedMemberId);
            })()
              .map((task: Task, taskIndex: number, taskArray: Task[]) => (
                <div key={task.id}>
                  {/* Drop zone before this task */}
                  <div
                    className={`h-1 transition-colors ${
                      dragOverPosition?.day === day && 
                      dragOverPosition?.memberId === selectedMemberId && 
                      dragOverPosition?.position === 'before' && 
                      dragOverPosition?.targetTaskId === task.id
                        ? 'bg-blue-500' 
                        : 'hover:bg-blue-200'
                    }`}
                    onDragOver={(e) => onTaskDragOver(e, day, selectedMemberId, 'before', task.id)}
                    onDragLeave={onTaskDragLeave}
                    onDrop={(e) => onTaskDrop(e, day, selectedMemberId)}
                  />
                  
                  <TaskItem
                    task={task}
                    day={day}
                    memberId={selectedMemberId}
                    isDragging={draggedTask?.task.id === task.id}
                    onDragStart={onTaskDragStart}
                    onDragEnd={onTaskDragEnd}
                    onClick={onTaskClick}
                  />
                  
                  {/* Drop zone after this task */}
                  {taskIndex === taskArray.length - 1 && (
                    <div
                      className={`h-1 transition-colors ${
                        dragOverPosition?.day === day && 
                        dragOverPosition?.memberId === selectedMemberId && 
                        dragOverPosition?.position === 'after' && 
                        dragOverPosition?.targetTaskId === task.id
                          ? 'bg-blue-500' 
                          : 'hover:bg-blue-200'
                      }`}
                      onDragOver={(e) => onTaskDragOver(e, day, selectedMemberId, 'after', task.id)}
                      onDragLeave={onTaskDragLeave}
                      onDrop={(e) => onTaskDrop(e, day, selectedMemberId)}
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

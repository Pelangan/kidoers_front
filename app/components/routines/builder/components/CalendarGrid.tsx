import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { DayColumn } from './DayColumn'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'

interface CalendarGridProps {
  calendarTasks: Record<string, { groups: TaskGroupType[]; individualTasks: Task[] }>
  selectedMemberId: string
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

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarTasks,
  selectedMemberId,
  draggedTask,
  dragOverPosition,
  recurringTemplates,
  familyMembers,
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
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 gap-0 min-h-[900px]">
          {days.map((day) => (
            <DayColumn
              key={day}
              day={day}
              dayTasks={calendarTasks[day]}
              selectedMemberId={selectedMemberId}
              draggedTask={draggedTask}
              dragOverPosition={dragOverPosition}
              recurringTemplates={recurringTemplates}
              familyMembers={familyMembers}
              onColumnClick={onColumnClick}
              onTaskDragStart={onTaskDragStart}
              onTaskDragEnd={onTaskDragEnd}
              onTaskDragOver={onTaskDragOver}
              onTaskDragLeave={onTaskDragLeave}
              onTaskDrop={onTaskDrop}
              onTaskClick={onTaskClick}
              onRemoveGroup={onRemoveGroup}
              getTasksWithDayOrder={getTasksWithDayOrder}
              extractMemberIdFromId={extractMemberIdFromId}
              getTotalTasksForDay={getTotalTasksForDay}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { DayColumn } from './DayColumn'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'

interface CalendarGridProps {
  calendarTasks: Record<string, { groups: TaskGroupType[]; individualTasks: Task[] }>
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

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarTasks,
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
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <Card className="bg-white border-t border-r border-b border-gray-200">
      <CardContent className="p-0">
        {/* Day Headers */}
        <div className="flex border-b border-gray-200">
          {/* Empty cell for avatars */}
          <div className="p-2 bg-gray-50 border-r border-gray-200 w-16 flex-shrink-0"></div>
          {days.map((day) => (
            <div 
              key={day}
              className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0 text-center font-medium text-gray-700 flex-1"
            >
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </div>
          ))}
        </div>

        {/* Avatar and Day Columns Row */}
        <div className="flex min-h-[900px]">
          {/* Avatar Column */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200">
            <div className="p-2 flex items-center justify-center">
              {(() => {
                const member = familyMembers.find(m => m.id === selectedMemberIds[0])
                if (member?.avatar_url) {
                  return (
                    <img 
                      src={member.avatar_url} 
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )
                } else {
                  return (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: member?.color || '#6b7280' }}
                    >
                      {member?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )
                }
              })()}
            </div>
          </div>

          {/* Day Columns */}
          <div className="flex-1 grid grid-cols-7 gap-0">
            {days.map((day) => (
              <DayColumn
                key={day}
                day={day}
                dayTasks={calendarTasks[day]}
                selectedMemberIds={selectedMemberIds}
                draggedTask={draggedTask}
                dragOverPosition={dragOverPosition}
                recurringTemplates={recurringTemplates}
                familyMembers={familyMembers}
                getMemberColors={getMemberColors}
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
        </div>
      </CardContent>
    </Card>
  )
}

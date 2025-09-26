import React from 'react'
import { Move, Folder } from 'lucide-react'
import type { Task, RecurringTemplate } from '../types/routineBuilderTypes'
import { getTaskDisplayFrequency } from '../utils/taskUtils'
import { MultiMemberBadge } from './MultiMemberBadge'

interface TaskItemProps {
  task: Task
  day: string
  memberId: string
  isDragging: boolean
  recurringTemplates: RecurringTemplate[]
  onDragStart: (e: React.DragEvent, task: Task, day: string, memberId: string) => void
  onDragEnd: () => void
  onClick: (e: React.MouseEvent, task: Task, day: string, memberId: string) => void
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  day,
  memberId,
  isDragging,
  recurringTemplates,
  onDragStart,
  onDragEnd,
  onClick
}) => {
  return (
    <div 
      className={`relative flex items-center space-x-1 p-2 rounded border border-gray-200 ${
        task.from_group 
          ? 'bg-purple-50 border-l-4 border-purple-500' 
          : 'bg-green-50 border-l-4 border-green-500'
      } cursor-pointer hover:shadow-sm transition-shadow ${
        isDragging ? 'opacity-50 task-dragging' : ''
      }`}
      draggable={true}
      onDragStart={(e) => onDragStart(e, task, day, memberId)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e, task, day, memberId)
      }}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-900">{task.name}</div>
          <MultiMemberBadge 
            memberCount={task.member_count || 1}
            assignees={task.assignees || []}
          />
        </div>
        <div className="text-xs text-gray-500">{getTaskDisplayFrequency(task, recurringTemplates)}</div>
        {task.from_group && (
          <div className="text-xs flex items-center space-x-1 text-purple-600">
            <Folder className="w-3 h-3" />
            <span>from {task.from_group.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

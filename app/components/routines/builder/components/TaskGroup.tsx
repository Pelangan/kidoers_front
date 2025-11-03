import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Move, Folder } from 'lucide-react'
import type { TaskGroup as TaskGroupType, Task, RecurringTemplate } from '../types/routineBuilderTypes'
import { getTaskDisplayFrequency } from '../utils/taskUtils'

interface TaskGroupProps {
  group: TaskGroupType
  day: string
  memberId: string
  draggedTask: { task: Task; day: string; memberId: string } | null
  recurringTemplates: RecurringTemplate[]
  onDragStart: (e: React.DragEvent, task: Task, day: string, memberId: string) => void
  onDragEnd: () => void
  onRemoveGroup: (day: string, groupId: string) => void
}

export const TaskGroup: React.FC<TaskGroupProps> = ({
  group,
  day,
  memberId,
  draggedTask,
  recurringTemplates,
  onDragStart,
  onDragEnd,
  onRemoveGroup
}) => {
  return (
    <div key={group.id} className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Folder className="w-3 h-3 text-purple-600" />
          <span className="font-medium text-xs text-gray-900">{group.name}</span>
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
            group
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemoveGroup(day, group.id)}
          className="text-red-500 hover:text-red-700 h-4 w-4 p-0"
        >
          <Trash2 className="w-2 h-2" />
        </Button>
      </div>
      
      {group.tasks.map((task: Task) => {
        // For multi-day tasks, only mark as dragged if it's the same day and member
        const isDragged = draggedTask 
          ? (draggedTask.task.id === task.id && draggedTask.day === day && draggedTask.memberId === memberId)
          : false
        
        return (
        <div 
          key={`${task.id}-${memberId}-${day}`} 
          className={`ml-3 relative flex items-center space-x-1 p-2 bg-purple-50 rounded border-l-4 border-purple-500 border border-gray-200 cursor-pointer ${
            isDragged ? 'opacity-50 task-dragging' : ''
          }`}
          draggable={true}
          onDragStart={(e) => onDragStart(e, task, day, memberId)}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-900">{task.name}</div>
            <div className="text-xs text-purple-600">from {group.name}</div>
          </div>
        </div>
        )
      })}
    </div>
  )
}

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Move, Folder } from 'lucide-react'
import type { TaskGroup as TaskGroupType, Task } from '../types/routineBuilderTypes'

interface TaskGroupProps {
  group: TaskGroupType
  day: string
  memberId: string
  draggedTask: { task: Task; day: string; memberId: string } | null
  onDragStart: (e: React.DragEvent, task: Task, day: string, memberId: string) => void
  onDragEnd: () => void
  onRemoveGroup: (day: string, groupId: string) => void
}

export const TaskGroup: React.FC<TaskGroupProps> = ({
  group,
  day,
  memberId,
  draggedTask,
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
      
      {group.tasks.map((task: Task) => (
        <div 
          key={task.id} 
          className={`ml-3 flex items-center space-x-1 p-1 bg-purple-50 rounded border-l-4 border-purple-500 border border-gray-200 cursor-pointer ${
            draggedTask?.task.id === task.id ? 'opacity-50 task-dragging' : ''
          }`}
          draggable={true}
          onDragStart={(e) => onDragStart(e, task, day, memberId)}
          onDragEnd={onDragEnd}
        >
          {/* Always show drag handle in routine builder */}
          <div className="w-3 h-3 flex items-center justify-center text-gray-400">
            <Move className="w-2 h-2" />
          </div>
          
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-900">{task.name}</div>
            <div className="text-xs text-purple-600">from {group.name}</div>
          </div>
          <div className="text-xs text-gray-500">{task.points}pts</div>
        </div>
      ))}
    </div>
  )
}

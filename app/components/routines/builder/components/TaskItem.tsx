import React from 'react'
import { Move, Folder } from 'lucide-react'
import type { Task } from '../types/routineBuilderTypes'

interface TaskItemProps {
  task: Task
  day: string
  memberId: string
  isDragging: boolean
  onDragStart: (e: React.DragEvent, task: Task, day: string, memberId: string) => void
  onDragEnd: () => void
  onClick: (e: React.MouseEvent, task: Task, day: string, memberId: string) => void
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  day,
  memberId,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick
}) => {
  return (
    <div 
      className={`flex items-center space-x-1 p-1 rounded border border-gray-200 ${
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
      {/* Always show drag handle in routine builder */}
      <div className="w-3 h-3 flex items-center justify-center text-gray-400">
        <Move className="w-2 h-2" />
      </div>
      
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-900">{task.name}</div>
        <div className={`text-xs flex items-center space-x-1 ${
          task.from_group ? 'text-purple-600' : 'text-green-600'
        }`}>
          {task.from_group ? (
            <>
              <Folder className="w-3 h-3" />
              <span>from {task.from_group.name}</span>
            </>
          ) : (
            <span>individual task</span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-500">{task.points}pts</div>
    </div>
  )
}

"use client"

import { Check, Trash2 } from "lucide-react"
import { Button } from "../../../components/ui/button"

interface Task {
  id: string
  name: string
  description?: string
  points?: number
  time_of_day?: string
  completed?: boolean
  status?: 'pending' | 'completed' | 'overdue' | 'skipped'
  group_id?: string
}

interface FamilyMember {
  id: string
  name: string
  color: string
  borderColor?: string
  taskBgColor?: string
}

interface TaskItemProps {
  task: Task
  member: FamilyMember
  mode: 'routine-builder' | 'chores-view'
  onClick?: () => void
  onRemove?: () => void
}

export default function TaskItem({
  task,
  member,
  mode,
  onClick,
  onRemove
}: TaskItemProps) {
  const getTimeIcon = (timeOfDay?: string) => {
    if (!timeOfDay) return '⏰'
    switch (timeOfDay) {
      case 'morning':
        return '🌅'
      case 'afternoon':
        return '☀️'
      case 'evening':
        return '🌙'
      case 'night':
        return '🌃'
      default:
        return '⏰'
    }
  }

  const isCompleted = task.completed || task.status === 'completed'

  if (mode === 'routine-builder') {
    return (
      <div className={`ml-4 flex items-center space-x-2 p-1.5 ${member.taskBgColor || 'bg-gray-50'} rounded-lg border border-gray-200`}>
        <div className="w-4 h-4 rounded border border-gray-400 flex items-center justify-center bg-white">
          {isCompleted && <Check className="w-3 h-3 text-green-600" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{task.name}</div>
          {task.points && (
            <div className="text-xs text-gray-500">{task.points} pts</div>
          )}
        </div>
        {onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    )
  }

  // Chores view mode
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border ${member.taskBgColor || 'bg-white'} hover:shadow-sm transition-all cursor-pointer`}
      onClick={onClick}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          isCompleted 
            ? "bg-green-500 border-green-500" 
            : "border-gray-300"
        }`}
      >
        {isCompleted && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            isCompleted ? "line-through opacity-60" : ""
          }`}>
            {task.name}
          </span>
          {task.time_of_day && (
            <span className="text-xs text-gray-500">
              {getTimeIcon(task.time_of_day)}
            </span>
          )}
        </div>
        {task.points && (
          <div className="text-xs text-gray-500">
            {task.points} pts
          </div>
        )}
      </div>
    </div>
  )
}

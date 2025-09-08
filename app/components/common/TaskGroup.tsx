"use client"

import { Folder, Trash2 } from "lucide-react"
import { Button } from "../../../components/ui/button"
import TaskItem from "./TaskItem"

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

interface TaskGroup {
  id: string
  name: string
  tasks: Task[]
}

interface FamilyMember {
  id: string
  name: string
  color: string
  borderColor?: string
  taskBgColor?: string
}

interface TaskGroupProps {
  group: TaskGroup
  member: FamilyMember
  mode: 'routine-builder' | 'chores-view'
  onTaskClick?: (taskId: string) => void
  onGroupRemove?: () => void
  onTaskRemove?: (taskId: string) => void
}

export default function TaskGroup({
  group,
  member,
  mode,
  onTaskClick,
  onGroupRemove,
  onTaskRemove
}: TaskGroupProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Folder className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-sm text-gray-900">{group.name}</span>
        </div>
        {mode === 'routine-builder' && onGroupRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onGroupRemove}
            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <div className="space-y-1 ml-6">
        {group.tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            member={member}
            mode={mode}
            onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            onRemove={onTaskRemove ? () => onTaskRemove(task.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

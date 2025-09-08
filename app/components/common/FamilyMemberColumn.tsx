"use client"

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card"
import { User, Folder, ListTodo } from "lucide-react"
import TaskGroup from "./TaskGroup"
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

interface FamilyMemberColumnProps {
  member: FamilyMember
  groups: TaskGroup[]
  individualTasks: Task[]
  totalTasks: number
  completedTasks: number
  progress: number
  mode: 'routine-builder' | 'chores-view'
  onTaskClick?: (taskId: string) => void
  onGroupRemove?: (memberId: string, groupId: string) => void
  onTaskRemove?: (memberId: string, taskId: string) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>, memberId: string) => void
  showProgress?: boolean
  emptyStateMessage?: {
    title: string
    subtitle: string
  }
}

export default function FamilyMemberColumn({
  member,
  groups,
  individualTasks,
  totalTasks,
  completedTasks,
  progress,
  mode,
  onTaskClick,
  onGroupRemove,
  onTaskRemove,
  onDragOver,
  onDrop,
  showProgress = true,
  emptyStateMessage
}: FamilyMemberColumnProps) {
  const defaultEmptyState = {
    title: mode === 'routine-builder' ? 'Drop tasks here' : 'No tasks today',
    subtitle: mode === 'routine-builder' ? 'Drag from the library panel' : 'Tasks will appear here when scheduled'
  }

  const emptyState = emptyStateMessage || defaultEmptyState

  return (
    <Card 
      className={`${member.color} ${member.borderColor || ''} border-2 hover:shadow-lg transition-all min-h-64`}
      onDragOver={onDragOver}
      onDrop={onDrop ? (e) => onDrop(e, member.id) : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-gray-900 flex items-center justify-between">
          {member.name}
          {showProgress && totalTasks > 0 && (
            <div className="text-sm text-gray-500">
              {completedTasks}/{totalTasks}
            </div>
          )}
        </CardTitle>
        
        {/* Progress Bar */}
        {showProgress && totalTasks > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-1">
        {totalTasks === 0 ? (
          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyState.title}</p>
            <p className="text-xs">{emptyState.subtitle}</p>
          </div>
        ) : (
          <>
            {/* Groups */}
            {groups.map((group) => (
              <TaskGroup
                key={group.id}
                group={group}
                member={member}
                mode={mode}
                onTaskClick={onTaskClick ? (taskId: string) => onTaskClick(taskId) : undefined}
                onGroupRemove={onGroupRemove ? () => onGroupRemove(member.id, group.id) : undefined}
                onTaskRemove={onTaskRemove ? (taskId) => onTaskRemove(member.id, taskId) : undefined}
              />
            ))}

            {/* Individual Tasks */}
            {individualTasks.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <ListTodo className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm text-gray-900">Individual Tasks</span>
                </div>
                <div className="space-y-1 ml-6">
                  {individualTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      member={member}
                      mode={mode}
                      onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
                      onRemove={onTaskRemove ? () => onTaskRemove(member.id, task.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

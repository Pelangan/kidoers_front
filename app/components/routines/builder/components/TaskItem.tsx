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
  familyMembers?: Array<{
    id: string
    name: string
    role: string
    avatar_url?: string | null
    color: string
  }>
  getMemberColors?: (color: string) => { border: string; bg: string; bgColor: string; borderColor: string }
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
  familyMembers = [],
  getMemberColors,
  onDragStart,
  onDragEnd,
  onClick
}) => {
  // Create assignees data for single-member tasks if not available
  const getAssignees = () => {
    if (task.assignees && task.assignees.length > 0) {
      return task.assignees
    }
    
    // For single-member tasks, create assignee data from memberId
    const member = familyMembers.find(m => m.id === memberId)
    if (member) {
      return [{
        id: member.id,
        name: member.name,
        role: member.role,
        avatar_url: member.avatar_url || null,
        color: member.color
      }]
    }
    
    return []
  }

  const assignees = getAssignees()

  // Get member color for task styling
  const getTaskColor = () => {
    if (task.from_group) {
      // Group tasks use purple color
      return {
        bg: 'bg-purple-50',
        border: 'border-l-4 border-purple-500',
        text: 'text-purple-600'
      }
    }

    // For multi-member tasks, use a neutral gray color scheme
    if (task.assignees && task.assignees.length > 1) {
      console.log('[KIDOERS-ROUTINE] 🎨 Multi-member task color:', { 
        taskName: task.name, 
        assigneesCount: task.assignees.length
      })
      return {
        bg: 'bg-white',
        border: `border-l-4`,
        borderColor: '#6B7280', // Gray-500
        text: 'text-gray-900'
      }
    }

    // For single-member tasks, use the member's color
    const member = familyMembers.find(m => m.id === memberId)
    if (member && getMemberColors) {
      const colors = getMemberColors(member.color)
      console.log('[KIDOERS-ROUTINE] 🎨 Single-member task color:', { 
        taskName: task.name, 
        memberName: member.name, 
        memberColor: member.color, 
        borderColor: colors.borderColor 
      })
      return {
        bg: colors.bg,
        border: `border-l-4`,
        borderColor: colors.borderColor,
        text: 'text-gray-900'
      }
    }

    // Fallback to green if no color found
    console.log('[KIDOERS-ROUTINE] 🎨 Fallback color used for task:', task.name)
    return {
      bg: 'bg-green-50',
      border: 'border-l-4 border-green-500',
      text: 'text-gray-900'
    }
  }

  const taskColor = getTaskColor()

  return (
    <div 
      className={`relative flex items-center space-x-1 p-2 rounded border border-gray-200 ${taskColor.bg} ${taskColor.border} cursor-pointer hover:shadow-sm transition-shadow ${
        isDragging ? 'opacity-50 task-dragging' : ''
      }`}
      style={{
        borderLeftColor: taskColor.borderColor || undefined
      }}
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
          <div className={`text-xs font-medium ${taskColor.text}`}>{task.name}</div>
          <MultiMemberBadge 
            memberCount={task.member_count || assignees.length || 1}
            assignees={assignees}
          />
        </div>
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

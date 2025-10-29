import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Move, Folder } from 'lucide-react'
import type { Task, RecurringTemplate } from '../types/routineBuilderTypes'
import { getTaskDisplayFrequency } from '../utils/taskUtils'
import { MultiMemberBadge } from './MultiMemberBadge'
import { useState, useRef } from 'react'

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
  onClick: (e: React.MouseEvent, task: Task, day: string, memberId: string) => void
  // New props for series badge functionality
  allDayTasks?: Task[] // All tasks for this day to count series
  onSeriesBadgeClick?: (seriesId: string, day: string) => void // Handler for series badge click
  // New prop for copy operation indication
  isCopyOperation?: boolean
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  day,
  memberId,
  isDragging,
  recurringTemplates,
  familyMembers = [],
  getMemberColors,
  onClick,
  allDayTasks = [],
  onSeriesBadgeClick,
  isCopyOperation = false
}) => {
  // @dnd-kit draggable setup
  const { attributes, listeners, setNodeRef, transform, isDragging: isDndDragging } = useDraggable({
    id: task.id,
    data: {
      task,
      day,
      memberId,
      isCopyOperation,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDndDragging ? 10000 : 'auto', // Much higher z-index to render above other rows
    opacity: isDndDragging ? 0.8 : 1,
  }
  
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
      return {
        bg: colors.bg,
        border: `border-l-4`,
        borderColor: colors.borderColor,
        text: 'text-gray-900'
      }
    }

    // Fallback to green if no color found
    return {
      bg: 'bg-green-50',
      border: 'border-l-4 border-green-500',
      text: 'text-gray-900'
    }
  }

  const taskColor = getTaskColor()

  // Calculate series badge information - removed series_id support
  const getSeriesBadgeInfo = (): { seriesId: string; count: number } | null => {
    // Series functionality removed - all tasks now use recurring templates
    return null
  }

  const seriesBadgeInfo = getSeriesBadgeInfo()

  return (
    <div 
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: taskColor.borderColor || undefined,
      }}
      className={`relative flex items-center space-x-1 p-3 rounded ${taskColor.bg} ${taskColor.border} ${
        isDndDragging ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-pointer'
      } hover:shadow-lg hover:bg-opacity-90`}
    >
      {/* Copy operation indicator */}
      {isCopyOperation && (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-1 py-0.5 rounded shadow-lg z-10">
          Copy
        </div>
      )}
      
      
      <div 
        className="flex-1"
        onClick={(e) => {
          e.stopPropagation()
          onClick(e, task, day, memberId)
        }}
      >
        <div className="flex items-center justify-between">
          <div className={`text-sm font-medium ${taskColor.text}`}>{task.name}</div>
          <div className="flex items-center space-x-1">
            {/* Only show avatar badge for multi-member tasks */}
            {(task.member_count && task.member_count > 1) && (
              <MultiMemberBadge 
                memberCount={task.member_count || assignees.length || 1}
                assignees={assignees}
              />
            )}
            
            {/* Series badge for clone tasks */}
            {seriesBadgeInfo && seriesBadgeInfo.seriesId && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (onSeriesBadgeClick) {
                    onSeriesBadgeClick(seriesBadgeInfo.seriesId, day)
                  }
                }}
                className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors"
                title={`${seriesBadgeInfo.count} other task(s) in this series`}
              >
                +{seriesBadgeInfo.count}
              </button>
            )}
          </div>
        </div>
        {task.from_group && (
          <div className="text-xs flex items-center space-x-1 text-purple-600">
            <Folder className="w-3 h-3" />
            <span>from {task.from_group.name}</span>
          </div>
        )}
      </div>
      
      {/* Drag handle - grip icon on the right */}
      <div 
        {...attributes}
        {...listeners}
        className="flex-shrink-0 px-0.5 py-1 cursor-grab hover:bg-gray-200 rounded transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col space-y-0.5">
          <div className="flex space-x-0.5">
            <div className="w-0.5 h-0.5 bg-gray-500 rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-gray-500 rounded-full"></div>
          </div>
          <div className="flex space-x-0.5">
            <div className="w-0.5 h-0.5 bg-gray-500 rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-gray-500 rounded-full"></div>
          </div>
          <div className="flex space-x-0.5">
            <div className="w-0.5 h-0.5 bg-gray-500 rounded-full"></div>
            <div className="w-0.5 h-0.5 bg-gray-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

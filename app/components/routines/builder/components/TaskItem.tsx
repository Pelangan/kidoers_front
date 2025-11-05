import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Folder } from 'lucide-react'
import type { Task, RecurringTemplate, TaskGroup } from '../types/routineBuilderTypes'
import { getTaskDisplayFrequency } from '../utils/taskUtils'
import { MultiMemberBadge } from './MultiMemberBadge'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: Task
  day: string
  memberId: string
  isDragging: boolean
  recurringTemplates: RecurringTemplate[]
  routineGroups?: TaskGroup[] // Routine groups for displaying routine chips
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
  // Pending state for save operations
  pending?: boolean
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  day,
  memberId,
  isDragging,
  recurringTemplates,
  routineGroups = [],
  familyMembers = [],
  getMemberColors,
  onClick,
  allDayTasks = [],
  onSeriesBadgeClick,
  isCopyOperation = false,
  pending = false
}) => {
  // @dnd-kit draggable setup
  // For multi-day tasks, create a unique ID per instance (day + memberId combination)
  // This allows dragging individual instances independently
  const template = task.recurring_template_id 
    ? recurringTemplates.find(t => t.id === task.recurring_template_id)
    : null
  
  // Check if task is multi-day - use template's days_of_week if available,
  // otherwise check if task has multiple days (fallback for when template isn't loaded yet)
  const daysOfWeek = template?.days_of_week || []
  const isMultiDayTask = daysOfWeek.length > 1
  
  const draggableId = isMultiDayTask ? `${task.id}-${day}-${memberId}` : task.id
  
  const { attributes, listeners, setNodeRef, transform, isDragging: isDndDragging } = useDraggable({
    id: draggableId,
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

  // Simple click handler - only show popup if not dragging
  const handleClick = (e: React.MouseEvent) => {
    if (pending) return
    
    // Do not open the popup if a drag is active (local or global)
    if (isDndDragging || isDragging) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    onClick(e, task, day, memberId)
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
  // NOTE: Task color is based on member, not routine group. The routine badge has its own color.
  const getTaskColor = () => {
    // Legacy: If task has from_group, use purple color (for backward compatibility)
    if (task.from_group) {
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
        ...(taskColor.borderColor && {
          borderLeftColor: taskColor.borderColor,
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid',
        }),
      }}
      className={`relative flex items-center space-x-1 p-3 rounded ${taskColor.bg} ${taskColor.border} border-t border-r border-b border-gray-200 ${
        isDndDragging ? 'cursor-grabbing shadow-2xl scale-105' : pending ? 'cursor-progress pointer-events-none opacity-90' : 'cursor-pointer'
      } hover:shadow-lg hover:bg-opacity-90`}
      {...attributes}
      {...listeners}
      onClick={handleClick}
    >
      {/* Pending badge - shows while save is in-flight */}
      {pending && (
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full shadow-sm z-20 border border-white animate-pulse"
          aria-label="Saving..."
          role="status"
        />
      )}
      
      {/* Copy operation indicator */}
      {isCopyOperation && (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-1 py-0.5 rounded shadow-lg z-20">
          Copy
        </div>
      )}
      
      
      <div 
        className="flex-1"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-medium ${taskColor.text}`}>{task.name}</div>
              {/* Points display - aligned to the right */}
              <div className="text-xs text-gray-600 ml-2">
                {task.points}pts
              </div>
            </div>
          </div>
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
        
        {/* Routine chip - show if task has group_id, positioned below task name */}
        {task.group_id && (() => {
          const group = routineGroups.find(g => g.id === task.group_id)
          if (!group) return null
          
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-700 border-blue-300',
            orange: 'bg-orange-100 text-orange-700 border-orange-300',
            green: 'bg-green-100 text-green-700 border-green-300',
            red: 'bg-red-100 text-red-700 border-red-300',
            purple: 'bg-purple-100 text-purple-700 border-purple-300',
            pink: 'bg-pink-100 text-pink-700 border-pink-300',
            teal: 'bg-teal-100 text-teal-700 border-teal-300',
            indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
          }
          
          const normalizedColor = (group.color || 'blue').toLowerCase()
          const chipColor = colorMap[normalizedColor] || colorMap.blue
          
          return (
            <div className={cn("text-[10px] px-1.5 py-0.5 rounded border mt-1 inline-block", chipColor)}>
              {group.name}
            </div>
          )
        })()}
        
        {/* Legacy: from_group display (for backward compatibility) */}
        {!task.group_id && task.from_group && (
          <div className="text-xs flex items-center space-x-1 text-purple-600 mt-1">
            <Folder className="w-3 h-3" />
            <span>from {task.from_group.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}


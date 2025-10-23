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
  onDragStart,
  onDragEnd,
  onClick,
  allDayTasks = [],
  onSeriesBadgeClick,
  isCopyOperation = false
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
  const getSeriesBadgeInfo = () => {
    // Series functionality removed - all tasks now use recurring templates
    return null
  }

  const seriesBadgeInfo = getSeriesBadgeInfo()

  return (
    <div 
      className={`relative flex items-center space-x-1 p-3 rounded border border-gray-200 ${taskColor.bg} ${taskColor.border} cursor-move hover:shadow-sm transition-shadow ${
        isDragging ? 'opacity-50 task-dragging' : ''
      }`}
      style={{
        borderLeftColor: taskColor.borderColor || undefined,
        pointerEvents: 'auto', // Ensure pointer events are enabled
        userSelect: 'none', // Prevent text selection during drag
        WebkitTouchCallout: 'none', // Disable touch callout on iOS
        zIndex: isDragging ? 1 : 'auto', // Lower z-index when dragging to allow drop zones to receive events
        // Remove any CSS that might interfere with drag image
        transform: isDragging ? 'none' : undefined,
        opacity: isDragging ? 0.5 : undefined
      } as React.CSSProperties}
      draggable={true}
      onMouseMove={(e) => {
        // Test if mouse events are working on this specific task
        if (task.name === 'sdfsd') {
          console.log('[TASK-ITEM] Mouse move on Cristina task:', {
            taskName: task.name,
            clientX: e.clientX,
            clientY: e.clientY
          })
        }
      }}
      onMouseDown={(e) => {
        console.log('[TASK-ITEM] Mouse down on task:', {
          taskName: task.name,
          taskId: task.id,
          day,
          memberId,
          draggable: e.currentTarget.draggable,
          computedStyle: window.getComputedStyle(e.currentTarget).pointerEvents,
          element: e.currentTarget,
          tagName: e.currentTarget.tagName,
          className: e.currentTarget.className
        })
        
        // Test if we can manually trigger drag
        if (task.name === 'sdfsd') {
          console.log('[TASK-ITEM] Cristina task - testing manual drag trigger')
          // Try to manually set draggable
          e.currentTarget.draggable = true
          console.log('[TASK-ITEM] Cristina task draggable after manual set:', e.currentTarget.draggable)
          
          // Add visual feedback that click was received
          e.currentTarget.style.border = '3px solid red'
          e.currentTarget.style.backgroundColor = 'lightblue'
          
          // Test browser drag and drop support (without dataTransfer since it's not available in mousedown)
          console.log('[TASK-ITEM] Testing browser drag support:', {
            userAgent: navigator.userAgent,
            hasDragAndDrop: 'draggable' in document.createElement('div')
          })
          
          // Try to manually initiate a drag after a short delay
          setTimeout(() => {
            console.log('[TASK-ITEM] Attempting to manually start drag...')
            // This won't work, but let's see if it logs
            if (e.currentTarget) {
              e.currentTarget.dispatchEvent(new DragEvent('dragstart', {
                bubbles: true,
                cancelable: true
              }))
            }
          }, 100)
        }
      }}
      onMouseUp={(e) => {
        console.log('[TASK-ITEM] Mouse up on task:', task.name)
      }}
      onDragStart={(e) => {
        console.log('[TASK-ITEM] 🎉 DRAG START EVENT TRIGGERED!', {
          taskName: task.name,
          taskId: task.id,
          day,
          memberId,
          event: e,
          target: e.target,
          currentTarget: e.currentTarget,
          draggable: e.currentTarget.draggable,
          computedStyle: window.getComputedStyle(e.currentTarget),
          // Check if this is Cristina's task specifically
          isCristinaTask: task.name === 'sdfsd',
          taskData: task
        })
        
        // Test basic drag functionality
        console.log('[TASK-ITEM] Testing basic drag...')
        
        // Add visual feedback that drag is starting (without transform to avoid drag image issues)
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)'
        e.currentTarget.style.backgroundColor = 'lightgreen' // Very obvious color change
        e.currentTarget.style.border = '3px solid red'
        // Don't use transform as it can interfere with drag image positioning
        
        console.log('[TASK-ITEM] Added visual feedback - task should be green with red border')
        
        // Ensure the drag operation is not prevented
        e.stopPropagation()
        
        // Create a simple drag image to avoid width issues
        const dragImage = document.createElement('div')
        dragImage.style.width = '200px'
        dragImage.style.height = '60px'
        dragImage.style.backgroundColor = taskColor.bg || '#f3f4f6'
        dragImage.style.border = '2px solid #3b82f6'
        dragImage.style.borderRadius = '8px'
        dragImage.style.opacity = '0.9'
        dragImage.style.position = 'absolute'
        dragImage.style.top = '-1000px'
        dragImage.style.left = '-1000px'
        dragImage.style.zIndex = '9999'
        dragImage.style.pointerEvents = 'none'
        dragImage.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
        dragImage.style.display = 'flex'
        dragImage.style.alignItems = 'center'
        dragImage.style.justifyContent = 'center'
        dragImage.style.fontSize = '14px'
        dragImage.style.fontWeight = '500'
        dragImage.style.color = '#374151'
        
        // Add task name text
        const textNode = document.createTextNode(task.name || '(No title)')
        dragImage.appendChild(textNode)
        
        document.body.appendChild(dragImage)
        
        // Set basic drag data
        e.dataTransfer.setData('text/plain', task.name || 'Task')
        e.dataTransfer.effectAllowed = 'move'
        
        console.log('[TASK-ITEM] Using browser default drag image - no custom image')
        
        // Test if the issue is with the drag image or the drag operation itself
        console.log('[TASK-ITEM] Testing drag operation...')
        
        // Debug: Check element properties that might affect dragging
        const element = e.currentTarget
        console.log('[TASK-ITEM] Element properties:', {
          draggable: element.draggable,
          tagName: element.tagName,
          className: element.className,
          computedStyle: {
            pointerEvents: window.getComputedStyle(element).pointerEvents,
            userSelect: window.getComputedStyle(element).userSelect,
            WebkitUserDrag: window.getComputedStyle(element).WebkitUserDrag,
            position: window.getComputedStyle(element).position,
            zIndex: window.getComputedStyle(element).zIndex
          }
        })
        
        // Force draggable to true
        element.draggable = true
        console.log('[TASK-ITEM] Forced draggable to true:', element.draggable)
        
        // Check parent element properties
        const parentElement = element.parentElement
        if (parentElement) {
          console.log('[TASK-ITEM] Parent element properties:', {
            tagName: parentElement.tagName,
            className: parentElement.className,
            computedStyle: {
              pointerEvents: window.getComputedStyle(parentElement).pointerEvents,
              overflow: window.getComputedStyle(parentElement).overflow,
              position: window.getComputedStyle(parentElement).position,
              zIndex: window.getComputedStyle(parentElement).zIndex
            }
          })
        }
        
        // Try to force a simple drag image
        const testImage = document.createElement('div')
        testImage.textContent = 'DRAG'
        testImage.style.cssText = `
          width: 50px;
          height: 20px;
          background: red;
          color: white;
          position: fixed;
          top: -1000px;
          left: -1000px;
          z-index: 9999;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        document.body.appendChild(testImage)
        
        try {
          e.dataTransfer.setDragImage(testImage, 25, 10)
          console.log('[TASK-ITEM] ✅ Drag image set successfully')
          
          // Check if the drag operation is being cancelled
          console.log('[TASK-ITEM] DataTransfer properties:', {
            effectAllowed: e.dataTransfer.effectAllowed,
            dropEffect: e.dataTransfer.dropEffect,
            types: Array.from(e.dataTransfer.types),
            files: e.dataTransfer.files.length
          })
        } catch (error) {
          console.log('[TASK-ITEM] ❌ Error setting drag image:', error)
        }
        
        // Clean up after a short delay
        setTimeout(() => {
          if (document.body.contains(testImage)) {
            document.body.removeChild(testImage)
          }
        }, 100)
        
        console.log('[TASK-ITEM] About to call hook onDragStart...')
        onDragStart(e, task, day, memberId)
        console.log('[TASK-ITEM] Hook onDragStart called successfully')
      }}
      onDragEnd={(e) => {
        console.log('[TASK-ITEM] Drag end triggered:', {
          taskName: task.name,
          taskId: task.id,
          dataTransfer: {
            effectAllowed: e.dataTransfer.effectAllowed,
            dropEffect: e.dataTransfer.dropEffect,
            types: Array.from(e.dataTransfer.types)
          }
        })
        
        // Check if the drag was cancelled
        if (e.dataTransfer.dropEffect === 'none') {
          console.log('[TASK-ITEM] ⚠️ Drag operation was cancelled!')
        } else {
          console.log('[TASK-ITEM] ✅ Drag operation completed successfully')
        }
        
        // Reset visual styles (no transform to reset)
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.backgroundColor = ''
        e.currentTarget.style.border = ''
        
        onDragEnd()
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e, task, day, memberId)
      }}
    >
      {/* Copy operation indicator */}
      {isCopyOperation && (
        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-1 py-0.5 rounded shadow-lg z-10">
          Copy
        </div>
      )}
      
      {/* Drag hint for copy functionality */}
      {isDragging && !isCopyOperation && (
        <div className="absolute -top-1 -left-1 bg-blue-500 text-white text-xs font-bold px-1 py-0.5 rounded shadow-lg z-10">
          Hold ⌥ to copy
        </div>
      )}
      
      <div className="flex-1">
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
            {seriesBadgeInfo && (
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
    </div>
  )
}

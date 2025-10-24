import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BucketSection, TaskBucketType } from './BucketSection'
import { TaskItem } from './TaskItem'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'
import { useState, useEffect } from 'react'

interface DayBucketData {
  day_of_week: string
  buckets: Array<{
    bucket_type: TaskBucketType
    bucket_member_id?: string
    bucket_member_name?: string
    tasks: Task[]
  }>
}

interface PlannerWeekProps {
  weekData: DayBucketData[]
  selectedMemberIds: string[]
  draggedTask: { task: Task; day: string; memberId: string; isCopyOperation?: boolean } | null
  dragOverPosition: { day: string; memberId: string; position: 'before' | 'after'; targetTaskId?: string } | null
  hoveredDropZone: { day: string; memberId: string } | null
  isReordering: boolean
  reorderingDay: string | null
  recurringTemplates: RecurringTemplate[]
  familyMembers: Array<{
    id: string
    name: string
    role: string
    avatar_url?: string | null
    color: string
  }>
  getMemberColors?: (color: string) => { border: string; bg: string; bgColor: string; borderColor: string }
  onColumnClick: (day: string, bucketType?: TaskBucketType, bucketMemberId?: string) => void
  onTaskDragStart: (e: React.DragEvent, task: Task, day: string, memberId: string) => void
  onTaskDragEnd: () => void
  onTaskDragOver: (e: React.DragEvent, day: string, memberId: string, position: 'before' | 'after', targetTaskId?: string) => void
  onTaskDragLeave: () => void
  onTaskDrop: (e: React.DragEvent, targetDay: string, targetMemberId: string) => void
  onTaskClick: (e: React.MouseEvent, task: Task, day: string, memberId: string) => void
  onRemoveGroup: (day: string, groupId: string) => void
  getTasksWithDayOrder: (tasks: Task[], day: string, memberId: string) => Task[]
  extractMemberIdFromId: (id: string, selectedMemberId: string) => string
  onSeriesBadgeClick?: (seriesId: string, day: string) => void // Handler for series badge click
}

export const PlannerWeek: React.FC<PlannerWeekProps> = ({
  weekData,
  selectedMemberIds,
  draggedTask,
  dragOverPosition,
  hoveredDropZone,
  isReordering,
  reorderingDay,
  recurringTemplates,
  familyMembers,
  getMemberColors,
  onColumnClick,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDrop,
  onTaskClick,
  onRemoveGroup,
  getTasksWithDayOrder,
  extractMemberIdFromId,
  onSeriesBadgeClick,
}) => {
  // Height calculation for responsive grid
  const [gridHeight, setGridHeight] = useState(600)
  const [bucketMinHeight, setBucketMinHeight] = useState(160)

  useEffect(() => {
    const calculateHeights = () => {
      // Calculate available height (viewport - header - padding)
      const headerHeight = 300 // Approximate header height
      const padding = 100 // Padding and margins
      const availableHeight = window.innerHeight - headerHeight - padding
      
      // Set grid height to fill available space
      setGridHeight(Math.max(400, availableHeight))
      
      // Calculate minimum bucket height - increased for better spacing
      const allBuckets = getAllBuckets()
      const bucketCount = allBuckets.length
      const calculatedMinHeight = Math.max(160, Math.min(220, availableHeight / Math.max(bucketCount, 1)))
      setBucketMinHeight(calculatedMinHeight)
    }

    calculateHeights()
    window.addEventListener('resize', calculateHeights)
    return () => window.removeEventListener('resize', calculateHeights)
  }, [])
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  
  const getDayData = (day: string) => {
    return weekData.find(d => d.day_of_week === day) || { day_of_week: day, buckets: [] }
  }

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1)
  }

  // Get all unique buckets across all days to create the matrix rows
  const getAllBuckets = () => {
    const bucketMap = new Map<string, {
      bucket_type: TaskBucketType
      bucket_member_id?: string
      bucket_member_name?: string
    }>()
    
    weekData.forEach(dayData => {
      dayData.buckets.forEach(bucket => {
        const key = `${bucket.bucket_type}-${bucket.bucket_member_id || 'shared'}`
        if (!bucketMap.has(key)) {
          bucketMap.set(key, {
            bucket_type: bucket.bucket_type,
            bucket_member_id: bucket.bucket_member_id,
            bucket_member_name: bucket.bucket_member_name
          })
        }
      })
    })
    
    return Array.from(bucketMap.values())
  }

  const getTasksForBucketAndDay = (bucketType: TaskBucketType, bucketMemberId: string | undefined, day: string) => {
    const dayData = getDayData(day)
    const bucket = dayData.buckets.find(b => 
      b.bucket_type === bucketType && 
      b.bucket_member_id === bucketMemberId
    )
    return bucket?.tasks || []
  }

  const allBuckets = getAllBuckets()
  
  // Debug: Log all buckets to understand the structure
  console.log('[PLANNER-WEEK] All buckets:', allBuckets.map((bucket, index) => ({
    index,
    bucket_type: bucket.bucket_type,
    bucket_member_id: bucket.bucket_member_id,
    bucket_member_name: bucket.bucket_member_name,
    isFirstRow: index === 0,
    isSecondRow: index === 1
  })))
  
  // Also log each bucket individually to see the full structure
  allBuckets.forEach((bucket, index) => {
    console.log(`[PLANNER-WEEK] Bucket ${index}:`, {
      index,
      bucket_type: bucket.bucket_type,
      bucket_member_id: bucket.bucket_member_id,
      bucket_member_name: bucket.bucket_member_name,
      isFirstRow: index === 0,
      isSecondRow: index === 1
    })
  })

  // Calculate the maximum number of tasks for each bucket across all days
  const getMaxTasksForBucket = (bucketType: TaskBucketType, bucketMemberId: string | undefined) => {
    let maxTasks = 0
    days.forEach(day => {
      const tasks = getTasksForBucketAndDay(bucketType, bucketMemberId, day)
      maxTasks = Math.max(maxTasks, tasks.length)
    })
    return maxTasks
  }

  return (
    <Card className="bg-white border-t border-r border-b border-gray-200">
      <CardContent className="p-0">
        {/* Day Headers */}
        <div className="flex border-b border-gray-200">
          {/* Empty cell for avatars */}
          <div className="p-2 bg-gray-50 border-r border-gray-200 w-16 flex-shrink-0"></div>
          {days.map((day) => (
            <div 
              key={day}
              className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0 text-center font-medium text-gray-700 hover:bg-gray-100 transition-colors flex-1"
              onClick={() => onColumnClick(day, undefined, undefined)}
            >
              {formatDayName(day)}
            </div>
          ))}
        </div>

        {/* Bucket Rows */}
        <div style={{ height: `${gridHeight}px`, overflowY: 'auto' }}>
        {allBuckets.map((bucket, bucketIndex) => {
          const maxTasks = getMaxTasksForBucket(bucket.bucket_type, bucket.bucket_member_id)
          // Use our calculated minimum height, but allow growth for many tasks
          const calculatedHeight = Math.max(bucketMinHeight, maxTasks * 50 + 40)
          
          return (
            <div key={`${bucket.bucket_type}-${bucket.bucket_member_id || 'shared'}`} className="border-b border-gray-200 transition-all duration-200 ease-in-out">
              <div className="flex" style={{ minHeight: `${calculatedHeight}px` }}>
                {/* Avatar Column */}
                <div className="p-2 pt-4 border-r border-gray-200 flex items-start justify-center w-16 flex-shrink-0">
                  {bucket.bucket_type === 'shared' ? (
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                      <div className="text-center leading-tight">
                        <div className="text-yellow-800 text-xs font-bold">Shared</div>
                        <div className="text-yellow-800 text-xs font-bold">Tasks</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {(() => {
                        const member = familyMembers.find(m => m.id === bucket.bucket_member_id)
                        if (member?.avatar_url) {
                          return (
                            <img 
                              src={member.avatar_url} 
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          )
                        } else {
                          return (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: member?.color || '#6b7280' }}
                            >
                              {member?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Task Content Columns */}
                {days.map((day) => {
                  const tasks = getTasksForBucketAndDay(bucket.bucket_type, bucket.bucket_member_id, day)
                  const orderedTasks = getTasksWithDayOrder(tasks, day, bucket.bucket_member_id || '')
                  
                  return (
                    <div 
                      key={day} 
                      className={`p-2 border-r border-gray-200 last:border-r-0 transition-all duration-300 ease-in-out flex-1 flex flex-col relative ${
                        hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id
                          ? 'bg-blue-50 border-blue-200'
                          : isReordering && reorderingDay === day
                          ? 'bg-gray-100 opacity-75'
                          : 'hover:bg-gray-50'
                      }`}
                      style={{ 
                        minHeight: `${calculatedHeight}px`,
                        height: `${calculatedHeight}px`,
                        overflowY: 'auto'
                      }}
                      onClick={(e) => {
                        // Don't trigger click if we're dragging
                        if (draggedTask) {
                          e.preventDefault()
                          e.stopPropagation()
                          return
                        }
                        console.log('[PLANNER-WEEK] Day cell clicked:', day, 'bucket:', bucket.bucket_type, bucket.bucket_member_name)
                        onColumnClick(day, bucket.bucket_type, bucket.bucket_member_id)
                      }}
                      onDragOver={(e) => {
                        // Allow drag over on the day cell and set hovered drop zone
                        console.log('[PLANNER-WEEK] Day cell drag over:', { 
                          day, 
                          memberId: bucket.bucket_member_id, 
                          memberName: bucket.bucket_member_name,
                          draggedTaskId: draggedTask?.task.id,
                          draggedTaskName: draggedTask?.task.name,
                          currentHoveredDropZone: hoveredDropZone
                        })
                        e.preventDefault()
                        onTaskDragOver(e, day, bucket.bucket_member_id || '', 'after')
                      }}
                      onDragLeave={(e) => {
                        // Clear hovered drop zone when leaving the day cell
                        console.log('[PLANNER-WEEK] Day cell drag leave:', { day, memberId: bucket.bucket_member_id })
                        onTaskDragLeave()
                      }}
                    >
                      <div className="flex flex-col h-full">
                        {/* Empty bucket drop zone - only show when hovering over this area AND no tasks exist */}
                        {orderedTasks.length === 0 && hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id && (
                          <div
                            className="h-16 bg-blue-100 border-2 border-dashed border-blue-400 rounded transition-all duration-200 ease-in-out"
                            onDragOver={(e) => {
                              console.log('[PLANNER-WEEK] Empty bucket drag over:', {
                                day,
                                memberId: bucket.bucket_member_id,
                                memberName: bucket.bucket_member_name
                              })
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDragOver(e, day, bucket.bucket_member_id || '', 'after')
                            }}
                            onDragLeave={(e) => {
                              console.log('[PLANNER-WEEK] Empty bucket drag leave')
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDragLeave()
                            }}
                            onDrop={(e) => {
                              console.log('[PLANNER-WEEK] Empty bucket drop:', {
                                day,
                                memberId: bucket.bucket_member_id
                              })
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDrop(e, day, bucket.bucket_member_id || '')
                            }}
                          />
                        )}

                        {/* Tasks Container */}
                        <div className="flex-1 overflow-y-auto space-y-2">
                        {/* Drop zone at the top when there are existing tasks */}
                        {orderedTasks.length > 0 && draggedTask && (
                          <div
                            className={`h-3 rounded transition-all duration-200 ease-in-out ${
                              hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id &&
                              draggedTask && dragOverPosition?.day === day && 
                                dragOverPosition?.memberId === bucket.bucket_member_id &&
                                dragOverPosition?.position === 'before' && 
                                dragOverPosition?.targetTaskId === orderedTasks[0].id
                                  ? 'bg-blue-400 border-2 border-dashed border-blue-600' 
                                  : hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id
                                    ? 'bg-gray-200 border-2 border-dashed border-gray-400 hover:bg-blue-100 hover:border-blue-300'
                                    : 'bg-gray-100 border border-dashed border-gray-300'
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDragOver(e, day, bucket.bucket_member_id || '', 'before', orderedTasks[0].id)
                            }}
                            onDragLeave={(e) => {
                              onTaskDragLeave()
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDrop(e, day, bucket.bucket_member_id || '')
                            }}
                          />
                        )}
                        
                        {orderedTasks.map((task, taskIndex) => {
                          // Use the bucket member ID directly since we're already in the correct member's bucket
                          const memberId = bucket.bucket_member_id || ''
                          const isDragged = draggedTask?.task.id === task.id
                          
                          // Debug logging to understand the task structure
                          console.log('[PLANNER-WEEK] Task details:', {
                            taskId: task.id,
                            taskName: task.name,
                            bucketMemberId: bucket.bucket_member_id,
                            bucketMemberName: bucket.bucket_member_name,
                            taskMemberId: task.memberId,
                            taskAssignees: task.assignees,
                            memberId,
                            isDragged,
                            draggedTaskId: draggedTask?.task.id,
                            draggedTaskName: draggedTask?.task.name,
                            bucketIndex,
                            taskIndex,
                            isFirstRow: bucketIndex === 0,
                            isSecondRow: bucketIndex === 1
                          })
                          

                          return (
                            <div key={`${task.id}-${day}-${bucket.bucket_type || 'unknown'}-${bucket.bucket_member_id || 'shared'}`}>
                              {/* Drop zone before this task - show when dragging a different task AND it's not the first task */}
                              {draggedTask && draggedTask.task.id !== task.id && taskIndex > 0 && (
                                <div
                                  className={`h-3 rounded transition-all duration-200 ease-in-out ${
                                    hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id &&
                                    draggedTask && dragOverPosition?.day === day && 
                                      dragOverPosition?.memberId === bucket.bucket_member_id &&
                                      dragOverPosition?.position === 'before' && 
                                      dragOverPosition?.targetTaskId === task.id
                                        ? 'bg-blue-400 border-2 border-dashed border-blue-600' 
                                        : hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id
                                          ? 'bg-gray-200 border-2 border-dashed border-gray-400 hover:bg-blue-100 hover:border-blue-300'
                                          : 'bg-gray-100 border border-dashed border-gray-300'
                                  }`}
                                  onMouseEnter={() => console.log('[PLANNER-WEEK] Mouse entered drop zone (before task):', { day, memberId: bucket.bucket_member_id, taskId: task.id })}
                                  onDragOver={(e) => {
                                    console.log('[PLANNER-WEEK] Drop zone drag over (before task):', {
                                      day,
                                      memberId: bucket.bucket_member_id,
                                      taskId: task.id,
                                      taskName: task.name,
                                      draggedTaskId: draggedTask?.task.id,
                                      draggedTaskName: draggedTask?.task.name
                                    })
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onTaskDragOver(e, day, bucket.bucket_member_id || '', 'before', task.id)
                                  }}
                                  onDragLeave={(e) => {
                                    console.log('[PLANNER-WEEK] Drop zone drag leave (before task)')
                                    onTaskDragLeave()
                                  }}
                                  onDrop={(e) => {
                                    console.log('[PLANNER-WEEK] Drop zone drop (before task):', {
                                      day,
                                      memberId: bucket.bucket_member_id,
                                      taskId: task.id,
                                      taskName: task.name,
                                      draggedTaskId: draggedTask?.task.id,
                                      draggedTaskName: draggedTask?.task.name,
                                      dragOverPosition
                                    })
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onTaskDrop(e, day, bucket.bucket_member_id || '')
                                  }}
                                />
                              )}
                              
                              <TaskItem
                                task={task}
                                day={day}
                                memberId={memberId}
                                isDragging={isDragged}
                                recurringTemplates={recurringTemplates}
                                familyMembers={familyMembers}
                                getMemberColors={getMemberColors}
                                onDragStart={onTaskDragStart}
                                onDragEnd={onTaskDragEnd}
                                onClick={onTaskClick}
                                allDayTasks={tasks}
                                onSeriesBadgeClick={onSeriesBadgeClick}
                                isCopyOperation={draggedTask?.isCopyOperation || false}
                              />
                              
                              {/* Drop zone after this task - only show for the last task when dragging a different task */}
                              {draggedTask && draggedTask.task.id !== task.id && taskIndex === orderedTasks.length - 1 && (
                                <div
                                  className={`h-3 rounded transition-all duration-200 ease-in-out ${
                                    hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id &&
                                    draggedTask && dragOverPosition?.day === day && 
                                    dragOverPosition?.memberId === bucket.bucket_member_id && 
                                    dragOverPosition?.position === 'after' && 
                                    dragOverPosition?.targetTaskId === task.id
                                      ? 'bg-blue-400 border-2 border-dashed border-blue-600' 
                                      : hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id
                                        ? 'bg-gray-200 border-2 border-dashed border-gray-400 hover:bg-blue-100 hover:border-blue-300'
                                        : 'bg-gray-100 border border-dashed border-gray-300'
                                  }`}
                                  onDragOver={(e) => {
                                    console.log('[PLANNER-WEEK] Drop zone drag over (after task):', {
                                      day,
                                      memberId: bucket.bucket_member_id,
                                      taskId: task.id,
                                      taskName: task.name,
                                      draggedTaskId: draggedTask?.task.id,
                                      draggedTaskName: draggedTask?.task.name
                                    })
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onTaskDragOver(e, day, bucket.bucket_member_id || '', 'after', task.id)
                                  }}
                                  onDragLeave={(e) => {
                                    console.log('[PLANNER-WEEK] Drop zone drag leave (after task)')
                                    onTaskDragLeave()
                                  }}
                                  onDrop={(e) => {
                                    console.log('[PLANNER-WEEK] Drop zone drop (after task):', {
                                      day,
                                      memberId: bucket.bucket_member_id,
                                      taskId: task.id,
                                      taskName: task.name,
                                      draggedTaskId: draggedTask?.task.id,
                                      draggedTaskName: draggedTask?.task.name,
                                      dragOverPosition
                                    })
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onTaskDrop(e, day, bucket.bucket_member_id || '')
                                  }}
                                />
                              )}
                            </div>
                          )
                        })}
                        </div>

                        {/* Loading Overlay */}
                        {isReordering && reorderingDay === day && (
                          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}

                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        </div>
      </CardContent>
    </Card>
  )
}

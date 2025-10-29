import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useDroppable } from '@dnd-kit/core'
import { BucketSection, TaskBucketType } from './BucketSection'
import { TaskItem } from './TaskItem'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'
import { useState, useEffect } from 'react'

// DropZone component using @dnd-kit
interface DropZoneProps {
  id: string
  day: string
  memberId: string
  position: 'before' | 'after'
  targetTaskId?: string
  isActive: boolean
  className?: string
}

const DropZone: React.FC<DropZoneProps> = ({ 
  id, 
  day, 
  memberId, 
  position, 
  targetTaskId, 
  isActive, 
  className = '' 
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      day,
      memberId,
      position,
      targetTaskId,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={className || `h-3 rounded transition-all duration-200 ease-in-out ${
        isOver && isActive
          ? 'bg-blue-400 border-2 border-dashed border-blue-600' 
          : isActive
            ? 'bg-gray-200 border-2 border-dashed border-gray-400 hover:bg-blue-100 hover:border-blue-300'
            : 'bg-gray-100 border border-dashed border-gray-300'
      }`}
    />
  )
}

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
  sourceDay: string | null
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
  sourceDay,
  recurringTemplates,
  familyMembers,
  getMemberColors,
  onColumnClick,
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
        <div style={{ height: `${gridHeight}px`, overflowY: 'auto', position: 'relative' }}>
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
                         (hoveredDropZone?.day === day && hoveredDropZone?.memberId === bucket.bucket_member_id)
                           ? 'bg-blue-50 border-blue-200'
                           : isReordering && reorderingDay === day
                           ? 'bg-gray-100 opacity-75'
                           : 'hover:bg-gray-50'
                       }`}
                      style={{ 
                        minHeight: `${calculatedHeight}px`,
                        height: `${calculatedHeight}px`
                      }}
                       onClick={(e) => {
                         // Don't trigger click if we're dragging
                         if (draggedTask) {
                           e.preventDefault()
                           e.stopPropagation()
                           return
                         }
                         onColumnClick(day, bucket.bucket_type, bucket.bucket_member_id)
                       }}
                     >
                      <div className="flex flex-col h-full relative">
                        {/* Tasks Container */}
                        <div className="flex-1 space-y-2">
                        {/* Drop zone at the top when there are existing tasks OR when dragging cross-member */}
                        {draggedTask && orderedTasks.length > 0 && (
                          <DropZone
                            id={`drop-top-${day}-${bucket.bucket_member_id}`}
                            day={day}
                            memberId={bucket.bucket_member_id || ''}
                            position="before"
                            targetTaskId={orderedTasks[0].id}
                            isActive={!!draggedTask}
                          />
                        )}
                        
                        {/* Drop zone for empty cells */}
                        {draggedTask && orderedTasks.length === 0 && (
                          <DropZone
                            id={`drop-empty-${day}-${bucket.bucket_member_id}`}
                            day={day}
                            memberId={bucket.bucket_member_id || ''}
                            position="after"
                            isActive={!!draggedTask}
                            className="min-h-32 bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg m-1"
                          />
                        )}
                        
                        {orderedTasks.map((task, taskIndex) => {
                          // Use the bucket member ID directly since we're already in the correct member's bucket
                          const memberId = bucket.bucket_member_id || ''
                          const isDragged = draggedTask?.task.id === task.id

                          return (
                            <div key={`${task.id}-${day}-${bucket.bucket_type || 'unknown'}-${bucket.bucket_member_id || 'shared'}`}>
                              {/* Drop zone before this task - show when dragging a different task AND it's not the first task */}
                              {draggedTask && draggedTask.task.id !== task.id && taskIndex > 0 && (
                                <DropZone
                                  id={`drop-before-${day}-${bucket.bucket_member_id}-${task.id}`}
                                  day={day}
                                  memberId={bucket.bucket_member_id || ''}
                                  position="before"
                                  targetTaskId={task.id}
                                  isActive={!!draggedTask}
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
                                onClick={onTaskClick}
                                allDayTasks={tasks}
                                onSeriesBadgeClick={onSeriesBadgeClick}
                                isCopyOperation={draggedTask?.isCopyOperation || false}
                              />
                              
                              {/* Drop zone after this task - only show for the last task when dragging a different task */}
                              {draggedTask && draggedTask.task.id !== task.id && taskIndex === orderedTasks.length - 1 && (
                                <DropZone
                                  id={`drop-after-${day}-${bucket.bucket_member_id}-${task.id}`}
                                  day={day}
                                  memberId={bucket.bucket_member_id || ''}
                                  position="after"
                                  targetTaskId={task.id}
                                  isActive={!!draggedTask}
                                />
                              )}
                            </div>
                          )
                        })}
                        </div>

                        {/* Loading Overlay */}
                        {isReordering && (reorderingDay === day || sourceDay === day) && (
                          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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

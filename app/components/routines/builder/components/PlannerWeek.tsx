import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BucketSection, TaskBucketType } from './BucketSection'
import { TaskItem } from './TaskItem'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'

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
              className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors flex-1"
              onClick={() => onColumnClick(day, undefined, undefined)}
            >
              {formatDayName(day)}
            </div>
          ))}
        </div>

        {/* Bucket Rows */}
        <div>
        {allBuckets.map((bucket, bucketIndex) => {
          const maxTasks = getMaxTasksForBucket(bucket.bucket_type, bucket.bucket_member_id)
          const minHeight = Math.max(120, maxTasks * 50 + 40) // Increased minimum height for better spacing
          
          return (
            <div key={`${bucket.bucket_type}-${bucket.bucket_member_id || 'shared'}`} className="border-b border-gray-200 transition-all duration-200 ease-in-out">
              <div className="flex" style={{ minHeight: `${minHeight}px` }}>
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
                      className="p-2 border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-50 transition-colors flex-1"
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
                        // Allow drag over on the day cell
                        console.log('[PLANNER-WEEK] Day cell drag over:', { day, memberId: bucket.bucket_member_id, memberName: bucket.bucket_member_name })
                        e.preventDefault()
                      }}
                    >
                      <div className="space-y-2">
                        {/* Empty bucket drop zone - always render but hide when not dragging */}
                        {orderedTasks.length === 0 && (
                          <div
                            className={`rounded transition-all ${
                              draggedTask && dragOverPosition?.day === day && 
                              dragOverPosition?.memberId === bucket.bucket_member_id &&
                              !dragOverPosition?.targetTaskId
                                ? 'h-16 bg-blue-100 border-2 border-dashed border-blue-400' 
                                : draggedTask 
                                  ? 'h-16 border-2 border-dashed border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                                  : 'h-0'
                            }`}
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
                              {/* Drop zone before this task */}
                              <div
                                className={`rounded transition-all ${
                                  draggedTask && dragOverPosition?.day === day && 
                                    dragOverPosition?.memberId === bucket.bucket_member_id &&
                                    dragOverPosition?.position === 'before' && 
                                    dragOverPosition?.targetTaskId === task.id
                                      ? 'h-8 bg-blue-400 border-2 border-dashed border-blue-600' 
                                      : draggedTask 
                                        ? 'h-8 hover:bg-blue-100 hover:border-2 hover:border-dashed hover:border-blue-300'
                                        : 'h-0'
                                }`}
                                style={{ 
                                  zIndex: 10,
                                  position: 'relative'
                                }}
                                onMouseEnter={() => console.log('[PLANNER-WEEK] Mouse entered drop zone (before task):', { day, memberId: bucket.bucket_member_id, taskId: task.id })}
                                onDragOver={(e) => {
                                  console.log('[PLANNER-WEEK] Drop zone drag over (before task):', {
                                    day,
                                    memberId: bucket.bucket_member_id,
                                    taskId: task.id,
                                    taskName: task.name
                                  })
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
                                    taskId: task.id
                                  })
                                  onTaskDrop(e, day, bucket.bucket_member_id || '')
                                }}
                              />
                              
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
                              
                              {/* Drop zone after this task */}
                              {taskIndex === orderedTasks.length - 1 && (
                                <div
                                  className={`rounded transition-all ${
                                    draggedTask && dragOverPosition?.day === day && 
                                    dragOverPosition?.memberId === bucket.bucket_member_id && 
                                    dragOverPosition?.position === 'after' && 
                                    dragOverPosition?.targetTaskId === task.id
                                      ? 'h-2 bg-blue-400 border-2 border-dashed border-blue-600' 
                                      : draggedTask 
                                        ? 'h-2 hover:bg-blue-100 hover:border-2 hover:border-dashed hover:border-blue-300'
                                        : 'h-0'
                                  }`}
                                  onDragOver={(e) => onTaskDragOver(e, day, bucket.bucket_member_id || '', 'after', task.id)}
                                  onDragLeave={onTaskDragLeave}
                                  onDrop={(e) => onTaskDrop(e, day, bucket.bucket_member_id || '')}
                                />
                              )}
                            </div>
                          )
                        })}

                        {/* Bottom drop zone for non-empty buckets - always render but hide when not dragging */}
                        {orderedTasks.length > 0 && (
                          <div
                            className={`mt-2 rounded transition-all ${
                              draggedTask && dragOverPosition?.day === day && 
                              dragOverPosition?.memberId === bucket.bucket_member_id &&
                              !dragOverPosition?.targetTaskId
                                ? 'h-16 bg-blue-100 border-2 border-dashed border-blue-400' 
                                : draggedTask 
                                  ? 'h-16 border-2 border-dashed border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                                  : 'h-0'
                            }`}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDragOver(e, day, bucket.bucket_member_id || '', 'after')
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDragLeave()
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onTaskDrop(e, day, bucket.bucket_member_id || '')
                            }}
                          />
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

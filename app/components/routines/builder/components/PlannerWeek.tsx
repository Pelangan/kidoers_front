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
  draggedTask: { task: Task; day: string; memberId: string } | null
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
  extractMemberIdFromId
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
        <div className="min-h-[900px]">
        {allBuckets.map((bucket, bucketIndex) => {
          const maxTasks = getMaxTasksForBucket(bucket.bucket_type, bucket.bucket_member_id)
          const minHeight = Math.max(60, maxTasks * 50 + 20) // Dynamic height based on task count
          
          return (
            <div key={`${bucket.bucket_type}-${bucket.bucket_member_id || 'shared'}`} className="border-b border-gray-200 transition-all duration-200 ease-in-out">
              <div className="flex" style={{ minHeight: `${minHeight}px` }}>
                {/* Avatar Column */}
                <div className="p-2 border-r border-gray-200 flex items-center justify-center w-16 flex-shrink-0">
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
                        console.log('[PLANNER-WEEK] Day cell clicked:', day, 'bucket:', bucket.bucket_type, bucket.bucket_member_name)
                        onColumnClick(day, bucket.bucket_type, bucket.bucket_member_id)
                      }}
                    >
                      <div className="space-y-2">
                        {orderedTasks.map((task) => {
                          const memberId = extractMemberIdFromId(task.id, bucket.bucket_member_id || '')
                          const isDragged = draggedTask?.task.id === task.id

                          return (
                            <div key={task.id}>
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
                              />
                            </div>
                          )
                        })}
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

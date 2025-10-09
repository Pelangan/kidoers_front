import React from 'react'
import { TaskItem } from './TaskItem'
import { TaskGroup } from './TaskGroup'
import type { Task, TaskGroup as TaskGroupType, RecurringTemplate } from '../types/routineBuilderTypes'

export type TaskBucketType = 'shared' | 'member'

interface BucketSectionProps {
  bucketType: TaskBucketType
  bucketMemberId?: string
  bucketMemberName?: string
  tasks: Task[]
  groups: TaskGroupType[]
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
  day: string
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

export const BucketSection: React.FC<BucketSectionProps> = ({
  bucketType,
  bucketMemberId,
  bucketMemberName,
  tasks,
  groups,
  selectedMemberIds,
  draggedTask,
  dragOverPosition,
  recurringTemplates,
  familyMembers,
  getMemberColors,
  day,
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
  const isMultiMemberView = selectedMemberIds.length > 1
  const isSharedBucket = bucketType === 'shared'
  const isMemberBucket = bucketType === 'member'

  // Get member info for this bucket
  const bucketMember = bucketMemberId ? familyMembers.find(m => m.id === bucketMemberId) : null

  // Determine if we should show avatars on tasks
  const shouldShowAvatarsOnTasks = () => {
    if (isSharedBucket) {
      return true // Always show avatars in shared bucket
    }
    if (isMemberBucket) {
      return false // Never show avatars in member buckets (header already shows owner)
    }
    return false
  }

  const renderBucketHeader = () => {
    if (isSharedBucket) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border-b border-yellow-200">
          <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
            <span className="text-yellow-800 text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-medium text-yellow-800">Shared</span>
        </div>
      )
    }

    if (isMemberBucket && bucketMember) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="w-6 h-6 rounded-full overflow-hidden">
            {bucketMember.avatar_url ? (
              <img 
                src={bucketMember.avatar_url} 
                alt={bucketMember.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: bucketMember.color }}
              >
                {bucketMember.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm font-medium text-gray-700">{bucketMemberName || bucketMember.name}</span>
        </div>
      )
    }

    return null
  }

  const renderTasks = () => {
    const orderedTasks = getTasksWithDayOrder(tasks, day, bucketMemberId || '')
    
    return orderedTasks.map((task, index) => {
      const memberId = extractMemberIdFromId(task.id, bucketMemberId || '')
      const isDragged = draggedTask?.task.id === task.id

      return (
        <div key={`${task.id}-${day}-${bucketMemberId || 'shared'}`}>
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
    })
  }

  const renderGroups = () => {
    return groups.map((group) => (
      <TaskGroup
        key={group.id}
        group={group}
        day={day}
        memberId={bucketMemberId || ''}
        onRemove={() => onRemoveGroup(day, group.id)}
        onTaskDragStart={onTaskDragStart}
        onTaskDragEnd={onTaskDragEnd}
        onTaskDragOver={onTaskDragOver}
        onTaskDragLeave={onTaskDragLeave}
        onTaskDrop={onTaskDrop}
        onTaskClick={onTaskClick}
        draggedTask={draggedTask}
        dragOverPosition={dragOverPosition}
        getTasksWithDayOrder={getTasksWithDayOrder}
        extractMemberIdFromId={extractMemberIdFromId}
        familyMembers={familyMembers}
        getMemberColors={getMemberColors}
        showAvatar={shouldShowAvatarsOnTasks()}
      />
    ))
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {renderBucketHeader()}
      <div className="p-2 space-y-2 min-h-[100px]">
        {renderGroups()}
        {renderTasks()}
        
        {/* Empty state */}
        {tasks.length === 0 && groups.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            {isSharedBucket ? 'No shared tasks' : 'No tasks assigned'}
          </div>
        )}
      </div>
    </div>
  )
}

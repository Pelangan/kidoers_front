'use client'

import { generateAvatarUrl } from '../../../ui/AvatarSelector'

interface MultiMemberBadgeProps {
  memberCount: number
  assignees: Array<{
    id: string
    name: string
    role: string
    avatar_url?: string | null
    color: string
  }>
  className?: string
}

export function MultiMemberBadge({ memberCount, assignees, className = "" }: MultiMemberBadgeProps) {
  // Always show avatars, even for single-member tasks
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Stacked avatars */}
      <div className="flex -space-x-1">
        {assignees.slice(0, 3).map((assignee, index) => {
          const avatarUrl = assignee.avatar_url || generateAvatarUrl('adventurer', assignee.name)
          
          return (
            <div
              key={assignee.id}
              className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden"
              title={`${assignee.name} (${assignee.role})`}
            >
              <img
                src={avatarUrl}
                alt={assignee.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div
                className="w-full h-full flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: assignee.color, display: 'none' }}
              >
                {assignee.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )
        })}
        
        {/* Show "+N" if there are more than 3 assignees */}
        {assignees.length > 3 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
            +{assignees.length - 3}
          </div>
        )}
      </div>
    </div>
  )
}

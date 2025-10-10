import React from 'react'
import { Users } from 'lucide-react'

interface MultiMemberBadgeProps {
  memberCount: number
  assignees: Array<{
    id: string
    name: string
    role?: string
    avatar_url?: string | null
    color?: string
  }>
}

export const MultiMemberBadge: React.FC<MultiMemberBadgeProps> = ({ 
  memberCount, 
  assignees 
}) => {
  return (
    <div className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
      <Users className="w-3 h-3" />
      <span>{memberCount}</span>
    </div>
  )
}

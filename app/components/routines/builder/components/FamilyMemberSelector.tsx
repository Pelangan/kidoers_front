import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { generateAvatarUrl } from '../../../ui/AvatarSelector'
import type { EnhancedFamilyMember } from '../../types/routineBuilderTypes'

interface FamilyMemberSelectorProps {
  enhancedFamilyMembers: EnhancedFamilyMember[]
  selectedMemberId: string | null
  setSelectedMemberId: (id: string) => void
  getMemberColors: (color: string) => { border: string; bg: string; bgColor: string; borderColor: string }
  viewMode: 'calendar' | 'group'
  setViewMode: (mode: 'calendar' | 'group') => void
}

export const FamilyMemberSelector: React.FC<FamilyMemberSelectorProps> = ({
  enhancedFamilyMembers,
  selectedMemberId,
  setSelectedMemberId,
  getMemberColors,
  viewMode,
  setViewMode
}) => {
  return (
    <div className="flex items-center justify-center gap-10 py-0 px-16 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-3xl shadow-sm border border-white/50 min-w-fit">
      {enhancedFamilyMembers.length === 0 && (
        <div className="text-sm text-gray-500">Loading family members...</div>
      )}
      {enhancedFamilyMembers.map((member) => {
        const colors = getMemberColors(member.color)
        const avatarUrl = member.avatar_url || generateAvatarUrl(
          member.avatar_seed || member.name.toLowerCase().replace(/\s+/g, '-'),
          member.avatar_style || 'adventurer',
          member.avatar_options || {}
        )

        const colorClasses = {
          ring: `ring-${member.color}-400`,
          shadow: `shadow-${member.color}-200`,
          hover: `hover:ring-${member.color}-300`,
          bg: `bg-${member.color}-100`
        }

        return (
          <div
            key={member.id}
            className={`group relative flex flex-col items-center space-y-2 p-3 rounded-xl transition-all duration-300 cursor-pointer ${
              selectedMemberId === member.id
                ? 'bg-white shadow-lg scale-105'
                : 'hover:bg-white/80 hover:shadow-md'
            }`}
            onClick={() => setSelectedMemberId(member.id)}
          >
            <div className="relative">
              <img
                src={avatarUrl}
                alt={member.name}
                className={`h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-lg transition-all duration-300 group-hover:scale-105 ${
                  selectedMemberId === member.id
                    ? `ring-2 ring-offset-2 ${colorClasses.ring} ${colorClasses.shadow} scale-110`
                    : `group-hover:ring-1 group-hover:ring-offset-1 ${colorClasses.hover} group-hover:shadow-md`
                }`}
              />

              {selectedMemberId === member.id && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-lg ring-1 ring-white">
                  <div className={`${colorClasses.bg} rounded-full p-1`}>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center">
              <p
                className={`text-sm font-semibold transition-all duration-300 ${
                  selectedMemberId === member.id
                    ? "text-gray-900 scale-105"
                    : "text-gray-600 group-hover:text-gray-800"
                }`}
              >
                {member.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{member.type}</p>
              {selectedMemberId === member.id && (
                <div
                  className={`h-1 w-10 ${colorClasses.bg} rounded-full mt-1 shadow-sm`}
                />
              )}
            </div>
          </div>
        )
      })}

      {/* View Mode Toggle - Moved to the right */}
      {selectedMemberId && (
        <div className="flex-shrink-0">
          <Label className="text-sm font-medium text-gray-700">View Mode</Label>
          <div className="flex space-x-1 mt-1">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="flex items-center space-x-2"
            >
              <span>Calendar View</span>
            </Button>
            <Button
              variant={viewMode === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('group')}
              className="flex items-center space-x-2"
              disabled={true}
            >
              <span>Group View</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

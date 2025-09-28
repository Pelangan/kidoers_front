import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'
import { generateAvatarUrl } from '../../../ui/AvatarSelector'
import type { EnhancedFamilyMember } from '/Users/cristian/Development/kidoers/kidoers_workspace/kidoers_front/app/components/routines/builder/types/routineBuilderTypes'

interface FamilyMemberSelectorProps {
  enhancedFamilyMembers: EnhancedFamilyMember[]
  selectedMemberIds: string[]
  setSelectedMemberIds: (ids: string[]) => void
  getMemberColors: (color: string) => { border: string; bg: string; bgColor: string; borderColor: string }
  viewMode: 'calendar' | 'group'
  setViewMode: (mode: 'calendar' | 'group') => void
}

export const FamilyMemberSelector: React.FC<FamilyMemberSelectorProps> = ({
  enhancedFamilyMembers,
  selectedMemberIds,
  setSelectedMemberIds,
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

        // Use the custom colors from getMemberColors function
        const memberColors = getMemberColors(member.color)

        const isSelected = selectedMemberIds.includes(member.id)
        
        const handleMemberClick = () => {
          if (isSelected) {
            // Remove member from selection
            setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id))
          } else {
            // Add member to selection
            setSelectedMemberIds([...selectedMemberIds, member.id])
          }
        }

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 cursor-pointer group transition-all duration-300"
            onClick={handleMemberClick}
          >
            <div className="relative">
              <div
                className={`h-12 w-12 rounded-full overflow-hidden border-2 shadow-lg transition-all duration-300 group-hover:scale-105 ${
                  isSelected
                    ? `ring-2 ring-offset-2 scale-110`
                    : `group-hover:ring-1 group-hover:ring-offset-1 group-hover:shadow-md`
                }`}
                style={{
                  borderColor: isSelected ? memberColors.borderColor : '#ffffff',
                  boxShadow: isSelected 
                    ? `0 0 0 2px ${memberColors.borderColor}` 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = memberColors.borderColor
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${memberColors.borderColor}`
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#ffffff'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }
                }}
              >
                <img
                  src={avatarUrl}
                  alt={`${member.name}'s avatar`}
                  className="h-full w-full object-cover scale-110"
                />
              </div>

              {isSelected && (
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-lg ring-1 ring-white">
                  <div 
                    className="rounded-full p-1"
                    style={{ backgroundColor: memberColors.borderColor }}
                  >
                    <Check className="h-3 w-3 text-white stroke-[2]" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <p
                className={`text-sm font-semibold transition-all duration-300 ${
                  isSelected
                    ? "text-gray-900 scale-105"
                    : "text-gray-600 group-hover:text-gray-800"
                }`}
              >
                {member.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{member.type}</p>
              {isSelected && (
                <div
                  className="h-1 w-10 rounded-full mt-1 shadow-sm"
                  style={{ backgroundColor: memberColors.borderColor }}
                />
              )}
            </div>
          </div>
        )
      })}

      {/* View Mode Toggle - Moved to the right */}
      {selectedMemberIds.length > 0 && (
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

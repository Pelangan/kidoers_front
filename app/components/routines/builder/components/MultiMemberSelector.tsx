'use client'

import { useState, useEffect } from 'react'
import { Button } from '../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../components/ui/card'
import { Badge } from '../../../../../components/ui/badge'
import { Users, Baby, UserCheck, Check, X } from 'lucide-react'
import { generateAvatarUrl } from '../../../ui/AvatarSelector'
import type { FamilyMember } from '../types/routineBuilderTypes'

interface MultiMemberSelectorProps {
  familyMembers: FamilyMember[]
  selectedMemberIds: string[]
  onSelectionChange: (memberIds: string[]) => void
  defaultMemberId?: string
  className?: string
}

export function MultiMemberSelector({
  familyMembers,
  selectedMemberIds,
  onSelectionChange,
  defaultMemberId,
  className = ""
}: MultiMemberSelectorProps) {
  const [showAllOptions, setShowAllOptions] = useState(false)

  // Initialize with default member if provided
  useEffect(() => {
    if (defaultMemberId && selectedMemberIds.length === 0) {
      onSelectionChange([defaultMemberId])
    }
  }, [defaultMemberId, selectedMemberIds.length, onSelectionChange])

  const handleQuickSelect = (type: 'all' | 'kids' | 'parents') => {
    let memberIds: string[] = []
    
    switch (type) {
      case 'all':
        memberIds = familyMembers.map(member => member.id)
        break
      case 'kids':
        memberIds = familyMembers.filter(member => member.role === 'child').map(member => member.id)
        break
      case 'parents':
        memberIds = familyMembers.filter(member => member.role === 'parent').map(member => member.id)
        break
    }
    
    onSelectionChange(memberIds)
  }

  const handleMemberToggle = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      onSelectionChange(selectedMemberIds.filter(id => id !== memberId))
    } else {
      onSelectionChange([...selectedMemberIds, memberId])
    }
  }

  const selectedMembers = familyMembers.filter(member => selectedMemberIds.includes(member.id))
  const kidsCount = familyMembers.filter(member => member.role === 'child').length
  const parentsCount = familyMembers.filter(member => member.role === 'parent').length

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Selection Buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Quick Selection</label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedMemberIds.length === familyMembers.length ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickSelect('all')}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            All Family ({familyMembers.length})
          </Button>
          
          {kidsCount > 0 && (
            <Button
              variant={selectedMembers.filter(m => m.role === 'child').length === kidsCount ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickSelect('kids')}
              className="flex items-center gap-2"
            >
              <Baby className="w-4 h-4" />
              All Kids ({kidsCount})
            </Button>
          )}
          
          {parentsCount > 0 && (
            <Button
              variant={selectedMembers.filter(m => m.role === 'parent').length === parentsCount ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickSelect('parents')}
              className="flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              All Parents ({parentsCount})
            </Button>
          )}
        </div>
      </div>

      {/* Individual Member Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Individual Selection</label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllOptions(!showAllOptions)}
            className="text-xs"
          >
            {showAllOptions ? 'Hide' : 'Show'} All Members
          </Button>
        </div>
        
        {showAllOptions && (
          <div className="grid grid-cols-2 gap-2">
            {familyMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id)
              const avatarUrl = member.avatar_url || generateAvatarUrl(member.avatar_style || 'adventurer', member.name)
              
              return (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleMemberToggle(member.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={avatarUrl}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                          style={{ backgroundColor: member.color, display: 'none' }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.name}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Members Preview */}
      {selectedMemberIds.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Selected Members ({selectedMemberIds.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((member) => {
              const avatarUrl = member.avatar_url || generateAvatarUrl(member.avatar_style || 'adventurer', member.name)
              
              return (
                <div
                  key={member.id}
                  className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1"
                >
                  <img
                    src={avatarUrl}
                    alt={member.name}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-medium text-xs"
                    style={{ backgroundColor: member.color, display: 'none' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{member.name}</span>
                  <button
                    onClick={() => handleMemberToggle(member.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Multi-member indicator */}
      {selectedMemberIds.length > 1 && (
        <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-2">
          <Users className="w-4 h-4" />
          <span>This task will be assigned to {selectedMemberIds.length} members</span>
        </div>
      )}
    </div>
  )
}

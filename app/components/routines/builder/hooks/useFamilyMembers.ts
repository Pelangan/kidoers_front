import { useState, useEffect } from 'react'
import { apiService } from '../../../../lib/api'
import { generateAvatarUrl } from '../../../ui/AvatarSelector'
import type { FamilyMember, EnhancedFamilyMember, TaskGroup, Task } from '../types/routineBuilderTypes'

export const useFamilyMembers = (familyId: string | null) => {
  // Family members state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [enhancedFamilyMembers, setEnhancedFamilyMembers] = useState<EnhancedFamilyMember[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  // Color mapping function for family members - using specific Google Calendar colors
  const getMemberColors = (color: string) => {
    const colorMap: Record<string, { border: string; bg: string; bgColor: string; borderColor: string }> = {
      // First member - Celtic Blue #1967D2
      blue: { 
        border: 'border-blue-300', 
        bg: 'bg-blue-50', 
        bgColor: '#e3f2fd', 
        borderColor: '#1967D2' 
      },
      // Second member - Selective Yellow #FBBC04
      yellow: { 
        border: 'border-yellow-300', 
        bg: 'bg-yellow-50', 
        bgColor: '#fffbf0', 
        borderColor: '#FBBC04' 
      },
      // Third member - Pigment Red #F72A25
      red: { 
        border: 'border-red-300', 
        bg: 'bg-red-50', 
        bgColor: '#fef2f2', 
        borderColor: '#F72A25' 
      },
      // Fourth member - Sea Green #34A853
      green: { 
        border: 'border-green-300', 
        bg: 'bg-green-50', 
        bgColor: '#f0fdf4', 
        borderColor: '#34A853' 
      },
      // Fifth member - Dark Spring Green #188038
      emerald: { 
        border: 'border-emerald-300', 
        bg: 'bg-emerald-50', 
        bgColor: '#ecfdf5', 
        borderColor: '#188038' 
      },
      // Fallback colors for additional members
      purple: { border: 'border-purple-300', bg: 'bg-purple-50', bgColor: '#f3e8ff', borderColor: '#c4b5fd' },
      pink: { border: 'border-pink-300', bg: 'bg-pink-50', bgColor: '#fce7f3', borderColor: '#f9a8d4' },
      orange: { border: 'border-orange-300', bg: 'bg-orange-50', bgColor: '#fff7ed', borderColor: '#fdba74' },
      indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50', bgColor: '#eef2ff', borderColor: '#a5b4fc' },
      teal: { border: 'border-teal-300', bg: 'bg-teal-50', bgColor: '#f0fdfa', borderColor: '#5eead4' }
    }
    return colorMap[color] || colorMap.blue
  }

  // Load family members
  const loadFamilyMembers = async () => {
    if (!familyId) return

    try {
      const members = await apiService.getFamilyMembers(familyId)

      // Convert API response to FamilyMember type and set family members
      // Assign specific colors based on member order
      const colorOrder = ['blue', 'yellow', 'red', 'green', 'emerald']
      const convertedMembers: FamilyMember[] = members.map((member: any, index: number) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        color: colorOrder[index] || 'blue', // Assign color based on order
        age: member.age,
        avatar_url: member.avatar_url,
        avatar_style: member.avatar_style,
        avatar_seed: member.avatar_seed,
        avatar_options: typeof member.avatar_options === 'string' 
          ? JSON.parse(member.avatar_options || '{}') 
          : member.avatar_options || {},
        calmMode: false, // Default value
        textToSpeech: false, // Default value
        // Backward compatibility fields
        avatarStyle: member.avatar_style,
        avatarOptions: typeof member.avatar_options === 'string' 
          ? JSON.parse(member.avatar_options || '{}') 
          : member.avatar_options || {},
        avatarUrl: member.avatar_url
      }))
      
      setFamilyMembers(convertedMembers)
      
      // Enhance family members with the structure needed for the routine builder
      const enhanced = convertedMembers.map((member) => {
        const colors = getMemberColors(member.color)
        
        return {
          id: member.id,
          name: member.name,
          type: member.role,
          color: member.color, // Keep original color for avatar generation
          avatar_url: member.avatar_url,
          avatar_style: member.avatar_style,
          avatar_seed: member.avatar_seed,
          avatar_options: member.avatar_options,
          borderColor: colors.border,
          taskBgColor: colors.bg,
          groups: [],
          individualTasks: []
        }
      })
      setEnhancedFamilyMembers(enhanced)
      
      // Set the first family member as selected by default
      if (enhanced.length > 0 && selectedMemberIds.length === 0) {
        setSelectedMemberIds([enhanced[0].id])
      }

      return enhanced
    } catch (error) {
      console.error('Error loading family members:', error)
      throw error
    }
  }

  // Get selected members
  const getSelectedMembers = () => {
    return enhancedFamilyMembers.filter(m => selectedMemberIds.includes(m.id))
  }
  
  // Get first selected member (for backward compatibility)
  const getSelectedMember = () => {
    return enhancedFamilyMembers.find(m => m.id === selectedMemberIds[0])
  }

  // Get member by ID
  const getMemberById = (id: string) => {
    return enhancedFamilyMembers.find(m => m.id === id)
  }

  // Get member name by ID
  const getMemberNameById = (id: string) => {
    const member = getMemberById(id)
    return member?.name || 'Unknown'
  }

  return {
    // State
    familyMembers,
    enhancedFamilyMembers,
    selectedMemberIds,
    
    // Setters
    setFamilyMembers,
    setEnhancedFamilyMembers,
    setSelectedMemberIds,
    
    // Functions
    loadFamilyMembers,
    getMemberColors,
    getSelectedMembers,
    getSelectedMember, // For backward compatibility
    getMemberById,
    getMemberNameById
  }
}

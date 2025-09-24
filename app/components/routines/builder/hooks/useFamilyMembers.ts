import { useState, useEffect } from 'react'
import { apiService } from '../../../../lib/api'
import { generateAvatarUrl } from '../../../ui/AvatarSelector'
import type { FamilyMember } from '../types/routineBuilderTypes'

interface EnhancedFamilyMember {
  id: string
  name: string
  type: string
  color: string
  avatar_url?: string
  avatar_style?: string
  avatar_seed?: string
  avatar_options?: any
  borderColor: string
  taskBgColor: string
  groups: any[]
  individualTasks: any[]
}

export const useFamilyMembers = (familyId: string | null) => {
  // Family members state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [enhancedFamilyMembers, setEnhancedFamilyMembers] = useState<EnhancedFamilyMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  // Color mapping function for family members
  const getMemberColors = (color: string) => {
    const colorMap: Record<string, { border: string; bg: string; bgColor: string; borderColor: string }> = {
      blue: { border: 'border-blue-300', bg: 'bg-blue-50', bgColor: '#dbeafe', borderColor: '#93c5fd' },
      green: { border: 'border-green-300', bg: 'bg-green-50', bgColor: '#dcfce7', borderColor: '#86efac' },
      purple: { border: 'border-purple-300', bg: 'bg-purple-50', bgColor: '#f3e8ff', borderColor: '#c4b5fd' },
      pink: { border: 'border-pink-300', bg: 'bg-pink-50', bgColor: '#fce7f3', borderColor: '#f9a8d4' },
      yellow: { border: 'border-yellow-300', bg: 'bg-yellow-50', bgColor: '#fefce8', borderColor: '#fde047' },
      orange: { border: 'border-orange-300', bg: 'bg-orange-50', bgColor: '#fff7ed', borderColor: '#fdba74' },
      red: { border: 'border-red-300', bg: 'bg-red-50', bgColor: '#fef2f2', borderColor: '#fca5a5' },
      indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50', bgColor: '#eef2ff', borderColor: '#a5b4fc' },
      teal: { border: 'border-teal-300', bg: 'bg-teal-50', bgColor: '#f0fdfa', borderColor: '#5eead4' },
      cyan: { border: 'border-cyan-300', bg: 'bg-cyan-50', bgColor: '#ecfeff', borderColor: '#67e8f9' }
    }
    return colorMap[color] || colorMap.blue
  }

  // Load family members
  const loadFamilyMembers = async () => {
    if (!familyId) return

    try {
      console.log('[KIDOERS-ROUTINE] 📞 ManualRoutineBuilder: Calling getFamilyMembers()')
      const members = await apiService.getFamilyMembers(familyId)
      
      console.log('[KIDOERS-ROUTINE] ✅ ManualRoutineBuilder: API data loaded:', { 
        membersCount: members?.length || 0
      })

      // Convert API response to FamilyMember type and set family members
      const convertedMembers: FamilyMember[] = members.map((member: any) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        color: member.color,
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
      console.log('[KIDOERS-ROUTINE] Enhanced family members loaded:', enhanced)
      
      // Set the first family member as selected by default
      if (enhanced.length > 0 && !selectedMemberId) {
        setSelectedMemberId(enhanced[0].id)
        console.log('[KIDOERS-ROUTINE] Set default selected member:', enhanced[0].id, enhanced[0].name)
      }

      return enhanced
    } catch (error) {
      console.error('[KIDOERS-ROUTINE] Error loading family members:', error)
      throw error
    }
  }

  // Get selected member
  const getSelectedMember = () => {
    return enhancedFamilyMembers.find(m => m.id === selectedMemberId)
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
    selectedMemberId,
    
    // Setters
    setFamilyMembers,
    setEnhancedFamilyMembers,
    setSelectedMemberId,
    
    // Functions
    loadFamilyMembers,
    getMemberColors,
    getSelectedMember,
    getMemberById,
    getMemberNameById
  }
}

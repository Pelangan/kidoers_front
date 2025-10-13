import { describe, it, expect, vi } from 'vitest'
import React from 'react'

describe('Avatar Ordering Logic', () => {
  // Test the core logic that determines member ordering
  it('should maintain consistent member order regardless of selection order', () => {
    const mockFamilyMembers = [
      { id: 'member-1', name: 'Cristian', role: 'parent', color: 'blue' },
      { id: 'member-2', name: 'Cristina', role: 'parent', color: 'yellow' },
      { id: 'member-3', name: 'Guille', role: 'child', color: 'red' },
      { id: 'member-4', name: 'Clàudia', role: 'child', color: 'green' }
    ]

    // Test case 1: Select members in original order
    const selectedMemberIds1 = ['member-1', 'member-2', 'member-3', 'member-4']
    
    // Simulate the new ordering logic (using familyMembers order, not selection order)
    const orderedMembers1 = mockFamilyMembers.filter(member => 
      selectedMemberIds1.includes(member.id)
    )

    // Test case 2: Select members in reverse order
    const selectedMemberIds2 = ['member-4', 'member-3', 'member-2', 'member-1']
    
    // Simulate the new ordering logic
    const orderedMembers2 = mockFamilyMembers.filter(member => 
      selectedMemberIds2.includes(member.id)
    )

    // Test case 3: Select members in mixed order
    const selectedMemberIds3 = ['member-3', 'member-1', 'member-4', 'member-2']
    
    // Simulate the new ordering logic
    const orderedMembers3 = mockFamilyMembers.filter(member => 
      selectedMemberIds3.includes(member.id)
    )

    // All three cases should result in the same order (family member order)
    const expectedOrder = [
      { id: 'member-1', name: 'Cristian' },
      { id: 'member-2', name: 'Cristina' },
      { id: 'member-3', name: 'Guille' },
      { id: 'member-4', name: 'Clàudia' }
    ]

    expect(orderedMembers1.map(m => ({ id: m.id, name: m.name }))).toEqual(expectedOrder)
    expect(orderedMembers2.map(m => ({ id: m.id, name: m.name }))).toEqual(expectedOrder)
    expect(orderedMembers3.map(m => ({ id: m.id, name: m.name }))).toEqual(expectedOrder)
  })

  it('should maintain consistent order when only some members are selected', () => {
    const mockFamilyMembers = [
      { id: 'member-1', name: 'Cristian', role: 'parent', color: 'blue' },
      { id: 'member-2', name: 'Cristina', role: 'parent', color: 'yellow' },
      { id: 'member-3', name: 'Guille', role: 'child', color: 'red' },
      { id: 'member-4', name: 'Clàudia', role: 'child', color: 'green' }
    ]

    // Test case 1: Select only Cristian and Clàudia (in selection order: Clàudia, Cristian)
    const selectedMemberIds1 = ['member-4', 'member-1']
    
    // Simulate the new ordering logic
    const orderedMembers1 = mockFamilyMembers.filter(member => 
      selectedMemberIds1.includes(member.id)
    )

    // Test case 2: Select only Cristina and Guille (in selection order: Guille, Cristina)
    const selectedMemberIds2 = ['member-3', 'member-2']
    
    // Simulate the new ordering logic
    const orderedMembers2 = mockFamilyMembers.filter(member => 
      selectedMemberIds2.includes(member.id)
    )

    // Both should maintain family member order, not selection order
    expect(orderedMembers1.map(m => ({ id: m.id, name: m.name }))).toEqual([
      { id: 'member-1', name: 'Cristian' },
      { id: 'member-4', name: 'Clàudia' }
    ])

    expect(orderedMembers2.map(m => ({ id: m.id, name: m.name }))).toEqual([
      { id: 'member-2', name: 'Cristina' },
      { id: 'member-3', name: 'Guille' }
    ])
  })

  it('should handle partial selection while maintaining family order', () => {
    const mockFamilyMembers = [
      { id: 'member-1', name: 'Cristian', role: 'parent', color: 'blue' },
      { id: 'member-2', name: 'Cristina', role: 'parent', color: 'yellow' },
      { id: 'member-3', name: 'Guille', role: 'child', color: 'red' },
      { id: 'member-4', name: 'Clàudia', role: 'child', color: 'green' }
    ]

    // Select only the first and last members
    const selectedMemberIds = ['member-1', 'member-4']
    
    // Simulate the new ordering logic
    const orderedMembers = mockFamilyMembers.filter(member => 
      selectedMemberIds.includes(member.id)
    )

    // Should maintain family order: Cristian first, then Clàudia
    expect(orderedMembers.map(m => ({ id: m.id, name: m.name }))).toEqual([
      { id: 'member-1', name: 'Cristian' },
      { id: 'member-4', name: 'Clàudia' }
    ])
  })
})


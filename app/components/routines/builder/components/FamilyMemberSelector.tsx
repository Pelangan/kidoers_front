import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ChevronDown, Check, Search } from 'lucide-react'
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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all'|'kids'|'parents'>('all')
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInsideTrigger = containerRef.current?.contains(target)
      const clickedInsideDropdown = dropdownRef.current?.contains(target)
      if (open && !clickedInsideTrigger && !clickedInsideDropdown) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX })
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enhancedFamilyMembers
      .filter(m => filter === 'all' || (filter === 'kids' ? m.type === 'child' : m.type === 'parent'))
      .filter(m => !q || m.name.toLowerCase().includes(q))
  }, [enhancedFamilyMembers, query, filter])

  const toggleMember = (id: string) => {
    const isSelected = selectedMemberIds.includes(id)
    if (isSelected) {
      if (selectedMemberIds.length === 1) return // keep at least one selected
      setSelectedMemberIds(selectedMemberIds.filter(x => x !== id))
    } else {
      setSelectedMemberIds([...selectedMemberIds, id])
    }
  }

  const summaryLabel = useMemo(() => {
    if (selectedMemberIds.length === enhancedFamilyMembers.length) return 'All members'
    const names = enhancedFamilyMembers
      .filter(m => selectedMemberIds.includes(m.id))
      .map(m => m.name)
    return names.slice(0, 2).join(', ') + (names.length > 2 ? `, +${names.length - 2}` : '')
  }, [selectedMemberIds, enhancedFamilyMembers])

  return (
    <div ref={containerRef} className="flex items-end gap-6">
      {/* Visible members button */}
      <div className="relative flex items-center gap-3">
        <Button ref={buttonRef} variant="outline" size="sm" onClick={() => setOpen(!open)} className="rounded-full px-4">
          <span className="text-sm">Visible members:&nbsp;{summaryLabel}</span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>

        {open && menuPosition && (
          <div
            ref={dropdownRef}
            className="fixed z-[100] w-[360px] bg-white border border-gray-200 rounded-xl shadow-xl p-3"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="text-sm font-semibold px-1">Select visible members</div>
            <div className="flex items-center gap-2 mt-2 px-1">
              <div className="relative flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full border rounded-lg px-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center gap-2 px-1 mt-2">
              <Button variant={filter==='all'?'default':'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
              <Button variant={filter==='kids'?'default':'outline'} size="sm" onClick={() => setFilter('kids')}>Only Kids</Button>
              <Button variant={filter==='parents'?'default':'outline'} size="sm" onClick={() => setFilter('parents')}>Only Parents</Button>
            </div>

            <div className="my-3 h-px bg-gray-200" />

            <div className="max-h-[70vh] overflow-auto pr-1">
              {filtered.map(m => {
                const selected = selectedMemberIds.includes(m.id)
                const colors = getMemberColors(m.color)
                const avatarUrl = m.avatar_url || generateAvatarUrl(
                  m.avatar_seed || m.name.toLowerCase().replace(/\s+/g, '-'),
                  m.avatar_style || 'adventurer',
                  m.avatar_options || {}
                )
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border ${selected? 'bg-blue-600 border-blue-600':'bg-white border-gray-300'}`}> 
                        {selected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="w-8 h-8 rounded-full overflow-hidden" style={{ boxShadow: `0 0 0 2px ${colors.borderColor}` }}>
                        <img src={avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-sm text-gray-800">{m.name}</div>
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{m.type}</div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 text-xs text-gray-500 px-1">Selected: {selectedMemberIds.length} / Total: {enhancedFamilyMembers.length}</div>
          </div>
        )}
      </div>

      {/* View Mode Toggle - on the right */}
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

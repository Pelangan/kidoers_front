'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ChevronDown, 
  Check, 
  Search,
  Edit3
} from 'lucide-react'

const AVATAR_STYLES = [
  { value: 'adventurer', label: 'Adventurer', category: 'Cartoon', type: 'standard' },
  { value: 'avataaars', label: 'Avataaars', category: 'Cartoon', type: 'standard' },
  { value: 'big-ears', label: 'Big Ears', category: 'Cartoon', type: 'standard' },
  { value: 'bottts', label: 'Bottts', category: 'Robot', type: 'standard' },
  { value: 'croodles', label: 'Croodles', category: 'Doodle', type: 'standard' },
  { value: 'fun-emoji', label: 'Fun Emoji', category: 'Emoji', type: 'standard' },
  { value: 'lorelei', label: 'Lorelei', category: 'Fantasy', type: 'standard' },
  { value: 'micah', label: 'Micah', category: 'Simple', type: 'standard' },
  { value: 'miniavs', label: 'Miniavs', category: 'Minimalist', type: 'standard' },
  { value: 'notionists', label: 'Notionists', category: 'Professional', type: 'standard' },
  { value: 'open-peeps', label: 'Open Peeps', category: 'Diverse', type: 'standard' },
  { value: 'personas', label: 'Personas', category: 'Modern', type: 'standard' },
  { value: 'beam', label: 'Beam', category: 'Geometric', type: 'standard' },
  { value: 'marble', label: 'Marble', category: 'Abstract', type: 'standard' },
  { value: 'rings', label: 'Rings', category: 'Abstract', type: 'standard' },
  { value: 'sunset', label: 'Sunset', category: 'Abstract', type: 'standard' },
  { value: 'wave', label: 'Wave', category: 'Abstract', type: 'standard' },
  { value: 'identicon', label: 'Identicon', category: 'Geometric', type: 'standard' },
  { value: 'initials', label: 'Initials', category: 'Simple', type: 'standard' },
  { value: 'shapes', label: 'Shapes', category: 'Geometric', type: 'standard' }
]

const PRO_AVATARS = [
  { value: 'md_avatar_godzilla', label: 'Godzilla', category: 'Monsters', type: 'pro', imageUrl: '/md_avatar_godzilla.png' }
]

interface AvatarSelectorProps {
  selectedStyle: string
  selectedSeed: string
  selectedOptions: Record<string, any>
  onStyleChange: (style: string) => void
  onSeedChange: (seed: string) => void
  onOptionsChange: (options: Record<string, any>) => void
  onSave: () => void
  isOpen: boolean
  onClose: () => void
  memberName: string
  className?: string
}

export default function AvatarSelector({
  selectedStyle,
  selectedSeed,
  selectedOptions,
  onStyleChange,
  onSeedChange,
  onOptionsChange,
  onSave,
  isOpen,
  onClose,
  memberName,
  className = ""
}: AvatarSelectorProps) {
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false)
  const [styleSearchTerm, setStyleSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [avatarLoadError, setAvatarLoadError] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isStyleDropdownOpen && !target.closest('.avatar-style-dropdown')) {
        setIsStyleDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isStyleDropdownOpen])

  // Debug avatar style changes
  useEffect(() => {
    console.log('Avatar style changed to:', selectedStyle)
    console.log('Avatar URL:', generateAvatarUrl(selectedSeed, selectedStyle, selectedOptions))
    setAvatarLoadError(false) // Reset error state when style changes
  }, [selectedStyle, selectedSeed, selectedOptions])

  const generateAvatarUrl = (seed: string, style: string, options: Record<string, any> = {}) => {
    // Check if it's a Pro avatar
    const proAvatar = PRO_AVATARS.find(avatar => avatar.value === style)
    if (proAvatar) {
      return proAvatar.imageUrl
    }
    
    // Standard DiceBear avatar
    const baseUrl = 'https://api.dicebear.com/7.x'
    const optionsString = Object.entries(options)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
    
    return `${baseUrl}/${style}/svg?seed=${seed}${optionsString ? `&${optionsString}` : ''}`
  }

  // Get unique categories from both standard and pro avatars
  const allAvatars = [...AVATAR_STYLES, ...PRO_AVATARS]
  const categories = ['All', ...Array.from(new Set(allAvatars.map(style => style.category)))]

  // Filter styles based on search and category
  const filteredStyles = allAvatars.filter(style => {
    const matchesSearch = style.label.toLowerCase().includes(styleSearchTerm.toLowerCase()) ||
                         style.value.toLowerCase().includes(styleSearchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || style.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl z-[100] overflow-visible" style={{ maxHeight: '90vh' }}>
        <DialogHeader>
          <DialogTitle>Customize {memberName}'s Avatar</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative overflow-visible">
          {/* Avatar Preview */}
          <div className="space-y-4">
            <div className="text-center">
              {avatarLoadError ? (
                <div className="w-32 h-32 mx-auto rounded-full border-4 border-border bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-1">😕</div>
                    <div className="text-xs text-gray-500">Avatar not available</div>
                  </div>
                </div>
              ) : (
                <img
                  key={`${selectedSeed}-${selectedStyle}`}
                  src={generateAvatarUrl(selectedSeed, selectedStyle, selectedOptions)}
                  alt="Avatar preview"
                  className="w-32 h-32 mx-auto rounded-full border-4 border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    console.error('Avatar load error for:', {
                      style: selectedStyle,
                      seed: selectedSeed,
                      url: target.src,
                      error: e
                    })
                    setAvatarLoadError(true)
                  }}
                  onLoad={() => {
                    console.log('Avatar loaded successfully:', {
                      style: selectedStyle,
                      seed: selectedSeed,
                      url: generateAvatarUrl(selectedSeed, selectedStyle, selectedOptions)
                    })
                    setAvatarLoadError(false)
                  }}
                />
              )}
              <div className="text-xs text-muted-foreground mt-2">
                Style: {selectedStyle} | Seed: {selectedSeed}
                {avatarLoadError && <span className="text-red-500 ml-2">(Error loading)</span>}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="avatar-seed">Avatar Seed</Label>
              <Input
                id="avatar-seed"
                value={selectedSeed}
                onChange={(e) => onSeedChange(e.target.value)}
                placeholder="Enter seed for avatar generation"
              />
            </div>
          </div>

          {/* Customization Options */}
          <div className="space-y-4 overflow-visible">
            <div className="space-y-2 relative overflow-visible">
              <Label>Avatar Style</Label>
              <div className="relative avatar-style-dropdown">
                <button
                  type="button"
                  onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span>{allAvatars.find(s => s.value === selectedStyle)?.label || 'Select style'}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
                
                {isStyleDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-[200] mt-1 max-h-[400px] overflow-y-auto rounded-md border bg-white text-foreground shadow-lg avatar-style-dropdown">
                    {/* Search and Category Filter */}
                    <div className="p-3 border-b border-gray-200">
                      <div className="space-y-2">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search styles..."
                            value={styleSearchTerm}
                            onChange={(e) => setStyleSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-1">
                          {categories.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setSelectedCategory(category)}
                              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                selectedCategory === category
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Styles List */}
                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredStyles.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No styles found matching your search.
                        </div>
                      ) : (
                        filteredStyles.map((style) => (
                          <button
                            key={style.value}
                            type="button"
                            onClick={() => {
                              console.log('Changing avatar style from', selectedStyle, 'to', style.value)
                              onStyleChange(style.value)
                              setIsStyleDropdownOpen(false)
                              setStyleSearchTerm('')
                              setSelectedCategory('All')
                            }}
                            className="relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700"
                            data-selected={selectedStyle === style.value}
                          >
                            {selectedStyle === style.value && (
                              <Check className="absolute left-2 h-4 w-4 text-blue-600" />
                            )}
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span>{style.label}</span>
                                {style.type === 'pro' && (
                                  <Badge variant="secondary" className="text-xs px-1 py-0 bg-gradient-warm text-white">
                                    PRO
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">{style.category}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Style-specific options would go here */}
            <div className="text-sm text-muted-foreground">
              <p>More customization options will be available based on the selected style.</p>
              <p>Each style has different customization parameters like hair, accessories, clothing, etc.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Export the avatar generation function for use in other components
export const generateAvatarUrl = (seed: string, style: string, options: Record<string, any> = {}) => {
  // Check if it's a Pro avatar
  const proAvatar = PRO_AVATARS.find(avatar => avatar.value === style)
  if (proAvatar) {
    return proAvatar.imageUrl
  }
  
  // Standard DiceBear avatar
  const baseUrl = 'https://api.dicebear.com/7.x'
  const optionsString = Object.entries(options)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  
  return `${baseUrl}/${style}/svg?seed=${seed}${optionsString ? `&${optionsString}` : ''}`
}

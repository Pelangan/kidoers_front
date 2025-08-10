'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Trophy, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Edit3, 
  Plus,
  Target,
  Star,
  Settings,
  ChevronDown,
  Check,
  Search
} from 'lucide-react'
import { storage } from '@/app/lib/storage'
import type { FamilyMember, Chore, Activity } from '../../../types'

interface FamilyMembersViewProps {
  familyName: string
}

interface MemberStats {
  completedChores: number
  pendingTasks: number
  pointsEarned: number
  overduePriorities: number
  totalChores: number
  completionRate: number
}

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

const AVATAR_OPTIONS = {
  adventurer: ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  avataaars: ['topType', 'accessoriesType', 'hairColor', 'facialHairType', 'clotheType', 'clotheColor', 'eyeType', 'eyebrowType', 'mouthType', 'skinColor'],
  'big-ears': ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  bottts: ['mouth', 'eyes', 'color'],
  croodles: ['mouth', 'eyes', 'color'],
  'fun-emoji': ['mouth', 'eyes', 'color'],
  lorelei: ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  micah: ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  miniavs: ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  notionists: ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  'open-peeps': ['hair', 'accessories', 'clothing', 'clothingGraphic'],
  personas: ['hair', 'accessories', 'clothing', 'clothingGraphic']
}

export default function FamilyMembersView({ familyName }: FamilyMembersViewProps) {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [avatarStyle, setAvatarStyle] = useState('adventurer')
  const [avatarSeed, setAvatarSeed] = useState('')
  const [avatarOptions, setAvatarOptions] = useState<Record<string, string>>({})
  const [chores, setChores] = useState<Chore[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [currentFamilyName, setCurrentFamilyName] = useState(familyName)
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false)
  const [styleSearchTerm, setStyleSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [avatarLoadError, setAvatarLoadError] = useState(false)

  useEffect(() => {
    loadFamilyData()
  }, [])

  useEffect(() => {
    if (selectedMember) {
      setAvatarSeed(selectedMember.name.toLowerCase().replace(/\s+/g, '-'))
      setAvatarStyle(selectedMember.avatarStyle || 'adventurer')
      setAvatarOptions(selectedMember.avatarOptions || {})
    }
  }, [selectedMember])

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
    console.log('Avatar style changed to:', avatarStyle)
    console.log('Avatar URL:', generateAvatarUrl(avatarSeed, avatarStyle, avatarOptions))
    setAvatarLoadError(false) // Reset error state when style changes
  }, [avatarStyle, avatarSeed, avatarOptions])

  // Test avatar URLs on component mount
  useEffect(() => {
    const testStyles = ['adventurer', 'avataaars', 'bottts', 'lorelei']
    testStyles.forEach(style => {
      const testUrl = generateAvatarUrl('test', style, {})
      console.log(`Testing ${style}:`, testUrl)
    })
  }, [])

  const loadFamilyData = () => {
    const family = storage.getFamily()
    const membersData = storage.getMembers()
    console.log('Loading family data:', family)
    console.log('Loading members data:', membersData)
    
    // Get family name from family object or use default
    const familyNameFromStorage = family?.name || familyName
    
    // Always try to get members from the members storage
    if (membersData && membersData.length > 0) {
      console.log('Found members in storage:', membersData)
      setMembers(membersData)
      setCurrentFamilyName(familyNameFromStorage)
      
      // Load chores and activities for stats calculation
      const storedChores = storage.getChores()
      const storedActivities = storage.getActivities()
      
      console.log('Stored chores:', storedChores)
      console.log('Stored activities:', storedActivities)
      
      setChores(storedChores || [])
      setActivities(storedActivities || [])
    } else {
      console.log('No members found in storage, creating sample data...')
      // Create some sample data for testing
      const sampleMembers: FamilyMember[] = [
        {
          id: '1',
          name: 'Cristian',
          role: 'parent',
          color: 'blue',
          age: null,
          calmMode: false,
          textToSpeech: false,
          avatarStyle: 'adventurer'
        },
        {
          id: '2', 
          name: 'Cristina',
          role: 'parent',
          color: 'green',
          age: null,
          calmMode: false,
          textToSpeech: false,
          avatarStyle: 'avataaars'
        },
        {
          id: '3',
          name: 'Clàudia',
          role: 'child',
          color: 'pink',
          age: 8,
          calmMode: false,
          textToSpeech: false,
          avatarStyle: 'lorelei'
        },
        {
          id: '4',
          name: 'Guille',
          role: 'child',
          color: 'orange',
          age: 6,
          calmMode: false,
          textToSpeech: false,
          avatarStyle: 'bottts'
        }
      ]
      
      setMembers(sampleMembers)
      setCurrentFamilyName('Urraca Clavera')
      
      // Create some sample chores for stats
      const sampleChores: Chore[] = [
        {
          id: '1',
          title: 'Make bed',
          description: 'Make your bed in the morning',
          frequency: 'daily',
          timeOfDay: 'morning',
          category: 'Before School',
          assignedTo: '3',
          points: 5,
          completed: true
        },
        {
          id: '2',
          title: 'Clean room',
          description: 'Clean and organize your room',
          frequency: 'weekly',
          timeOfDay: 'afternoon',
          category: 'Cleaning',
          assignedTo: '3',
          points: 10,
          completed: false
        },
        {
          id: '3',
          title: 'Do homework',
          description: 'Complete daily homework',
          frequency: 'daily',
          timeOfDay: 'afternoon',
          category: 'Before School',
          assignedTo: '4',
          points: 15,
          completed: true
        }
      ]
      
      setChores(sampleChores)
      setActivities([])
    }
  }

  const getMemberStats = (memberId: string): MemberStats => {
    const memberChores = chores.filter(chore => chore.assignedTo === memberId)
    const memberActivities = activities.filter(activity => 
      activity.assignedTo && activity.assignedTo.includes(memberId)
    )

    const completedChores = memberChores.filter(chore => chore.completed).length
    const totalChores = memberChores.length
    const pendingTasks = totalChores - completedChores
    const pointsEarned = memberChores
      .filter(chore => chore.completed)
      .reduce((sum, chore) => sum + (chore.points || 0), 0)
    
    // Calculate overdue priorities (chores not completed)
    const overduePriorities = memberChores.filter(chore => 
      !chore.completed
    ).length

    const completionRate = totalChores > 0 ? Math.round((completedChores / totalChores) * 100) : 0

    return {
      completedChores,
      pendingTasks,
      pointsEarned,
      overduePriorities,
      totalChores,
      completionRate
    }
  }

  const generateAvatarUrl = (seed: string, style: string, options: Record<string, string> = {}) => {
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

  const handleAvatarSave = () => {
    if (!selectedMember) return

    const updatedMembers = members.map(member => 
      member.id === selectedMember.id 
        ? { 
            ...member, 
            avatarStyle, 
            avatarOptions,
            avatarUrl: generateAvatarUrl(avatarSeed, avatarStyle, avatarOptions)
          }
        : member
    )

    setMembers(updatedMembers)
    
    // Update family data in storage
    const family = storage.getFamily()
    if (family) {
      storage.setFamily({ ...family, members: updatedMembers })
    }

    setIsAvatarModalOpen(false)
  }

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, l => l.toUpperCase())
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            {capitalizeWords(currentFamilyName)} Family Members
          </h2>
          <p className="text-muted-foreground">Manage family members and view their progress</p>
        </div>
      </div>

      {/* Family Members Grid */}
      {members.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Family Members Found</h3>
          <p className="text-muted-foreground mb-6">
            It looks like no family members have been added yet. 
            <br />
            You can add family members in the Settings page or during onboarding.
          </p>
          <Button 
            onClick={() => {
              // Navigate to settings
              window.location.href = '/dashboard?view=settings'
            }}
            className="bg-gradient-warm text-white hover:bg-gradient-warm/90"
          >
            <Settings className="h-4 w-4 mr-2" />
            Go to Settings
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
          const stats = getMemberStats(member.id)
          const avatarUrl = member.avatarUrl || generateAvatarUrl(
            member.name.toLowerCase().replace(/\s+/g, '-'),
            member.avatarStyle || 'adventurer',
            member.avatarOptions || {}
          )

          return (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={avatarUrl}
                        alt={`${member.name}'s avatar`}
                        className="w-12 h-12 rounded-full border-2 border-border"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-6 w-6 p-0 rounded-full"
                        onClick={() => {
                          setSelectedMember(member)
                          setIsAvatarModalOpen(true)
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-green-700">{stats.completedChores}</div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-blue-700">{stats.pendingTasks}</div>
                    <div className="text-xs text-blue-600">Pending</div>
                  </div>
                  
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-yellow-700">{stats.pointsEarned}</div>
                    <div className="text-xs text-yellow-600">Points</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-red-700">{stats.overduePriorities}</div>
                    <div className="text-xs text-red-600">Overdue</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-semibold">{stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedMember(member)
                      setIsAvatarModalOpen(true)
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Customize Avatar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}

      {/* Avatar Customization Modal */}
      <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
        <DialogContent className="max-w-2xl z-[100] overflow-visible" style={{ maxHeight: '90vh' }}>
          <DialogHeader>
            <DialogTitle>Customize {selectedMember?.name}'s Avatar</DialogTitle>
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
                    key={`${avatarSeed}-${avatarStyle}`}
                    src={generateAvatarUrl(avatarSeed, avatarStyle, avatarOptions)}
                    alt="Avatar preview"
                    className="w-32 h-32 mx-auto rounded-full border-4 border-border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      console.error('Avatar load error for:', {
                        style: avatarStyle,
                        seed: avatarSeed,
                        url: target.src,
                        error: e
                      })
                      setAvatarLoadError(true)
                    }}
                    onLoad={() => {
                      console.log('Avatar loaded successfully:', {
                        style: avatarStyle,
                        seed: avatarSeed,
                        url: generateAvatarUrl(avatarSeed, avatarStyle, avatarOptions)
                      })
                      setAvatarLoadError(false)
                    }}
                  />
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  Style: {avatarStyle} | Seed: {avatarSeed}
                  {avatarLoadError && <span className="text-red-500 ml-2">(Error loading)</span>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar-seed">Avatar Seed</Label>
                <Input
                  id="avatar-seed"
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
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
                    <span>{allAvatars.find(s => s.value === avatarStyle)?.label || 'Select style'}</span>
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
                                console.log('Changing avatar style from', avatarStyle, 'to', style.value)
                                setAvatarStyle(style.value)
                                setIsStyleDropdownOpen(false)
                                setStyleSearchTerm('')
                                setSelectedCategory('All')
                              }}
                              className="relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-700"
                              data-selected={avatarStyle === style.value}
                            >
                              {avatarStyle === style.value && (
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
            <Button variant="outline" onClick={() => setIsAvatarModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAvatarSave}>
              Save Avatar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
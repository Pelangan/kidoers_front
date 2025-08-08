"use client"

import type React from "react"
import { useState } from "react"
import { Users, Plus, X, ChevronDown } from "lucide-react"
import type { FamilyMember } from "../OnboardingWizard"
import ColorPicker, { softColors } from "../../ui/ColorPicker"
import { apiService } from "../../../lib/api"
import { supabase } from "../../../lib/supabase"

interface CreateFamilyProps {
  familyName: string
  setFamilyName: (name: string) => void
  members: FamilyMember[]
  setMembers: (members: FamilyMember[]) => void
  onNext: () => void
}

export default function CreateFamily({ familyName, setFamilyName, members, setMembers, onNext }: CreateFamilyProps) {
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberAge, setNewMemberAge] = useState("5")
  const [newMemberRole, setNewMemberRole] = useState<"parent" | "child">("child")
  const [newMemberColor, setNewMemberColor] = useState("blue")
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!familyName.trim()) {
      setError("Please enter a family name")
      return
    }
    if (members.length === 0) {
      setError("Please add at least one family member")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("Please sign in to create a family")
      }

      // Convert members to API format
      const apiMembers = members.map(member => ({
        name: member.name,
        role: member.role,
        age: member.age || 5,
        color: member.color,
        avatar_url: member.avatar_url
      }))

      // Create family with members using the backend API
      const result = await apiService.createFamilyWithMembers(
        { name: familyName.trim() },
        apiMembers
      )

      // Store the created family and members in localStorage for compatibility
      const { members: createdMembers, ...familyData } = result
      
      // Update localStorage with the created data
      localStorage.setItem("kidoers_family", JSON.stringify(familyData))
      localStorage.setItem("kidoers_members", JSON.stringify(createdMembers))

      onNext()
    } catch (error) {
      console.error('Failed to create family:', error)
      if (error instanceof Error && error.message.includes("sign in")) {
        setError("Please sign in to create a family. You'll be redirected to the sign-in page.")
        // Redirect to sign-in page after a short delay
        setTimeout(() => {
          window.location.href = '/signin'
        }, 2000)
      } else {
        setError(error instanceof Error ? error.message : "Failed to create family. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const addMember = () => {
    if (!newMemberName.trim()) return
    
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
      age: parseInt(newMemberAge),
      calmMode: false,
      textToSpeech: false,
    }
    
    setMembers([...members, newMember])
    setNewMemberName("")
    setNewMemberAge("5")
    setNewMemberRole("child")
    setNewMemberColor("blue")
  }

  const removeMember = (id: string) => {
    setMembers(members.filter(member => member.id !== id))
  }

  const ageOptions = Array.from({ length: 18 }, (_, i) => i + 1)

  return (
    <div className="text-center">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-8 h-1 bg-primary rounded-full" />
        <div className="w-2 h-1 bg-muted rounded-full" />
        <div className="w-2 h-1 bg-muted rounded-full" />
        <div className="w-2 h-1 bg-muted rounded-full" />
        <span className="text-sm text-muted-foreground ml-2">1/4</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Create Your Family
        </h1>
        <p className="text-muted-foreground">
          Let's start by setting up your family profile
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Family Name */}
        <div className="text-left">
          <label htmlFor="familyName" className="block text-sm font-medium mb-2">
            Family Name
          </label>
          <input
            id="familyName"
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="The Smith Family"
            className="input w-full"
            autoFocus
          />
        </div>

        {/* Add Family Members Section */}
        <div className="text-left">
          <h3 className="text-lg font-semibold mb-4">Add Family Members</h3>
          
          {/* Input Fields */}
          <div className="flex items-center gap-3 mb-4">
            {/* Name Input */}
            <div className="flex-1">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter name"
                className="input w-full"
              />
            </div>

            {/* Age Dropdown */}
            <div className="relative">
              <select
                value={newMemberAge}
                onChange={(e) => setNewMemberAge(e.target.value)}
                className="input appearance-none pr-8"
              >
                {ageOptions.map(age => (
                  <option key={age} value={age.toString()}>
                    {age}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Role Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="input flex items-center justify-between min-w-[100px]"
              >
                <span className="capitalize">{newMemberRole}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {showRoleDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[100px]">
                  <button
                    type="button"
                    onClick={() => {
                      setNewMemberRole("parent")
                      setShowRoleDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-t-lg"
                  >
                    Parent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMemberRole("child")
                      setShowRoleDropdown(false)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-b-lg"
                  >
                    Child
                  </button>
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="relative">
              <ColorPicker
                selectedColor={newMemberColor}
                onColorChange={setNewMemberColor}
                className="w-32"
              />
            </div>
          </div>

          {/* Add Member Button */}
          <button
            type="button"
            onClick={addMember}
            disabled={!newMemberName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Users className="h-4 w-4" />
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>

        {/* Family Members List */}
        {members.length > 0 ? (
          <div className="text-left">
            <h3 className="text-lg font-semibold mb-4">Family Members</h3>
            
            <div className="space-y-3">
              {members.map((member) => {
                const colorData = softColors.find(c => c.value === member.color) || softColors[0]
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-card rounded-lg">
                    <div className={`w-10 h-10 ${colorData.bg} rounded-full flex items-center justify-center`}>
                      <span className={`text-sm font-bold ${colorData.text}`}>
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">Age {member.age || 5}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                        member.role === "parent" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-green-100 text-green-800"
                      }`}>
                        {member.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="p-1 hover:bg-muted rounded text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm">No family members added yet</p>
            <p className="text-muted-foreground text-sm">Add at least one child to continue</p>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button 
          type="submit" 
          className="btn-primary w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating Family..." : "Continue"}
        </button>
      </form>
    </div>
  )
}

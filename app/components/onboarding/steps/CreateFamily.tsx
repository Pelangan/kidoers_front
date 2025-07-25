"use client"

import type React from "react"
import { useState } from "react"
import { Users, Plus, X } from "lucide-react"
import type { FamilyMember } from "../OnboardingWizard"
import ColorPicker, { softColors } from "../../ui/ColorPicker"

interface CreateFamilyProps {
  familyName: string
  setFamilyName: (name: string) => void
  members: FamilyMember[]
  setMembers: (members: FamilyMember[]) => void
  onNext: () => void
}

export default function CreateFamily({ familyName, setFamilyName, members, setMembers, onNext }: CreateFamilyProps) {
  const [error, setError] = useState("")
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberRole, setNewMemberRole] = useState<"parent" | "child">("parent")
  const [newMemberColor, setNewMemberColor] = useState("blue")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) {
      setError("Please enter a family name")
      return
    }
    if (members.length === 0) {
      setError("Please add at least one family member")
      return
    }
    setError("")
    onNext()
  }

  const addMember = () => {
    if (!newMemberName.trim()) return
    
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newMemberName.trim(),
      role: newMemberRole,
      color: newMemberColor,
      calmMode: false,
      textToSpeech: false,
    }
    
    setMembers([...members, newMember])
    setNewMemberName("")
  }

  const addParent = () => {
    setNewMemberRole("parent")
    setNewMemberName("")
  }

  const addChild = () => {
    setNewMemberRole("child")
    setNewMemberName("")
  }

  const removeMember = (id: string) => {
    setMembers(members.filter(member => member.id !== id))
  }

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

        {/* Family Members */}
        <div className="text-left">
          <label className="block text-sm font-medium mb-2">
            Family Members
          </label>
          
          {/* Existing Members */}
          {members.map((member) => {
            const colorData = softColors.find(c => c.value === member.color) || softColors[0]
            return (
              <div key={member.id} className="flex items-center gap-3 mb-3 p-3 bg-card rounded-lg">
                <div className={`w-8 h-8 ${colorData.bg} rounded-full flex items-center justify-center`}>
                  <span className={`text-sm font-bold ${colorData.text}`}>
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 text-left">{member.name}</span>
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
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          {/* Add New Member */}
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <ColorPicker
              selectedColor={newMemberColor}
              onColorChange={setNewMemberColor}
              className="w-32"
            />
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder={newMemberRole === "parent" ? "Parent name" : "Child name"}
              className="flex-1 input bg-transparent border-none p-0 focus:ring-0"
            />
            <button
              type="button"
              onClick={addMember}
              disabled={!newMemberName.trim()}
              className="p-1 hover:bg-muted rounded disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add Member Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={addParent}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add Parent
            </button>
            <button
              type="button"
              onClick={addChild}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Add Child
            </button>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full">
          Continue
        </button>
      </form>
    </div>
  )
}

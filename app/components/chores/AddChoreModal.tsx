"use client"

import { useState } from "react"
import { X, Plus, Calendar, Clock, Users } from "lucide-react"
import type { Chore, FamilyMember } from "../onboarding/OnboardingWizard"

interface AddChoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (chore: Chore) => void
  members: FamilyMember[]
  existingChores?: Chore[]
}

export default function AddChoreModal({ isOpen, onClose, onSave, members, existingChores = [] }: AddChoreModalProps) {
  const [choreName, setChoreName] = useState("")
  const [description, setDescription] = useState("")
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "weekends">("daily")
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening">("morning")
  const [category, setCategory] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [points, setPoints] = useState(1)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState("")

  const categories = [
    "No Category",
    "Morning Routine",
    "Before School",
    "After School",
    "Kitchen",
    "Cleaning",
    "Outdoor",
    "Before Bed",
    "Weekend Activities"
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!choreName.trim() || !assignedTo) return

    const newChore: Chore = {
      id: Date.now().toString(),
      title: choreName.trim(),
      description: description.trim(),
      frequency,
      timeOfDay,
      category: category === "No Category" ? undefined : category,
      assignedTo,
      points,
      completed: false,
    }

    onSave(newChore)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setChoreName("")
    setDescription("")
    setFrequency("daily")
    setTimeOfDay("morning")
    setCategory("")
    setAssignedTo("")
    setPoints(1)
    setShowNewCategory(false)
    setNewCategory("")
  }

  const addNewCategory = () => {
    if (!newCategory.trim()) return
    categories.push(newCategory.trim())
    setCategory(newCategory.trim())
    setNewCategory("")
    setShowNewCategory(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-foreground">Add New Chore</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Chore Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Chore Name</label>
            <input
              type="text"
              value={choreName}
              onChange={(e) => setChoreName(e.target.value)}
              placeholder="Make bed, wash dishes..."
              className="input w-full"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the chore..."
              className="input w-full h-20 resize-none"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2">Frequency</label>
            <div className="flex gap-2">
              {[
                { value: "daily", label: "Daily", icon: Calendar },
                { value: "weekly", label: "Weekly", icon: Clock },
                { value: "weekends", label: "Weekends", icon: Users }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequency(option.value as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    frequency === option.value
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time of Day */}
          <div>
            <label className="block text-sm font-medium mb-2">Time of Day</label>
            <div className="flex gap-2">
              {["morning", "afternoon", "evening"].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTimeOfDay(time as any)}
                  className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                    timeOfDay === time
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Category (Optional)</label>
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="text-primary hover:underline text-sm"
              >
                + New Category
              </button>
            </div>
            
            {showNewCategory ? (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={addNewCategory}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
                >
                  Add
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-sm font-medium mb-2">Assign to</label>
            <div className="flex gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setAssignedTo(member.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    assignedTo === member.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="block text-sm font-medium mb-2">Points</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
              min="1"
              className="input w-24"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!choreName.trim() || !assignedTo}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Chore
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 
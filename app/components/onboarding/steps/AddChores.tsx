"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, Plus, X, Calendar, Clock, Users, Folder } from "lucide-react"
import type { Chore, FamilyMember } from "../OnboardingWizard"

interface AddChoresProps {
  chores: Chore[]
  setChores: (chores: Chore[]) => void
  members: FamilyMember[]
  onNext: () => void
  onBack: () => void
}

export default function AddChores({ chores, setChores, members, onNext, onBack }: AddChoresProps) {
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

  const addChore = () => {
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

    setChores([...chores, newChore])
    setChoreName("")
    setDescription("")
    setCategory("")
    setAssignedTo("")
    setPoints(1)
  }

  const removeChore = (id: string) => {
    setChores(chores.filter(chore => chore.id !== id))
  }

  const addNewCategory = () => {
    if (!newCategory.trim()) return
    categories.push(newCategory.trim())
    setCategory(newCategory.trim())
    setNewCategory("")
    setShowNewCategory(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-primary rounded-full" />
          <div className="w-8 h-1 bg-primary rounded-full" />
          <div className="w-2 h-1 bg-muted rounded-full" />
          <div className="w-2 h-1 bg-muted rounded-full" />
          <span className="text-sm text-muted-foreground ml-2">2/4</span>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Add Chores
        </h1>
        <p className="text-muted-foreground">
          Create tasks for your family members
        </p>
      </div>

      {/* Chore Creation Form */}
      <div className="card space-y-6">
        {/* Chore Name */}
        <div>
          <label className="block text-sm font-medium mb-2">Chore Name</label>
          <input
            type="text"
            value={choreName}
            onChange={(e) => setChoreName(e.target.value)}
            placeholder="Make bed, wash dishes..."
            className="input w-full"
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

        {/* Add Chore Button */}
        <button
          type="button"
          onClick={addChore}
          disabled={!choreName.trim() || !assignedTo}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Chore
        </button>
      </div>

      {/* Created Chores */}
      {chores.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Created Chores ({chores.length})</h3>
          <div className="space-y-3">
            {chores.map((chore) => (
              <div key={chore.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{chore.title}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {chore.frequency}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {chore.timeOfDay}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                      {chore.points} pts
                    </span>
                  </div>
                  {chore.category && (
                    <div className="mt-1">
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        {chore.category}
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">
                    Assigned to: {members.find(m => m.id === chore.assignedTo)?.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeChore(chore.id)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 px-4 py-2 border border-border rounded-lg">
          Back
        </button>
        <button onClick={onNext} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Continue
        </button>
      </div>
    </div>
  )
} 
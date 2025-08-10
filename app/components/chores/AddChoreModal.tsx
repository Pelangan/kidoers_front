"use client"

import { useState, useEffect } from "react"
import { X, Plus, Calendar, Clock, Users } from "lucide-react"
import type { Chore, FamilyMember } from "../../types"
import { softColors } from "../ui/ColorPicker"

interface AddChoreModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (chore: Chore) => void
  onSaveMultiple?: (chores: Chore[]) => void
  onUpdate?: (chore: Chore) => void
  members: FamilyMember[]
  existingChores?: Chore[]
  editingChore?: Chore | null
}

export default function AddChoreModal({ isOpen, onClose, onSave, onSaveMultiple, onUpdate, members, existingChores = [], editingChore }: AddChoreModalProps) {
  const [choreName, setChoreName] = useState("")
  const [description, setDescription] = useState("")
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "weekends">("daily")
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening">("morning")
  const [category, setCategory] = useState("")
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [points, setPoints] = useState(1)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [createdChores, setCreatedChores] = useState<Chore[]>([])

  // Populate form when editing a chore
  useEffect(() => {
    if (editingChore) {
      setChoreName(editingChore.title)
      setDescription(editingChore.description || "")
      setFrequency(editingChore.frequency)
      setTimeOfDay(editingChore.timeOfDay)
      setCategory(editingChore.category || "")
      setAssignedTo([editingChore.assignedTo])
      setPoints(editingChore.points)
    } else {
      resetForm()
    }
  }, [editingChore])

  const categories = [
    "No Category",
    "Before School",
    "Arriving Home",
    "Cleaning",
    "Kitchen",
    "Before Bed"
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!choreName.trim() || assignedTo.length === 0) return

    if (editingChore && onUpdate) {
      // Update existing chore
      const updatedChore: Chore = {
        ...editingChore,
        title: choreName.trim(),
        description: description.trim(),
        frequency,
        timeOfDay,
        category: category === "No Category" ? undefined : category,
        assignedTo: assignedTo[0], // For editing, we only support single assignment
        points,
      }
      onUpdate(updatedChore)
      resetForm()
      onClose()
    } else {
      // Create new chores and add to pending list
      const newChores: Chore[] = assignedTo.map(memberId => ({
        id: Date.now().toString() + "_" + memberId,
        title: choreName.trim(),
        description: description.trim(),
        frequency,
        timeOfDay,
        category: category === "No Category" ? undefined : category,
        assignedTo: memberId,
        points,
        completed: false,
      }))

      setCreatedChores(prev => [...prev, ...newChores])
      resetForm()
    }
  }

  const resetForm = () => {
    setChoreName("")
    setDescription("")
    setFrequency("daily")
    setTimeOfDay("morning")
    setCategory("")
    setAssignedTo([])
    setPoints(1)
    setShowNewCategory(false)
    setNewCategory("")
  }

  const handleClose = () => {
    // Save current form data if valid
    if (choreName.trim() && assignedTo.length > 0) {
      const currentChore: Chore = {
        id: Date.now().toString() + "_" + assignedTo[0],
        title: choreName.trim(),
        description: description.trim(),
        frequency,
        timeOfDay,
        category: category === "No Category" ? undefined : category,
        assignedTo: assignedTo[0],
        points,
        completed: false,
      }
      
      // Add current chore to the list
      const allChores = [...createdChores, currentChore]
      
      if (onSaveMultiple) {
        onSaveMultiple(allChores)
      } else {
        allChores.forEach(chore => onSave(chore))
      }
    } else if (createdChores.length > 0) {
      // Save only created chores if current form is invalid
      if (onSaveMultiple) {
        onSaveMultiple(createdChores)
      } else {
        createdChores.forEach(chore => onSave(chore))
      }
    }
    
    setCreatedChores([])
    resetForm()
    onClose()
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
          <h2 className="text-xl font-semibold text-foreground">
            {editingChore ? "Edit Chore" : "Add New Chore"}
          </h2>
          <button
            onClick={handleClose}
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
              {members.map((member) => {
                const colorData = softColors.find(c => c.value === member.color) || softColors[0]
                const isSelected = assignedTo.includes(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setAssignedTo(assignedTo.filter(id => id !== member.id))
                      } else {
                        setAssignedTo([...assignedTo, member.id])
                      }
                    }}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? `${colorData.bg} ${colorData.text} ${colorData.border}`
                        : `bg-background ${colorData.text} ${colorData.border} hover:${colorData.bg.replace('bg-', 'bg-')}`
                    }`}
                  >
                    {member.name}
                  </button>
                )
              })}
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

          {/* Created Chores Preview */}
          {!editingChore && createdChores.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                Chores to be added ({createdChores.length})
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {createdChores.map((chore, index) => {
                  const member = members.find(m => m.id === chore.assignedTo)
                  const colorData = softColors.find(c => c.value === member?.color) || softColors[0]
                  return (
                    <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${colorData.bg} ${colorData.border}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${colorData.text}`}>{chore.title}</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-white text-black border border-gray-300">
                          {chore.frequency === 'daily' ? 'Daily' : 
                           chore.frequency === 'weekly' ? 'Weekly' : 'Weekends'}
                        </span>
                      </div>
                      <span className={`text-xs ${colorData.text}`}>{member?.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {!editingChore && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors ${
                    (createdChores.length > 0 || (choreName.trim() && assignedTo.length > 0)) ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' : ''
                  }`}
                >
                  {(createdChores.length > 0 || (choreName.trim() && assignedTo.length > 0)) ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Done ({createdChores.length + (choreName.trim() && assignedTo.length > 0 ? 1 : 0)} chores)
                    </div>
                  ) : (
                    'Cancel'
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!choreName.trim() || assignedTo.length === 0}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Chore
                </button>
              </>
            )}
            {editingChore && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!choreName.trim() || assignedTo.length === 0}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update Chore
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
} 
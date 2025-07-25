"use client"

import { useState } from "react"
import { X, Plus, Calendar, Clock, MapPin, Star, Monitor } from "lucide-react"
import type { Activity, FamilyMember } from "../onboarding/OnboardingWizard"

interface AddActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (activity: Activity) => void
  members: FamilyMember[]
  existingActivities?: Activity[]
}

export default function AddActivityModal({ isOpen, onClose, onSave, members, existingActivities = [] }: AddActivityModalProps) {
  const [activityName, setActivityName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [time, setTime] = useState("15:00")
  const [duration, setDuration] = useState(30)
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([])
  const [icon, setIcon] = useState("monitor")
  const [assignedTo, setAssignedTo] = useState("")

  const icons = [
    { id: "monitor", icon: Monitor, label: "TV" },
    { id: "map-pin", icon: MapPin, label: "Location" },
    { id: "star", icon: Star, label: "Star" },
    { id: "calendar", icon: Calendar, label: "Calendar" }
  ]

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityName.trim() || !assignedTo) return

    const newActivity: Activity = {
      id: Date.now().toString(),
      title: activityName.trim(),
      description: description.trim(),
      location: location.trim() || undefined,
      time,
      duration,
      frequency,
      daysOfWeek,
      icon,
      assignedTo,
      completed: false,
    }

    onSave(newActivity)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setActivityName("")
    setDescription("")
    setLocation("")
    setTime("15:00")
    setDuration(30)
    setDaysOfWeek([])
    setIcon("monitor")
    setAssignedTo("")
  }

  const toggleDay = (day: string) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-foreground">Add New Activity</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Activity Name and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Activity Name</label>
              <input
                type="text"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                placeholder="Movie night, Park visit..."
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location (Optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Living room, Central Park"
                className="input w-full"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Watch a family movie together..."
              className="input w-full h-20 resize-none"
            />
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input w-full pl-10"
                />
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                min="15"
                step="15"
                className="input w-full"
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2">Frequency</label>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly"].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq as any)}
                  className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                    frequency === freq
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-sm font-medium mb-2">Days of Week</label>
            <div className="flex gap-2">
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    daysOfWeek.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex gap-2">
              {icons.map((iconOption) => (
                <button
                  key={iconOption.id}
                  type="button"
                  onClick={() => setIcon(iconOption.id)}
                  className={`p-3 rounded-lg border transition-colors ${
                    icon === iconOption.id
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <iconOption.icon className="h-5 w-5" />
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
              disabled={!activityName.trim() || !assignedTo}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 
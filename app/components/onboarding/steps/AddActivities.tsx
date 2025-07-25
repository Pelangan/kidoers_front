"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, Plus, X, Calendar, Clock, MapPin, Star, Monitor } from "lucide-react"
import type { Activity, FamilyMember } from "../OnboardingWizard"
import { softColors } from "../../ui/ColorPicker"

interface AddActivitiesProps {
  activities: Activity[]
  setActivities: (activities: Activity[]) => void
  members: FamilyMember[]
  onNext: () => void
  onBack: () => void
}

export default function AddActivities({ activities, setActivities, members, onNext, onBack }: AddActivitiesProps) {
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

  const addActivity = () => {
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

    setActivities([...activities, newActivity])
    setActivityName("")
    setDescription("")
    setLocation("")
    setTime("15:00")
    setDuration(30)
    setDaysOfWeek([])
    setIcon("monitor")
    setAssignedTo("")
  }

  const removeActivity = (id: string) => {
    setActivities(activities.filter(activity => activity.id !== id))
  }

  const toggleDay = (day: string) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
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
          <div className="w-8 h-1 bg-primary rounded-full" />
          <div className="w-2 h-1 bg-muted rounded-full" />
          <span className="text-sm text-muted-foreground ml-2">3/4</span>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Family Activities
        </h1>
        <p className="text-muted-foreground">
          Schedule fun activities for your family
        </p>
      </div>

      {/* Activity Creation Form */}
      <div className="card space-y-6">
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
            {members.map((member) => {
              const colorData = softColors.find(c => c.value === member.color) || softColors[0]
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setAssignedTo(member.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    assignedTo === member.id
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

        {/* Add Activity Button */}
        <button
          type="button"
          onClick={addActivity}
          disabled={!activityName.trim() || !assignedTo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Activity
        </button>
      </div>

      {/* Created Activities */}
      {activities.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Created Activities ({activities.length})</h3>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{activity.title}</div>
                  {activity.location && (
                    <div className="text-sm text-muted-foreground">{activity.location}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {activity.time}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {activity.duration}m
                    </span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full capitalize">
                      {activity.frequency}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Assigned to: {members.find(m => m.id === activity.assignedTo)?.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeActivity(activity.id)}
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
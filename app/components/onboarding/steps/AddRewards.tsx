"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeft, Plus, X, Gift, Trophy, Star, Target } from "lucide-react"
import type { Reward, FamilyMember, Chore } from "../OnboardingWizard"

interface AddRewardsProps {
  rewards: Reward[]
  setRewards: (rewards: Reward[]) => void
  members: FamilyMember[]
  chores: Chore[]
  onNext: () => void
  onBack: () => void
}

export default function AddRewards({ rewards, setRewards, members, chores, onNext, onBack }: AddRewardsProps) {
  const [rewardName, setRewardName] = useState("")
  const [description, setDescription] = useState("")
  const [rewardType, setRewardType] = useState<Reward["type"]>("complete_tasks")
  const [conditions, setConditions] = useState<any>({})
  const [icon, setIcon] = useState("gift")
  const [availableTo, setAvailableTo] = useState("")
  const [threshold, setThreshold] = useState(10)

  const rewardTypes = [
    { value: "complete_tasks", label: "Complete X Tasks", description: "Reward for completing a specific number of tasks" },
    { value: "complete_categories", label: "Complete Categories", description: "Reward for completing all tasks in specific categories" },
    { value: "complete_time_slots", label: "Complete Time Slots", description: "Reward for completing all tasks in specific time periods" },
    { value: "specific_tasks", label: "Complete Specific Tasks", description: "Reward for completing exactly these individual tasks" },
    { value: "streak", label: "Streak Rewards", description: "Reward for maintaining streaks over multiple days" },
    { value: "mixed", label: "Mixed Conditions", description: "Reward for complex combinations of achievements" }
  ]

  const icons = [
    { id: "gift", icon: Gift, label: "Gift" },
    { id: "trophy", icon: Trophy, label: "Trophy" },
    { id: "star", icon: Star, label: "Star" },
    { id: "target", icon: Target, label: "Target" }
  ]

  const categories = ["Before School", "Arriving Home", "Cleaning", "Kitchen", "Before Bed"]
  const timeSlots = ["Morning", "Afternoon", "Evening"]

  const addReward = () => {
    if (!rewardName.trim() || !availableTo) return

    const newReward: Reward = {
      id: Date.now().toString(),
      title: rewardName.trim(),
      description: description.trim(),
      type: rewardType,
      conditions,
      icon,
      availableTo,
      threshold: rewardType === "complete_tasks" || rewardType === "streak" ? threshold : undefined,
    }

    setRewards([...rewards, newReward])
    setRewardName("")
    setDescription("")
    setRewardType("complete_tasks")
    setConditions({})
    setIcon("gift")
    setAvailableTo("")
    setThreshold(10)
  }

  const removeReward = (id: string) => {
    setRewards(rewards.filter(reward => reward.id !== id))
  }

  const renderConditions = () => {
    switch (rewardType) {
      case "complete_tasks":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Number of Tasks</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
              min="1"
              className="input w-24"
            />
          </div>
        )
      
      case "complete_categories":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Categories to Complete</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    const selected = conditions.categories || []
                    const newSelected = selected.includes(cat)
                      ? selected.filter((c: string) => c !== cat)
                      : [...selected, cat]
                    setConditions({ ...conditions, categories: newSelected })
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    (conditions.categories || []).includes(cat)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )
      
      case "complete_time_slots":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Time Slots to Complete</label>
            <div className="flex gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    const selected = conditions.timeSlots || []
                    const newSelected = selected.includes(slot)
                      ? selected.filter((s: string) => s !== slot)
                      : [...selected, slot]
                    setConditions({ ...conditions, timeSlots: newSelected })
                  }}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    (conditions.timeSlots || []).includes(slot)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )
      
      case "specific_tasks":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Select Specific Tasks</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {chores.map((chore) => (
                <label key={chore.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(conditions.tasks || []).includes(chore.id)}
                    onChange={(e) => {
                      const selected = conditions.tasks || []
                      const newSelected = e.target.checked
                        ? [...selected, chore.id]
                        : selected.filter((id: string) => id !== chore.id)
                      setConditions({ ...conditions, tasks: newSelected })
                    }}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{chore.title}</div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{chore.category}</span>
                      <span>{chore.timeOfDay}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )
      
      case "streak":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Streak Duration (days)</label>
              <input
                type="number"
                value={conditions.streakDays || 7}
                onChange={(e) => setConditions({ ...conditions, streakDays: parseInt(e.target.value) || 1 })}
                min="1"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Streak Type</label>
              <select
                value={conditions.streakType || "daily_goal"}
                onChange={(e) => setConditions({ ...conditions, streakType: e.target.value })}
                className="input w-full"
              >
                <option value="daily_goal">Daily Task Goal</option>
                <option value="category_completion">Category Completion</option>
                <option value="time_slot_completion">Time Slot Completion</option>
              </select>
            </div>
          </div>
        )
      
      case "mixed":
        return (
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={conditions.completeAllCategories || false}
                  onChange={(e) => setConditions({ ...conditions, completeAllCategories: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Complete all categories in one day</span>
              </label>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={conditions.completeAllTimeSlots || false}
                  onChange={(e) => setConditions({ ...conditions, completeAllTimeSlots: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Complete all time slots in one day</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Minimum tasks per day</label>
              <input
                type="number"
                value={conditions.minTasksPerDay || 3}
                onChange={(e) => setConditions({ ...conditions, minTasksPerDay: parseInt(e.target.value) || 1 })}
                min="1"
                className="input w-24"
              />
            </div>
          </div>
        )
      
      default:
        return null
    }
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
          <div className="w-8 h-1 bg-primary rounded-full" />
          <span className="text-sm text-muted-foreground ml-2">4/4</span>
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Family Rewards
        </h1>
        <p className="text-muted-foreground">
          Set up motivating rewards for completing tasks
        </p>
      </div>

      {/* Reward Creation Form */}
      <div className="card space-y-6">
        {/* Reward Name and Description */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Reward Name</label>
            <input
              type="text"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              placeholder="Pizza night, Movie trip..."
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Family pizza dinner..."
              className="input w-full"
            />
          </div>
        </div>

        {/* Reward Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Reward Type</label>
          <select
            value={rewardType}
            onChange={(e) => {
              setRewardType(e.target.value as Reward["type"])
              setConditions({})
            }}
            className="input w-full"
          >
            {rewardTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}...
              </option>
            ))}
          </select>
        </div>

        {/* Conditions */}
        {renderConditions()}

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

        {/* Available to */}
        <div>
          <label className="block text-sm font-medium mb-2">Available to</label>
          <div className="flex gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setAvailableTo(member.id)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  availableTo === member.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                {member.name}
              </button>
            ))}
          </div>
        </div>

        {/* Add Reward Button */}
        <button
          type="button"
          onClick={addReward}
          disabled={!rewardName.trim() || !availableTo}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Reward
        </button>
      </div>

      {/* Created Rewards */}
      {rewards.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Created Rewards ({rewards.length})</h3>
          <div className="space-y-3">
            {rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{reward.title}</div>
                  <div className="text-sm text-muted-foreground">{reward.description}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Available to: {members.find(m => m.id === reward.availableTo)?.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeReward(reward.id)}
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
          Complete Setup
        </button>
      </div>
    </div>
  )
} 
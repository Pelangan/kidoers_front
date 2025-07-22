"use client"

import { useState, useEffect } from "react"
import { Gift, Plus, Trophy, Star } from "lucide-react"
import { storage } from "../../../lib/storage"

interface Reward {
  id: string
  title: string
  description?: string
  threshold: number
}

export default function RewardsView() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [completedTasks, setCompletedTasks] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    try {
      const rewardsData = storage.getRewards()
      const choresData = storage.getChores()

      const completed = choresData?.filter((chore: any) => chore.completed).length || 0

      setRewards(rewardsData || [])
      setCompletedTasks(completed)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressPercentage = (threshold: number) => {
    return Math.min((completedTasks / threshold) * 100, 100)
  }

  const isRewardEarned = (threshold: number) => {
    return completedTasks >= threshold
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Family Rewards</h2>
          <p className="text-muted-foreground">Track progress toward earning rewards together</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Reward
        </button>
      </div>

      {/* Progress Summary */}
      <div className="card mb-8 bg-gradient-soft">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">{completedTasks} Tasks Completed</h3>
          <p className="text-muted-foreground">Great job working together as a family!</p>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => {
          const progress = getProgressPercentage(reward.threshold)
          const earned = isRewardEarned(reward.threshold)

          return (
            <div
              key={reward.id}
              className={`card transition-all duration-300 ${
                earned ? "bg-gradient-warm text-white shadow-button scale-105" : "hover:shadow-soft"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-1 ${earned ? "text-white" : "text-foreground"}`}>
                    {reward.title}
                  </h3>
                  {reward.description && (
                    <p className={`text-sm ${earned ? "text-white/80" : "text-muted-foreground"}`}>
                      {reward.description}
                    </p>
                  )}
                </div>
                <div className={`p-2 rounded-lg ${earned ? "bg-white/20" : "bg-muted"}`}>
                  {earned ? (
                    <Star className="h-6 w-6 text-white" />
                  ) : (
                    <Gift className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className={earned ? "text-white/80" : "text-muted-foreground"}>Progress</span>
                  <span className={`font-medium ${earned ? "text-white" : "text-foreground"}`}>
                    {completedTasks} / {reward.threshold} tasks
                  </span>
                </div>

                <div className={`w-full rounded-full h-2 ${earned ? "bg-white/20" : "bg-muted"}`}>
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      earned ? "bg-white" : "bg-gradient-warm"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {earned ? (
                  <div className="text-center py-2">
                    <div className="text-white font-semibold">🎉 Reward Earned!</div>
                    <div className="text-white/80 text-sm">Time to celebrate!</div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <div className="text-muted-foreground text-sm">
                      {reward.threshold - completedTasks} more tasks to go
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {rewards.length === 0 && (
        <div className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No rewards set up</h3>
          <p className="text-muted-foreground mb-4">Add family rewards to motivate everyone to complete their tasks.</p>
          <button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add First Reward
          </button>
        </div>
      )}
    </div>
  )
} 
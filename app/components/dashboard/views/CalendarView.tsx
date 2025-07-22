"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Clock } from "lucide-react"
import { storage } from "../../../lib/storage"

interface Activity {
  id: string
  title: string
  description?: string
  scheduled_date: string
  depends_on_chores: boolean
}

export default function CalendarView() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = () => {
    try {
      const activitiesData = storage.getActivities()
      setActivities(activitiesData || [])
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getActivitiesForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return activities.filter((activity) => activity.scheduled_date.startsWith(dateStr))
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const weekDays = getWeekDays()
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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
          <h2 className="text-2xl font-bold text-foreground">Family Calendar</h2>
          <p className="text-muted-foreground">Scheduled activities and events</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Activity
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            const newDate = new Date(currentDate)
            newDate.setDate(currentDate.getDate() - 7)
            setCurrentDate(newDate)
          }}
          className="btn-secondary"
        >
          ← Previous Week
        </button>

        <h3 className="text-lg font-semibold">
          {weekDays[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h3>

        <button
          onClick={() => {
            const newDate = new Date(currentDate)
            newDate.setDate(currentDate.getDate() + 7)
            setCurrentDate(newDate)
          }}
          className="btn-secondary"
        >
          Next Week →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day, index) => {
          const dayActivities = getActivitiesForDate(day)
          const isToday = day.toDateString() === new Date().toDateString()

          return (
            <div key={index} className="card min-h-[200px]">
              <div
                className={`text-center pb-3 mb-3 border-b border-border ${
                  isToday ? "text-primary font-semibold" : "text-foreground"
                }`}
              >
                <div className="text-sm text-muted-foreground">{dayNames[index]}</div>
                <div className="text-lg">{day.getDate()}</div>
              </div>

              <div className="space-y-2">
                {dayActivities.map((activity) => (
                  <div key={activity.id} className="p-2 rounded-lg bg-gradient-warm text-white text-sm">
                    <div className="font-medium truncate">{activity.title}</div>
                    <div className="flex items-center gap-1 text-xs opacity-90">
                      <Clock className="h-3 w-3" />
                      {formatTime(activity.scheduled_date)}
                    </div>
                    {activity.depends_on_chores && <div className="text-xs opacity-75 mt-1">Depends on chores</div>}
                  </div>
                ))}

                {dayActivities.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">No activities</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12 mt-8">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No activities scheduled</h3>
          <p className="text-muted-foreground mb-4">Add family activities and events to see them here.</p>
          <button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add First Activity
          </button>
        </div>
      )}
    </div>
  )
} 
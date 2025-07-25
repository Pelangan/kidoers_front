"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { storage } from "../../../lib/storage"

interface Activity {
  id: string
  title: string
  description?: string
  scheduled_date: string
  depends_on_chores: boolean
  assignedTo?: string
  completed?: boolean
}

interface FamilyMember {
  id: string
  name: string
  role: "parent" | "child"
}

export default function CalendarView() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = () => {
    try {
      const activitiesData = storage.getActivities()
      const membersData = storage.getMembers()
      setActivities(activitiesData || [])
      setMembers(membersData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    // Start from Monday (standard week start)
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    // Convert Sunday (0) to 7, then subtract to get Monday
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)

    const days = []
    for (let i = 0; i < 7; i++) { // Show 7 days: Mon, Tue, Wed, Thu, Fri, Sat, Sun
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

  const getTimeSlots = () => {
    return [
      "12 am", "1 am", "2 am", "3 am", "4 am", "5 am", "6 am", "7 am", "8 am", "9 am", "10 am", "11 am",
      "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm", "7 pm", "8 pm", "9 pm", "10 pm", "11 pm"
    ]
  }

  const getActivityColor = (activity: Activity) => {
    const title = activity.title.toLowerCase()
    
    // Food/Meal related activities
    if (title.includes('tacos') || title.includes('pizza') || title.includes('lunch') || 
        title.includes('spaghetti') || title.includes('flag football')) {
      return 'bg-orange-200 border-orange-300 text-orange-800'
    }
    
    // Lessons/Parties
    if (title.includes('piano') || title.includes('slumber party')) {
      return 'bg-pink-200 border-pink-300 text-pink-800'
    }
    
    // Personal care/Lessons
    if (title.includes('haircut') || title.includes('violin')) {
      return 'bg-purple-200 border-purple-300 text-purple-800'
    }
    
    // General activities
    return 'bg-blue-200 border-blue-300 text-blue-800'
  }

  const getMemberInitial = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    return member ? member.name.charAt(0).toUpperCase() : '?'
  }

  const getActivityStatus = (activity: Activity) => {
    return activity.completed || false
  }

  const getCompletedCount = () => {
    return activities.filter(activity => activity.completed).length
  }

  const getCurrentTimePosition = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Calculate position within the current hour (0-1)
    const minutePosition = currentMinute / 60
    
    // Find the current day index
    const currentDayIndex = weekDays.findIndex(day => 
      day.toDateString() === now.toDateString()
    )
    
    console.log('Current time position:', {
      now: now.toDateString(),
      currentHour,
      currentMinute,
      minutePosition,
      currentDayIndex,
      weekDays: weekDays.map(d => d.toDateString())
    })
    
    return {
      hour: currentHour,
      minutePosition,
      dayIndex: currentDayIndex,
      isToday: currentDayIndex !== -1
    }
  }

  const weekDays = getWeekDays()
  const timeSlots = getTimeSlots()
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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
          className="btn-secondary flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Week
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
          className="btn-secondary flex items-center gap-2"
        >
          Next Week
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

            {/* Calendar Container */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Frozen Header Row */}
        <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="p-2 bg-gray-50 border-r border-blue-200 w-16">
            <div className="text-center">
              <div className="text-xs text-gray-500 font-medium">GMT+02</div>
            </div>
          </div>
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div key={index} className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0">
                <div className="text-center">
                  <div className="text-sm text-gray-600 font-medium">{dayNames[index]}</div>
                  <div className={`text-lg font-bold ${isToday ? 'text-red-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable Time Grid */}
        <div className="max-h-[800px] overflow-y-auto relative">
          {timeSlots.map((timeSlot, timeIndex) => {
            const currentTime = getCurrentTimePosition()
            const isCurrentHour = currentTime.hour === timeIndex
            const isCurrentDay = currentTime.dayIndex === 0 // First day in our 5-day view
            
            return (
              <div key={timeIndex} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0 relative">
                {/* Time Column */}
                <div className="px-1 py-2 bg-white border-r border-blue-200 flex items-center justify-center sticky left-0 z-5 w-16">
                  <span className="text-xs text-gray-700 font-medium">{timeSlot}</span>
                </div>
                
                {/* Day Columns */}
                {weekDays.map((day, dayIndex) => {
                  const dayActivities = getActivitiesForDate(day)
                  const activitiesInTimeSlot = dayActivities.filter(activity => {
                    const activityTime = new Date(activity.scheduled_date)
                    const hour = activityTime.getHours()
                    return hour === timeIndex
                  })

                  const isCurrentDay = currentTime.isToday && currentTime.dayIndex === dayIndex

                  return (
                    <div key={dayIndex} className="p-1 border-r border-gray-200 last:border-r-0 min-h-[50px] relative">
                      {activitiesInTimeSlot.map((activity) => (
                        <div
                          key={activity.id}
                          className={`p-1 rounded border text-xs mb-1 relative ${getActivityColor(activity)}`}
                        >
                          <div className="font-medium truncate text-xs">{activity.title}</div>
                          <div className="text-xs opacity-80">
                            {formatTime(activity.scheduled_date)}
                          </div>
                          
                          {/* Status Indicator */}
                          <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            getActivityStatus(activity) 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-400 text-white'
                          }`}>
                            {getMemberInitial(activity.assignedTo || '')}
                          </div>
                        </div>
                      ))}
                      
                      {/* Current Time Line for this specific day */}
                      {isCurrentHour && isCurrentDay && (
                        <div 
                          className="absolute left-0 right-0 z-10 pointer-events-none"
                          style={{ 
                            top: `${currentTime.minutePosition * 100}%`,
                            transform: 'translateY(-50%)'
                          }}
                        >
                          <div className="flex items-center">
                            {/* Red dot at the left end of the line */}
                            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                            {/* Red line extending to the right */}
                            <div className="flex-1 h-0.5 bg-red-500"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {/* Current Time Indicator - Red dot in time column */}
                {isCurrentHour && currentTime.isToday && (
                  <div 
                    className="absolute left-0 z-10 pointer-events-none"
                    style={{ 
                      top: `${currentTime.minutePosition * 100}%`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            <span className="text-sm text-gray-600">Pending</span>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {getCompletedCount()} of {activities.length} activities completed
        </div>
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
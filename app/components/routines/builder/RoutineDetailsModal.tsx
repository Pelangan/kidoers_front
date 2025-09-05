'use client'

import { useState, useEffect } from 'react'
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../components/ui/dialog"
import { Checkbox } from "../../../../components/ui/checkbox"
import { Calendar } from "../../../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover"
import { CalendarIcon, Save } from 'lucide-react'
import { format } from 'date-fns'

export type ScheduleScope = 'everyday' | 'weekdays' | 'weekends' | 'custom'

export interface RoutineScheduleData {
  scope: ScheduleScope
  days_of_week: string[]
  start_date?: Date
  end_date?: Date
  timezone: string
  is_active: boolean
}

interface RoutineDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (scheduleData: RoutineScheduleData) => void
  initialScheduleData?: RoutineScheduleData
  totalTasks: number
  familyMembers: number
}

const scheduleTypes = [
  { value: 'everyday', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays only' },
  { value: 'weekends', label: 'Weekends only' },
  { value: 'custom', label: 'Custom' }
] as const

const daysOfWeek = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' }
] as const

const weekdaysOnly = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const weekendsOnly = ['saturday', 'sunday']
const allDays = daysOfWeek.map(day => day.value)

export default function RoutineDetailsModal({
  isOpen,
  onClose,
  onSave,
  initialScheduleData,
  totalTasks,
  familyMembers
}: RoutineDetailsModalProps) {
  const [scope, setScope] = useState<ScheduleScope>(initialScheduleData?.scope || 'everyday')
  const [selectedDays, setSelectedDays] = useState<string[]>(initialScheduleData?.days_of_week || [])
  const [startDate, setStartDate] = useState<Date | undefined>(initialScheduleData?.start_date)
  const [endDate, setEndDate] = useState<Date | undefined>(initialScheduleData?.end_date)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Update selected days when scope changes
  useEffect(() => {
    switch (scope) {
      case 'everyday':
        setSelectedDays([])
        break
      case 'weekdays':
        setSelectedDays(weekdaysOnly)
        break
      case 'weekends':
        setSelectedDays(weekendsOnly)
        break
      case 'custom':
        // Keep current selection or default to all days
        if (selectedDays.length === 0) {
          setSelectedDays(allDays)
        }
        break
    }
    setHasUnsavedChanges(true)
  }, [scope])

  // Track changes
  useEffect(() => {
    const hasChanges = 
      scope !== (initialScheduleData?.scope || 'everyday') ||
      JSON.stringify(selectedDays) !== JSON.stringify(initialScheduleData?.days_of_week || []) ||
      startDate?.getTime() !== initialScheduleData?.start_date?.getTime() ||
      endDate?.getTime() !== initialScheduleData?.end_date?.getTime()
    
    setHasUnsavedChanges(hasChanges)
  }, [scope, selectedDays, startDate, endDate, initialScheduleData])

  const handleDayToggle = (day: string) => {
    if (scope !== 'custom') return
    
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    const scheduleData: RoutineScheduleData = {
      scope,
      days_of_week: scope === 'everyday' ? [] : selectedDays,
      start_date: startDate,
      end_date: endDate,
      timezone: 'Europe/Madrid', // Default timezone
      is_active: true
    }

    onSave(scheduleData)
    setHasUnsavedChanges(false)
  }

  const getActiveDaysText = () => {
    switch (scope) {
      case 'everyday':
        return 'Every day'
      case 'weekdays':
        return 'Weekdays only'
      case 'weekends':
        return 'Weekends only'
      case 'custom':
        if (selectedDays.length === 0) return 'No days selected'
        if (selectedDays.length === 7) return 'Every day'
        if (selectedDays.length === 5 && selectedDays.every(day => weekdaysOnly.includes(day))) return 'Weekdays only'
        if (selectedDays.length === 2 && selectedDays.every(day => weekendsOnly.includes(day))) return 'Weekends only'
        return `${selectedDays.length} days selected`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">When should this routine run?</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
              
              {/* Schedule Type Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {scheduleTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={scope === type.value ? "default" : "outline"}
                    onClick={() => setScope(type.value as ScheduleScope)}
                    className="h-10"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              {/* Custom Days Selection */}
              {scope === 'custom' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select specific days:</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex flex-col items-center space-y-1">
                        <Checkbox
                          id={day.value}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={() => handleDayToggle(day.value)}
                        />
                        <Label 
                          htmlFor={day.value} 
                          className="text-xs cursor-pointer"
                        >
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-sm font-medium">Start Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date)
                          setHasUnsavedChanges(true)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-sm font-medium">End Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          setHasUnsavedChanges(true)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

            {/* Active Schedule Summary */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Active on:</span> {getActiveDaysText()}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center space-x-4 text-sm">
            {hasUnsavedChanges && (
              <span className="text-blue-600 font-medium">You have unsaved changes</span>
            )}
            <span className="text-gray-600">{totalTasks} total tasks</span>
            <span className="text-gray-600">{familyMembers} family members</span>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={scope === 'custom' && selectedDays.length === 0}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Progress</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

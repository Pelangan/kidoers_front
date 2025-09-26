'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../components/ui/dialog'
import { Button } from '../../../../../components/ui/button'
import { Card, CardContent } from '../../../../../components/ui/card'
import { Calendar, Users, User, Trash2 } from 'lucide-react'
import type { Task } from '../types/routineBuilderTypes'

interface MultiMemberDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteScope: 'this_occurrence' | 'this_and_following' | 'all_occurrences', memberScope: 'this_member' | 'all_members') => void
  task: Task
  currentMemberId: string
  currentDate: string
  isLoading?: boolean
}

export function MultiMemberDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  task,
  currentMemberId,
  currentDate,
  isLoading = false
}: MultiMemberDeleteModalProps) {
  const [selectedTimeScope, setSelectedTimeScope] = useState<'this_occurrence' | 'this_and_following' | 'all_occurrences'>('this_occurrence')
  const [selectedMemberScope, setSelectedMemberScope] = useState<'this_member' | 'all_members'>('this_member')
  const [currentStep, setCurrentStep] = useState<'time' | 'member'>('time')

  const isRecurring = task.frequency && task.frequency !== 'one_off'
  const isMultiMember = (task.member_count || 1) > 1

  const handleNext = () => {
    if (currentStep === 'time') {
      if (isMultiMember) {
        setCurrentStep('member')
      } else {
        // Single member, proceed directly to confirmation
        onConfirm(selectedTimeScope, 'this_member')
      }
    }
  }

  const handleConfirm = () => {
    onConfirm(selectedTimeScope, selectedMemberScope)
  }

  const handleClose = () => {
    setCurrentStep('time')
    setSelectedTimeScope('this_occurrence')
    setSelectedMemberScope('this_member')
    onClose()
  }

  const getTimeScopeDescription = (scope: string) => {
    switch (scope) {
      case 'this_occurrence':
        return `Only on ${currentDate}`
      case 'this_and_following':
        return `From ${currentDate} onwards`
      case 'all_occurrences':
        return 'All occurrences (past and future)'
      default:
        return ''
    }
  }

  const getMemberScopeDescription = (scope: string) => {
    const currentMember = task.assignees?.find(a => a.id === currentMemberId)
    const currentMemberName = currentMember?.name || 'this member'
    
    switch (scope) {
      case 'this_member':
        return `Only ${currentMemberName}`
      case 'all_members':
        return `All ${task.member_count || 1} assigned members`
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <span>Delete Task</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-900">{task.name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {isRecurring ? 'Recurring task' : 'One-time task'} • {task.member_count || 1} member{(task.member_count || 1) > 1 ? 's' : ''}
            </div>
          </div>

          {/* Step 1: Time Scope */}
          {currentStep === 'time' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">When should this be deleted?</span>
              </div>
              
              <div className="space-y-2">
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedTimeScope === 'this_occurrence' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTimeScope('this_occurrence')}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-medium text-gray-900">This occurrence</div>
                    <div className="text-xs text-gray-500">{getTimeScopeDescription('this_occurrence')}</div>
                  </CardContent>
                </Card>

                {isRecurring && (
                  <>
                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedTimeScope === 'this_and_following' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTimeScope('this_and_following')}
                    >
                      <CardContent className="p-3">
                        <div className="text-sm font-medium text-gray-900">This & following</div>
                        <div className="text-xs text-gray-500">{getTimeScopeDescription('this_and_following')}</div>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all ${
                        selectedTimeScope === 'all_occurrences' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedTimeScope('all_occurrences')}
                    >
                      <CardContent className="p-3">
                        <div className="text-sm font-medium text-gray-900">All occurrences</div>
                        <div className="text-xs text-gray-500">{getTimeScopeDescription('all_occurrences')}</div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Member Scope */}
          {currentStep === 'member' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Who should this be removed from?</span>
              </div>
              
              <div className="space-y-2">
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedMemberScope === 'this_member' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedMemberScope('this_member')}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-medium text-gray-900">Only this member</div>
                    <div className="text-xs text-gray-500">{getMemberScopeDescription('this_member')}</div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedMemberScope === 'all_members' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedMemberScope('all_members')}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-medium text-gray-900">All assigned members</div>
                    <div className="text-xs text-gray-500">{getMemberScopeDescription('all_members')}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={currentStep === 'time' ? handleClose : () => setCurrentStep('time')}
              disabled={isLoading}
            >
              {currentStep === 'time' ? 'Cancel' : 'Back'}
            </Button>
            
            <Button
              onClick={currentStep === 'time' ? handleNext : handleConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Deleting...' : currentStep === 'time' ? 'Next' : 'Delete'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

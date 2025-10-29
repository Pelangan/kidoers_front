"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { generateAvatarUrl } from "../../../ui/AvatarSelector";
import type {
  Task,
  TaskGroup,
  FamilyMember,
  DaySelection,
  PendingDrop,
} from "../types/routineBuilderTypes";
import {
  helperLabel,
  normalizeWeekdays,
} from "../utils/recurrence";

// Day constants - Sunday moved to last position
const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface TaskCreationModalProps {
  // Modal state
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Task data
  editableTaskName: string;
  onTaskNameChange: (name: string) => void;
  
  // Day selection
  daySelection: DaySelection;
  onDaySelectionChange: (selection: DaySelection) => void;
  
  // Member assignment
  taskAssignmentMemberIds: string[];
  onTaskAssignmentMemberIdsChange: (ids: string[]) => void;
  familyMembers: FamilyMember[];
  
  // Routine assignment
  selectedRoutineGroup: string;
  onSelectedRoutineGroupChange: (groupId: string) => void;
  routineGroups: TaskGroup[];
  
  // Context data
  pendingDrop: PendingDrop | null;
  selectedTaskForEdit: any;
  
  // Loading state
  isCreatingTasks: boolean;
  
  // Actions
  onSave: () => void;
  onCreateNewGroup: () => void;
}

export default function TaskCreationModal({
  isOpen,
  onOpenChange,
  editableTaskName,
  onTaskNameChange,
  daySelection,
  onDaySelectionChange,
  taskAssignmentMemberIds,
  onTaskAssignmentMemberIdsChange,
  familyMembers,
  selectedRoutineGroup,
  onSelectedRoutineGroupChange,
  routineGroups,
  pendingDrop,
  selectedTaskForEdit,
  isCreatingTasks,
  onSave,
  onCreateNewGroup,
}: TaskCreationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">
            {selectedTaskForEdit ? "Edit Task" : "Create New Task"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Task Title */}
          <div className="space-y-2">
            <Input
              value={editableTaskName}
              onChange={(e) => onTaskNameChange(e.target.value)}
              placeholder="(No title)"
              className="w-full border-0 border-b-2 border-gray-300 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none rounded-none bg-transparent px-0"
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                {pendingDrop?.targetDay
                  ? pendingDrop.targetDay.charAt(0).toUpperCase() +
                    pendingDrop.targetDay.slice(1)
                  : "Select day"}
              </span>
            </div>
          </div>

          {/* Task Duration */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <Label className="text-sm font-medium text-gray-700">
                When should this task be done?
              </Label>
            </div>
            <Select
              value={(() => {
                const selectValue =
                  daySelection.mode === "everyday"
                    ? "every-day"
                    : "custom-days";
                return selectValue;
              })()}
              onValueChange={(value) => {
                if (value === "every-day") {
                  onDaySelectionChange({
                    mode: "everyday",
                    selectedDays: DAYS_OF_WEEK,
                  });
                } else if (value === "custom-days") {
                  // Smart default: pre-check the day from context or current selection
                  const defaultDay =
                    pendingDrop?.targetDay ||
                    daySelection.selectedDays[0] ||
                    "monday";
                  onDaySelectionChange({
                    mode: "custom",
                    selectedDays: [defaultDay],
                  });
                }
              }}
            >
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem
                  value="every-day"
                  className="bg-white hover:bg-gray-50"
                >
                  Every day
                </SelectItem>
                <SelectItem
                  value="custom-days"
                  className="bg-white hover:bg-gray-50"
                >
                  Select specific days
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Helper Label */}
            {(() => {
              const templateDays = normalizeWeekdays(
                daySelection.selectedDays,
              );
              const hasException = false; // TODO: Implement exception checking
              const helperText = helperLabel(templateDays, hasException);

              return (
                <div className="ml-6">
                  <div className="text-sm text-gray-600 italic">
                    {helperText}
                  </div>
                </div>
              );
            })()}

            {/* Day Chips - Always visible when "Select specific days" is active */}
            {(() => {
              const showDayChips = daySelection.mode === "custom";

              if (!showDayChips) return null;

              return (
                <div className="ml-6 space-y-2">
                  <div className="text-xs text-gray-600 mb-2">
                    Select days:
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayIndex = DAYS_OF_WEEK.indexOf(day);
                      const isSelected =
                        daySelection.selectedDays.includes(day);

                      return (
                        <label
                          key={day}
                          className={`flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onDaySelectionChange({
                                  ...daySelection,
                                  selectedDays: [...daySelection.selectedDays, day],
                                });
                              } else {
                                onDaySelectionChange({
                                  ...daySelection,
                                  selectedDays: daySelection.selectedDays.filter(
                                    (d) => d !== day,
                                  ),
                                });
                              }
                            }}
                            className="sr-only"
                          />
                          <div
                            className={`w-3 h-3 rounded-full ${isSelected ? "bg-blue-500" : "bg-gray-300"}`}
                          ></div>
                          <span className="text-xs font-medium mt-1">
                            {DAY_NAMES[dayIndex]}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Validation Error */}
                  {daySelection.selectedDays.length === 0 && (
                    <div className="text-sm text-red-600 mt-2">
                      Select at least one day
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Task Assignee */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <Label className="text-sm font-medium text-gray-700">
                Who should do this task?
              </Label>
            </div>

            {/* Quick Selection Buttons */}
            <div className="space-y-4">
              <div className="flex gap-3">
                {(() => {
                  const allFamilyCount = familyMembers.length;
                  const allKidsCount = familyMembers.filter(m => m.role === 'child').length;
                  const allParentsCount = familyMembers.filter(m => m.role === 'parent').length;
                  
                  const isAllFamilySelected = taskAssignmentMemberIds.length === allFamilyCount && allFamilyCount > 0;
                  const isAllKidsSelected = taskAssignmentMemberIds.length === allKidsCount && allKidsCount > 0 && 
                    familyMembers.filter(m => m.role === 'child').every(m => taskAssignmentMemberIds.includes(m.id));
                  const isAllParentsSelected = taskAssignmentMemberIds.length === allParentsCount && allParentsCount > 0 &&
                    familyMembers.filter(m => m.role === 'parent').every(m => taskAssignmentMemberIds.includes(m.id));

                  return (
                    <>
                      <button
                        onClick={() => {
                          if (isAllFamilySelected) {
                            onTaskAssignmentMemberIdsChange([]);
                          } else {
                            onTaskAssignmentMemberIdsChange(familyMembers.map(m => m.id));
                          }
                        }}
                        className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${
                          isAllFamilySelected
                            ? 'border-gray-800 bg-gray-100 text-gray-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        All Family ({allFamilyCount})
                      </button>
                      
                      {allKidsCount > 0 && (
                        <button
                          onClick={() => {
                            const kids = familyMembers.filter(m => m.role === 'child');
                            if (isAllKidsSelected) {
                              onTaskAssignmentMemberIdsChange(taskAssignmentMemberIds.filter(id => 
                                !kids.some(k => k.id === id)
                              ));
                            } else {
                              const nonKids = taskAssignmentMemberIds.filter(id => 
                                !kids.some(k => k.id === id)
                              );
                              onTaskAssignmentMemberIdsChange([...nonKids, ...kids.map(k => k.id)]);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${
                            isAllKidsSelected
                              ? 'border-gray-800 bg-gray-100 text-gray-800'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          All Kids ({allKidsCount})
                        </button>
                      )}
                      
                      {allParentsCount > 0 && (
                        <button
                          onClick={() => {
                            const parents = familyMembers.filter(m => m.role === 'parent');
                            if (isAllParentsSelected) {
                              onTaskAssignmentMemberIdsChange(taskAssignmentMemberIds.filter(id => 
                                !parents.some(p => p.id === id)
                              ));
                            } else {
                              const nonParents = taskAssignmentMemberIds.filter(id => 
                                !parents.some(p => p.id === id)
                              );
                              onTaskAssignmentMemberIdsChange([...nonParents, ...parents.map(p => p.id)]);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${
                            isAllParentsSelected
                              ? 'border-gray-800 bg-gray-100 text-gray-800'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          All Parents ({allParentsCount})
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Individual Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Individual Selection</h4>
                
                {/* Member Cards */}
                <div className="grid grid-cols-4 gap-2">
                  {familyMembers.map((member) => {
                    const isSelected = taskAssignmentMemberIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          if (isSelected) {
                            onTaskAssignmentMemberIdsChange(taskAssignmentMemberIds.filter(id => id !== member.id));
                          } else {
                            onTaskAssignmentMemberIdsChange([...taskAssignmentMemberIds, member.id]);
                          }
                        }}
                        className={`relative p-2 rounded-lg border-2 transition-all text-left ${
                          isSelected 
                            ? 'border-gray-800 bg-gray-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <div className="flex flex-col items-center space-y-1">
                          <img
                            src={member.avatar_url || generateAvatarUrl(member.avatar_seed || member.id, member.avatar_style || 'bottts', member.avatar_options || {})}
                            alt={member.name}
                            className="w-8 h-8 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div
                            className="w-8 h-8 rounded-full bg-gray-500 text-white text-xs font-medium items-center justify-center hidden"
                            style={{ display: 'none' }}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {member.role}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Helper Text */}
              <div className="text-xs text-gray-500 italic text-center">
                We will create one task per selected member.
              </div>
            </div>
          </div>

          {/* Routine Assignment */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              <Label className="text-sm font-medium text-gray-700">
                Assign to routine (optional)
              </Label>
            </div>
            <div className="space-y-2">
              <Select
                value={selectedRoutineGroup || "none"}
                onValueChange={onSelectedRoutineGroupChange}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Choose a routine or create new" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">
                    No routine assignment
                  </SelectItem>
                  {routineGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="create-new">
                    Create new routine
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedRoutineGroup === "create-new" && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateNewGroup}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create new routine</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              onClick={onSave}
              disabled={
                isCreatingTasks ||
                (daySelection.mode === "custom" &&
                  daySelection.selectedDays.length === 0)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingTasks ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

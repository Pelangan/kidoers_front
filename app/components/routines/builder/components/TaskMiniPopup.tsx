"use client";

import type {
  Task,
  RecurringTemplate,
  EnhancedFamilyMember,
} from "../types/routineBuilderTypes";
import { getTaskDisplayFrequency } from "../utils/taskUtils";

interface TaskMiniPopupProps {
  // Modal state
  isOpen: boolean;
  onClose: () => void;
  
  // Task data
  selectedTaskForEdit: {
    task: Task;
    day: string;
    memberId: string;
  } | null;
  miniPopupPosition: { x: number; y: number } | null;
  
  // Context data
  enhancedFamilyMembers: EnhancedFamilyMember[];
  recurringTemplates: RecurringTemplate[];
  
  // Actions
  onEditTask: () => void;
  onDeleteTask: () => void;
}

export default function TaskMiniPopup({
  isOpen,
  onClose,
  selectedTaskForEdit,
  miniPopupPosition,
  enhancedFamilyMembers,
  recurringTemplates,
  onEditTask,
  onDeleteTask,
}: TaskMiniPopupProps) {
  if (!isOpen || !selectedTaskForEdit || !miniPopupPosition) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
    >
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 min-w-[320px] max-w-[400px]"
        style={(() => {
          // Smart positioning to avoid popup getting cut off at screen edges
          const popupWidth = 360; // Approximate width (320-400px)
          const popupHeight = 300; // Approximate height
          const padding = 10; // Padding from screen edge

          // Calculate horizontal position
          let left = miniPopupPosition.x;
          let transformX = "-50%"; // Default: center on click

          // Check if popup would go off left edge
          if (miniPopupPosition.x - popupWidth / 2 < padding) {
            left = padding;
            transformX = "0%"; // Align left edge to position
          }
          // Check if popup would go off right edge
          else if (
            miniPopupPosition.x + popupWidth / 2 >
            window.innerWidth - padding
          ) {
            left = window.innerWidth - padding;
            transformX = "-100%"; // Align right edge to position
          }

          // Calculate vertical position
          let top = miniPopupPosition.y;
          let transformY = "-100%"; // Default: above click

          // If not enough space above, show below
          if (miniPopupPosition.y - popupHeight < padding) {
            transformY = "10px"; // Small offset below click
          }

          return {
            left: `${left}px`,
            top: `${top}px`,
            transform: `translate(${transformX}, ${transformY})`,
          };
        })()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedTaskForEdit.task.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('[TASK-MINI-POPUP] 🔍 Edit button clicked for task:', selectedTaskForEdit.task.name);
                onEditTask();
              }}
              className="group relative p-2 text-gray-600 hover:bg-gray-100 hover:shadow-lg rounded-full transition-all duration-200 ease-in-out hover:scale-105"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              {/* Enhanced tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Edit task
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </button>
            {/* Individual task actions */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask();
              }}
              className="group relative p-2 text-orange-600 hover:bg-orange-50 hover:shadow-lg rounded-full transition-all duration-200 ease-in-out hover:scale-105"
              data-testid="delete-task-button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {/* Enhanced tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Delete task
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="group relative p-2 text-gray-600 hover:bg-gray-100 hover:shadow-lg rounded-full transition-all duration-200 ease-in-out hover:scale-105"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {/* Enhanced tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                Close
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Day */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4"
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
            <span className="capitalize">{selectedTaskForEdit.day}</span>
          </div>

          {/* Assigned to */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>
              {(() => {
                const task = selectedTaskForEdit.task;

                // For multi-member tasks, display all assignees
                if (task.assignees && task.assignees.length > 1) {
                  const assigneeNames = task.assignees
                    .map((assignee) => assignee.name)
                    .join(", ");
                  return `Assigned to ${assigneeNames}`;
                }

                // For single-member tasks, try to find the member
                if (task.assignees && task.assignees.length === 1) {
                  return `Assigned to ${task.assignees[0].name}`;
                }

                // Fallback: try to find member by memberId
                const member = enhancedFamilyMembers.find(
                  (m) => m.id === selectedTaskForEdit.memberId,
                );
                return `Assigned to ${member?.name || "Unknown"}`;
              })()}
            </span>
          </div>

          {/* Frequency */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4"
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
            <span>
              {getTaskDisplayFrequency(
                selectedTaskForEdit.task,
                recurringTemplates,
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

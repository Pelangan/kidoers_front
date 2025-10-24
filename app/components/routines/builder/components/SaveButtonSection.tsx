"use client";

import { Button } from "../../../../../components/ui/button";
import { Save } from "lucide-react";

interface SaveButtonSectionProps {
  // Save functionality
  onSave: () => void;
  busy: boolean;
  
  // Validation
  totalTasks: number;
  routineName: string;
  
  // Context
  onComplete?: () => void;
}

export default function SaveButtonSection({
  onSave,
  busy,
  totalTasks,
  routineName,
  onComplete,
}: SaveButtonSectionProps) {
  return (
    <>
      {/* Save Button - Only show if not completing onboarding */}
      {!onComplete && (
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            onClick={onSave}
            disabled={totalTasks === 0 || busy || !routineName.trim()}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white flex items-center justify-center space-x-2 flex-1"
          >
            {busy ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>💾 Save My Planner</span>
              </>
            )}
          </Button>
        </div>
      )}

      {(totalTasks === 0 || !routineName.trim()) && !onComplete && (
        <p className="text-center text-sm text-amber-600">
          {!routineName.trim()
            ? "Please enter a planner name to continue"
            : "Click on a day to add tasks to your routine"}
        </p>
      )}
    </>
  );
}

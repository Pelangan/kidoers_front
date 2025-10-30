"use client";

import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
} from "../../../../../components/ui/card";
import { FamilyMemberSelector } from "./FamilyMemberSelector";
import { Save } from "lucide-react";
import type {
  FamilyMember,
  EnhancedFamilyMember,
} from "../types/routineBuilderTypes";

interface RoutineDetailsCardProps {
  // Routine data
  routineName: string;
  onRoutineNameChange: (name: string) => void;
  routine: any;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  busy: boolean;
  
  // Family members
  enhancedFamilyMembers: EnhancedFamilyMember[];
  selectedMemberIds: string[];
  setSelectedMemberIds: (ids: string[]) => void;
  getMemberColors: (color: string) => any;
  
  // View mode
  viewMode: "calendar" | "group";
  setViewMode: (mode: "calendar" | "group") => void;
  
  // Onboarding completion
  onComplete?: () => void;
  totalTasks?: number;
}

export default function RoutineDetailsCard({
  routineName,
  onRoutineNameChange,
  routine,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  busy,
  enhancedFamilyMembers,
  selectedMemberIds,
  setSelectedMemberIds,
  getMemberColors,
  viewMode,
  setViewMode,
  onComplete,
  totalTasks,
}: RoutineDetailsCardProps) {
  const handleRoutineNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    onRoutineNameChange(newName);

    // Mark as having unsaved changes if name is different from current routine
    if (routine && routine.name !== newName.trim()) {
      setHasUnsavedChanges(true);
    } else if (routine && routine.name === newName.trim()) {
      setHasUnsavedChanges(false);
    }
  };

  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="pt-4">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-6">
            {/* Left: Planner name - give it space */}
            <div className="w-[28rem]">
                <Label htmlFor="routineName">Planner Name</Label>
                <div className="relative">
                  <Input
                    id="routineName"
                    placeholder="My Planner"
                    value={routineName}
                    onChange={handleRoutineNameChange}
                    className="bg-white"
                    disabled={busy}
                  />
                </div>
                {!routineName.trim() && (
                  <p className="text-sm text-amber-600 mt-1">
                    Planner name is required to save your planner
                  </p>
                )}
              </div>
            {/* Right: Visible members + actions */}
            <div className="flex items-end gap-4">
              {/* Family Member Selector */}
              <FamilyMemberSelector
                enhancedFamilyMembers={enhancedFamilyMembers}
                selectedMemberIds={selectedMemberIds}
                setSelectedMemberIds={setSelectedMemberIds}
                getMemberColors={getMemberColors}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />

              {/* Complete Onboarding Button - Only show during onboarding */}
              {onComplete && (
                <div className="flex-shrink-0">
                  <Button
                    onClick={onComplete}
                    disabled={busy || !routineName.trim()}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm px-3 py-2 h-8"
                  >
                    {busy ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        <span className="text-xs">Saving...</span>
                      </div>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-1" />
                        <span className="text-xs">Complete Onboarding</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {selectedMemberIds.length === 0 && (
            <p className="text-sm text-amber-600">
              Please select one or more family members to start building
              their routine
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Card,
  CardContent,
} from "../../../../../components/ui/card";
import { FamilyMemberSelector } from "./FamilyMemberSelector";
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
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-md">
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

              {/* Family Member Selector */}
              <FamilyMemberSelector
                enhancedFamilyMembers={enhancedFamilyMembers}
                selectedMemberIds={selectedMemberIds}
                setSelectedMemberIds={setSelectedMemberIds}
                getMemberColors={getMemberColors}
                viewMode={viewMode}
                setViewMode={setViewMode}
              />
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

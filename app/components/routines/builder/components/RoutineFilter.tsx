"use client";

import { useState } from "react";
import { Button } from "../../../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { Badge } from "../../../../../components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoutineFilterValue = 'ALL' | 'UNASSIGNED' | string;

interface RoutineGroup {
  id: string;
  name: string;
  color: string | null;
  task_count: number;
}

interface RoutineFilterProps {
  groups: RoutineGroup[];
  selectedGroupId: RoutineFilterValue;
  onSelectGroup: (groupId: RoutineFilterValue) => void;
  unassignedCount: number;  // Count of tasks with group_id === null
}

// Color mapping for routine groups
const colorMap: Record<string, { dot: string; chip: string }> = {
  blue: { dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700 border-blue-300' },
  orange: { dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-700 border-orange-300' },
  green: { dot: 'bg-green-500', chip: 'bg-green-100 text-green-700 border-green-300' },
  red: { dot: 'bg-red-500', chip: 'bg-red-100 text-red-700 border-red-300' },
  purple: { dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700 border-purple-300' },
  pink: { dot: 'bg-pink-500', chip: 'bg-pink-100 text-pink-700 border-pink-300' },
  teal: { dot: 'bg-teal-500', chip: 'bg-teal-100 text-teal-700 border-teal-300' },
  indigo: { dot: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
};

const getColorClasses = (color: string | null) => {
  const normalizedColor = color?.toLowerCase() || 'blue';
  return colorMap[normalizedColor] || colorMap.blue;
};

export function RoutineFilter({
  groups,
  selectedGroupId,
  onSelectGroup,
  unassignedCount,
}: RoutineFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get selected group info for chip display
  const selectedGroup = selectedGroupId === 'ALL' 
    ? null 
    : selectedGroupId === 'UNASSIGNED'
    ? { name: 'Unassigned', task_count: unassignedCount, color: null }
    : groups.find(g => g.id === selectedGroupId);

  const getDisplayValue = () => {
    if (selectedGroupId === 'ALL') {
      return 'All routines';
    }
    if (selectedGroupId === 'UNASSIGNED') {
      return 'Unassigned';
    }
    return selectedGroup?.name || 'Select routine';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Dropdown */}
      <Select
        value={selectedGroupId}
        onValueChange={(value) => {
          onSelectGroup(value as RoutineFilterValue);
          setIsOpen(false);
        }}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Select routine">
            <span className="text-sm font-medium">{getDisplayValue()}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          className="!z-[9999] !bg-white !shadow-xl !text-gray-900"
          sideOffset={5}
          style={{ zIndex: 9999 }}
        >
          {/* All routines option */}
          <SelectItem value="ALL">
            <div className="flex items-center gap-2">
              <span>All routines</span>
            </div>
          </SelectItem>

          {/* Unassigned option */}
          <SelectItem value="UNASSIGNED">
            <div className="flex items-center gap-2">
              <span>Unassigned ({unassignedCount})</span>
            </div>
          </SelectItem>

          {/* Group options */}
          {groups.map((group) => {
            const colors = getColorClasses(group.color);
            return (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", colors.dot)} />
                  <span>{group.name} ({group.task_count})</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Filter chip (shows when a specific routine is selected) */}
      {selectedGroupId !== 'ALL' && selectedGroup && (
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs font-medium",
            selectedGroupId === 'UNASSIGNED'
              ? 'bg-gray-100 text-gray-700 border-gray-300'
              : getColorClasses(selectedGroup.color).chip
          )}
        >
          <span>
            Filtered by: {selectedGroup.name} · {selectedGroup.task_count} tasks
          </span>
          <button
            onClick={() => onSelectGroup('ALL')}
            className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
            aria-label="Clear filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}


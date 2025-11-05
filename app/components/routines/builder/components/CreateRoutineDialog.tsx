"use client";

import { useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../../components/ui/dialog";
import { Loader2 } from "lucide-react";
import { createRoutineGroup } from "../../../../lib/api";
import { cn } from "@/lib/utils";

interface CreateRoutineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  routineId: string;
  onCreated: (group: { id: string; name: string; color: string }) => void;
}

// Available colors for routines
const AVAILABLE_COLORS = [
  { value: "blue", label: "Blue", dot: "bg-blue-500", bg: "bg-blue-100", border: "border-blue-300" },
  { value: "orange", label: "Orange", dot: "bg-orange-500", bg: "bg-orange-100", border: "border-orange-300" },
  { value: "green", label: "Green", dot: "bg-green-500", bg: "bg-green-100", border: "border-green-300" },
  { value: "red", label: "Red", dot: "bg-red-500", bg: "bg-red-100", border: "border-red-300" },
  { value: "purple", label: "Purple", dot: "bg-purple-500", bg: "bg-purple-100", border: "border-purple-300" },
  { value: "pink", label: "Pink", dot: "bg-pink-500", bg: "bg-pink-100", border: "border-pink-300" },
  { value: "teal", label: "Teal", dot: "bg-teal-500", bg: "bg-teal-100", border: "border-teal-300" },
  { value: "indigo", label: "Indigo", dot: "bg-indigo-500", bg: "bg-indigo-100", border: "border-indigo-300" },
] as const;


export default function CreateRoutineDialog({
  isOpen,
  onOpenChange,
  routineId,
  onCreated,
}: CreateRoutineDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("blue");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setName("");
      setSelectedColor("blue");
      setError(null);
    }
    onOpenChange(open);
  };

  const handleCreate = async () => {
    // Validate
    if (!name.trim()) {
      setError("Routine name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createRoutineGroup(routineId, {
        name: name.trim(),
        color: selectedColor,
      });

      // Call onCreated callback with the new group
      onCreated({
        id: result.id,
        name: result.name,
        color: result.color || "blue",
      });

      // Close dialog
      handleOpenChange(false);
    } catch (err: any) {
      console.error("[CreateRoutineDialog] Error creating routine:", err);
      setError(err?.message || "Failed to create routine. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Routine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="routine-name">
              Routine Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="routine-name"
              placeholder="e.g., Bedtime, Morning Routine"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={isCreating}
              className={error && !name.trim() ? "border-red-500" : ""}
            />
            {error && !name.trim() && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>

          {/* Color selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              {AVAILABLE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  disabled={isCreating}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400",
                    color.dot,
                    selectedColor === color.value
                      ? "ring-2 ring-offset-2 ring-gray-900 outline outline-2 outline-gray-900"
                      : ""
                  )}
                  aria-label={`Select ${color.label} color`}
                />
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && name.trim() && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Routine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


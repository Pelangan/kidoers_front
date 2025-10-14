"use client";

import { Button } from "../../../../../components/ui/button";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  isEditMode: boolean;
  onBack?: () => void;
}

export default function BackButton({ isEditMode, onBack }: BackButtonProps) {
  if (!isEditMode || !onBack) {
    return null;
  }

  return (
    <div className="mb-4">
      <Button
        onClick={onBack}
        variant="outline"
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Chores
      </Button>
    </div>
  );
}

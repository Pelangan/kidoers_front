"use client"

import ManualRoutineBuilder from "../../routines/builder/ManualRoutineBuilder"

interface CreateRoutineStepProps {
  familyId: string
  onBack?: () => void
  onComplete: () => void
}

export default function CreateRoutineStep({ familyId, onBack, onComplete }: CreateRoutineStepProps) {
  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      <ManualRoutineBuilder 
        familyId={familyId} 
        onComplete={onComplete}
      />
    </div>
  )
}

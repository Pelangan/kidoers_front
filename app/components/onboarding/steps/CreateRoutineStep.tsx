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
      <ManualRoutineBuilder 
        familyId={familyId} 
        onComplete={onComplete}
      />
    </div>
  )
}

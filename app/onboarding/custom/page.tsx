"use client";

import { Suspense } from "react";
import ManualRoutineBuilder from "../../components/routines/builder/ManualRoutineBuilder";

export default function CustomRoutinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <ManualRoutineBuilder />
    </Suspense>
  );
}

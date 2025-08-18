"use client";

import { useEffect, useState } from "react";
import CreateFamilyStep from "./steps/CreateFamilyStep";
import CreateRoutineStep from "./steps/CreateRoutineStep";
import { useRouter } from "next/navigation";
import { apiService } from "../../lib/api";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const totalSteps: 2 = 2;

  useEffect(() => {
    (async () => {
      try {
        const status = await apiService.getOnboardingStatus();

        if (!status.has_family) {
          setCurrentStep(1);
          setFamilyId(null);
          setLoading(false);
          return;
        }

        const fam = status.in_progress;
        if (fam && fam.setup_state !== "complete") {
          setFamilyId(fam.id);
          // If backend says we are beyond step 1, jump to step 2
          setCurrentStep(fam.setup_step === "create_family" ? 1 : 2);
          setLoading(false);
          return;
        }

        // Completed from another tab etc.
        router.push("/dashboard");
      } catch (e: any) {
        console.error("Failed to load onboarding status", e);
        setError("Failed to load onboarding status.");
        setLoading(false);
      }
    })();
  }, [router]);

  const handleFamilyCreated = (newFamilyId: string) => {
    setFamilyId(newFamilyId);
    setCurrentStep(2);
  };

  const handleRoutineCreated = async () => {
    // Step 2 wire-up will be done later; keep callback for compatibility
    onComplete();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to Kidoers</h1>
          <p className="text-gray-600">Let's get your family set up in just a few steps</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm font-medium text-primary">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {currentStep === 1
            ? <CreateFamilyStep onComplete={handleFamilyCreated} />
            : <CreateRoutineStep familyId={familyId!} onComplete={handleRoutineCreated} />}
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

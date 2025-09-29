"use client";

import { useEffect, useState } from "react";
import CreateFamilyStep from "./steps/CreateFamilyStep";
import CreateRoutineStep from "./steps/CreateRoutineStep";
import { useRouter } from "next/navigation";
import { apiService } from "../../lib/api";
import { Button } from "../../../components/ui/button";
import { ChevronLeft } from "lucide-react";

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
          // If backend says we are at create_family, go to step 1, otherwise go to step 2 (create_routine)
          setCurrentStep(fam.setup_step === "create_family" ? 1 : 2);
          setLoading(false);
          return;
        }

        // If no in_progress family or all families are complete, go to dashboard
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
    onComplete();
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2);
    }
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Only for Step 2 */}
      {currentStep === 2 && (
        <header className="bg-white border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setCurrentStep(1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-semibold text-balance">Create Your Planner</h1>
            </div>
            <div className="w-20" />
          </div>

          <div className="flex justify-center mt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full w-full"></div>
              </div>
              <span className="text-sm font-medium text-orange-500">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
          </div>
        </header>
      )}

      <div className={currentStep === 2 ? "flex-1 overflow-hidden" : "container mx-auto px-4 py-8"}>
        {currentStep !== 2 && (
          <div className="mb-0">
            {/* Progress Bar - Top Left */}
            <div className="flex items-center gap-3 mb-2 ml-6">
              <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
              <div className="flex gap-1">
                {/* Step 1 */}
                <div className={`w-8 h-2 rounded-full ${currentStep >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                {/* Step 2 */}
                <div className={`w-8 h-2 rounded-full ${currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
              </div>
              <span className="text-sm font-medium text-orange-500">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>

            {/* Centered Title and Subtitle */}
            <div className="text-center">
              {currentStep === 1 && (
                <>
                  <h1 className="text-4xl font-bold text-gray-800 mb-1">Welcome to Kidoers</h1>
                  <p className="text-base text-gray-600">Let's get your family set up in just a few steps</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className={currentStep === 2 ? "w-full" : "max-w-2xl mx-auto"}>
          {currentStep === 1 && (
            <CreateFamilyStep familyId={familyId ?? null} onComplete={handleFamilyCreated} />
          )}
          {currentStep === 2 && (
            <CreateRoutineStep
              familyId={familyId!}
              onBack={prevStep}
              onComplete={handleRoutineCreated}
            />
          )}
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

"use client";

import { useEffect, useState } from "react";
import CreateFamilyStep from "./steps/CreateFamilyStep";
import CreateRoutineStep from "./steps/CreateRoutineStep";
import ChooseRoutineMethodStep from "./steps/ChooseRoutineMethodStep";
import { useRouter } from "next/navigation";
import { apiService } from "../../lib/api";

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const totalSteps: 3 = 3;

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

  const handleRoutineMethodChosen = () => {
    setCurrentStep(3);
  };

  const handleRoutineCreated = async () => {
    onComplete();
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3);
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
    <div className="min-h-screen bg-gradient-soft">
      <div className={currentStep === 3 ? "w-full py-8" : "container mx-auto px-4 py-8"}>
        <div className="mb-0">
          {currentStep === 3 ? (
            /* Step 3 - Progress bar on left, title centered */
            <div className="flex items-center mb-2">
              {/* Progress Bar - Left side */}
              <div className="flex items-center gap-3 ml-6">
                <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
                <div className="flex gap-1">
                  {/* Step 1 */}
                  <div className={`w-8 h-2 rounded-full ${currentStep >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                  {/* Step 2 */}
                  <div className={`w-8 h-2 rounded-full ${currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                  {/* Step 3 */}
                  <div className={`w-8 h-2 rounded-full ${currentStep >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                </div>
                <span className="text-sm font-medium text-orange-500">
                  {Math.round((currentStep / totalSteps) * 100)}%
                </span>
              </div>

              {/* Title - Centered */}
              <div className="flex-1 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">Create Your Own Routine</h1>
                <p className="text-sm text-gray-600">Drag tasks from the library to build your custom routine.</p>
              </div>

              {/* Spacer to balance the layout */}
              <div className="w-48"></div>
            </div>
          ) : (
            /* Steps 1 & 2 - Original centered layout */
            <>
              {/* Progress Bar - Top Left */}
              <div className="flex items-center gap-3 mb-2 ml-6">
                <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
                <div className="flex gap-1">
                  {/* Step 1 */}
                  <div className={`w-8 h-2 rounded-full ${currentStep >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                  {/* Step 2 */}
                  <div className={`w-8 h-2 rounded-full ${currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                  {/* Step 3 */}
                  <div className={`w-8 h-2 rounded-full ${currentStep >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
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
                {currentStep === 2 && (
                  <>
                    <h1 className="text-4xl font-bold text-gray-800 mb-1">Choose How to Create Your Routine</h1>
                    <p className="text-base text-gray-600">Pick the approach that fits your style. You can always change it later.</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className={currentStep === 3 ? "w-full" : "max-w-2xl mx-auto"}>
          {currentStep === 1 && (
            <CreateFamilyStep familyId={familyId ?? null} onComplete={handleFamilyCreated} />
          )}
          {currentStep === 2 && (
            <ChooseRoutineMethodStep
              familyId={familyId!}
              onBack={prevStep}
              onComplete={handleRoutineMethodChosen}
            />
          )}
          {currentStep === 3 && (
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

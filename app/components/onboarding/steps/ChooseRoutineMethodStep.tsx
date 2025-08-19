"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "../../../lib/api";

interface Props {
  familyId: string;
  onBack?: () => void;
}

// Simple CTA Card
function MethodCard({
  title,
  subtitle,
  bullets,
  cta,
  onClick,
}: {
  title: string;
  subtitle: string;
  bullets?: string[];
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-xl font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600 mb-4">{subtitle}</p>
      {bullets && bullets.length > 0 && (
        <ul className="text-sm text-gray-500 space-y-1 mb-6 list-disc pl-5">
          {bullets.map((b, i) => (<li key={i}>{b}</li>))}
        </ul>
      )}
      <button
        onClick={onClick}
        className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {cta}
      </button>
    </div>
  );
}

export default function ChooseRoutineMethodStep({ familyId, onBack }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const persistAndGo = useCallback(
    async (path: string) => {
      if (busy) return;
      try {
        setBusy(true);
        // Mark onboarding step = choose_flow (persist resume point)
        await apiService.updateOnboardingStep(familyId, "choose_flow");
        router.push(`${path}?family=${familyId}`);
      } finally {
        setBusy(false);
      }
    },
    [busy, familyId, router]
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          Choose How to Create Your Routine
        </h2>
        <p className="text-gray-600 mt-2">
          Pick the approach that fits your style. You can always change it later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MethodCard
          title="Let the App Suggest a Routine"
          subtitle="Answer a few questions and get AI‑powered recommendations."
          bullets={["Smart suggestions", "Personalized for your family"]}
          cta={busy ? "Please wait…" : "Get Suggestions"}
          onClick={() => persistAndGo("/onboarding/suggested")}
        />

        <MethodCard
          title="Use a Routine from the Community"
          subtitle="Browse and customize routines shared by other families."
          bullets={["Community tested", "Ready to use"]}
          cta={busy ? "Please wait…" : "Browse Community"}
          onClick={() => persistAndGo("/onboarding/community")}
        />

        <MethodCard
          title="Start from Scratch"
          subtitle="Build your own custom routine step by step."
          bullets={["Full control", "Completely customizable"]}
          cta={busy ? "Please wait…" : "Build Custom"}
          onClick={() => persistAndGo("/onboarding/custom")}
        />

        <MethodCard
          title="Chat with the AI Assistant"
          subtitle="Answer a few quick questions in a conversation."
          bullets={["Fast & interactive", "Friendly chat experience"]}
          cta={busy ? "Please wait…" : "Start Chat"}
          onClick={() => persistAndGo("/onboarding/chat")}
        />
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        💡 You can always modify your routine later or try a different approach.
      </p>
    </div>
  );
}

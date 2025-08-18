"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { apiService } from "../lib/api";

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        if (!u) {
          router.push("/signin");
          return;
        }
        setUser(u);

        // Ask backend what to show next
        const status = await apiService.getOnboardingStatus();
        if (!status.has_family) {
          setLoading(false); // show wizard from step 1
          return;
        }

        const fam = status.in_progress;
        if (fam && fam.setup_state !== "complete") {
          // We'll let the wizard read the step/family id from the backend again
          setLoading(false);
          return;
        }

        // Completed → Dashboard
        router.push("/dashboard");
      } catch (e) {
        console.error(e);
        router.push("/signin");
      }
    })();
  }, [router]);

  const handleOnboardingComplete = () => router.push("/dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return <OnboardingWizard onComplete={handleOnboardingComplete} />;
} 
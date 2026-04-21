"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { AgeMode } from "@/types";
import { createClient } from "@/lib/supabase/client";

const AGE_MODE_STORAGE_KEY = "celestial_age_mode";

function isValidAgeMode(v: string | null): v is AgeMode {
  return v === "young_reader" || v === "teen" || v === "adult";
}

interface AgeModeContextValue {
  ageMode: AgeMode;
  setAgeMode: (mode: AgeMode) => void;
}

const AgeModeContext = createContext<AgeModeContextValue>({
  ageMode: "adult",
  setAgeMode: () => {},
});

export function AgeModeProvider({
  initialMode,
  children,
}: {
  initialMode: AgeMode;
  children: ReactNode;
}) {
  const [ageMode, setAgeModeState] = useState<AgeMode>(initialMode);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) return;
      const raw = localStorage.getItem(AGE_MODE_STORAGE_KEY);
      if (isValidAgeMode(raw)) setAgeModeState(raw);
    });
  }, []);

  const setAgeMode = useCallback(async (mode: AgeMode) => {
    setAgeModeState(mode);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("sb_profiles")
        .update({ age_mode: mode, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    } else {
      localStorage.setItem(AGE_MODE_STORAGE_KEY, mode);
    }
  }, []);

  return (
    <AgeModeContext.Provider value={{ ageMode, setAgeMode }}>
      {children}
    </AgeModeContext.Provider>
  );
}

export function useAgeMode() {
  return useContext(AgeModeContext);
}

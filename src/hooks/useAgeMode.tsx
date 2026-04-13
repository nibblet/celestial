"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AgeMode } from "@/types";
import { createClient } from "@/lib/supabase/client";

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

  const setAgeMode = useCallback(async (mode: AgeMode) => {
    setAgeModeState(mode);
    // Persist to profile
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("sb_profiles")
        .update({ age_mode: mode, updated_at: new Date().toISOString() })
        .eq("id", user.id);
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

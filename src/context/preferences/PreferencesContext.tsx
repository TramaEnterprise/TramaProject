import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PreferencesContext } from "./preferences_init";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [miniNavEnabled, setMiniNavEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("pref_miniNav") === "true";
  });

  const setMiniNavEnabled = useCallback((val: boolean) => {
    localStorage.setItem("pref_miniNav", String(val));
    setMiniNavEnabledState(val);
  }, []);

  const value = useMemo(
    () => ({ miniNavEnabled, setMiniNavEnabled }),
    [miniNavEnabled, setMiniNavEnabled]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

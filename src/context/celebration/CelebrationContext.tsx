import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CelebrationContext } from "./celebration_init";
import ConfettiBurst from "@/components/common/ConfettiBurst";

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [burstId, setBurstId] = useState<number | null>(null);

  const celebrate = useCallback(() => {
    setBurstId((id) => (id === null ? 0 : id + 1));
  }, []);

  const value = useMemo(() => ({ celebrate }), [celebrate]);

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      {burstId !== null && (
        <ConfettiBurst key={burstId} onComplete={() => setBurstId(null)} />
      )}
    </CelebrationContext.Provider>
  );
}

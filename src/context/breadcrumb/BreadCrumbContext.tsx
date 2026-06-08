import { useCallback, useMemo, useState } from "react";
import { BreadcrumbContext, type BreadcrumbSlot, type BreadcrumbSlots } from "./breadcrumb_init";

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<BreadcrumbSlots>({});

  const setSlot = useCallback((slot: string, value: BreadcrumbSlot | undefined) => {
    setSlots((prev) => {
      if (value === undefined) {
        if (!(slot in prev)) return prev;
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      const cur = prev[slot];
      if (cur && cur.label === value.label && cur.to === value.to) return prev;
      return { ...prev, [slot]: value };
    });
  }, []);

  const value = useMemo(() => ({ slots, setSlot }), [slots, setSlot]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

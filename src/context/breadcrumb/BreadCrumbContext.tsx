import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BreadcrumbContext, type BreadcrumbSlot, type BreadcrumbSlots } from "./breadcrumb_init";
import { useLocation } from "react-router";

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<BreadcrumbSlots>({});

  const { pathname } = useLocation();
  const [originPath, setOriginPath] = useState<string | null>(null);
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    setOriginPath(prevRef.current);
    prevRef.current = pathname;
  }, [pathname]);

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

  const value = useMemo(() => ({ slots, setSlot, originPath }), [slots, setSlot, originPath]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

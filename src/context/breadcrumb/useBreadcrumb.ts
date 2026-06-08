import { useContext, useEffect } from "react";
import { BreadcrumbContext } from "./breadcrumb_init";

function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error("useBreadcrumb must be used within BreadcrumbProvider");
  return ctx;
}

export function useBreadcrumbSlots() {
  return useBreadcrumbContext().slots;
}

export function useBreadcrumbLabel(slot: string, label: string | undefined | null, to?: string) {
  const { setSlot } = useBreadcrumbContext();
  useEffect(() => {
    if (!label) {
      setSlot(slot, undefined);
      return;
    }
    setSlot(slot, { label, to });
    return () => setSlot(slot, undefined);
  }, [slot, label, to, setSlot]);
}

import { createContext } from "react";

export type BreadcrumbSlot = { label: string; to?: string };
export type BreadcrumbSlots = Record<string, BreadcrumbSlot | undefined>;

export type BreadcrumbContextValue = {
  slots: BreadcrumbSlots;
  setSlot: (slot: string, value: BreadcrumbSlot | undefined) => void;
  originPath: string | null;   
};

export const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

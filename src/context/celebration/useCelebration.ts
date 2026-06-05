import { useContext } from "react";
import { CelebrationContext, type CelebrationContextType } from "./celebration_init";

export function useCelebration(): CelebrationContextType {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error("useCelebration must be used within a CelebrationProvider");
  }
  return context;
}

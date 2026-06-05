import { createContext } from "react";

export type CelebrationContextType = {
  celebrate: () => void;
};

export const CelebrationContext = createContext<CelebrationContextType | null>(null);

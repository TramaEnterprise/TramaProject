import { createContext } from "react";
import type { User } from "firebase/auth";
import type { UserMinimal } from "@/types/UserProfile";

export type AuthContextType = {
  user: User | null;
  profile: UserMinimal | null;
  isGuest: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  enterAsGuest: () => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

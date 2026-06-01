import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ThemeContext } from "./ThemeContext_init";

type Theme = "light" | "dark";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = (localStorage.getItem("theme") as Theme) ?? "light";
    document.documentElement.setAttribute("data-theme", saved);
    return saved;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

 const toggleTheme = useCallback(
    () => setTheme(t => (t === "light" ? "dark" : "light")),
    []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);


  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

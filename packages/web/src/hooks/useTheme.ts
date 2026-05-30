import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "schemagen.theme";

// Theme is stored as a plain string, not JSON-encoded. Custom (de)serializer
// keeps existing values written by older builds compatible.
const stringIO = {
  serialize: (v: Theme): string => v,
  deserialize: (raw: string): Theme =>
    raw === "light" || raw === "dark" || raw === "system" ? raw : "system",
};

// Apply the user's choice as a class on <html>. The CSS uses .dark for an
// explicit dark override and .light to opt out of the system media query.
function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.remove("dark", "light");
  if (theme === "dark") html.classList.add("dark");
  else if (theme === "light") html.classList.add("light");
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [theme, setTheme] = useLocalStorage<Theme>(STORAGE_KEY, "system", stringIO);

  // Apply on every state change so first render and toggles both take effect.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme };
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ViewMode = "client" | "professional";

const STORAGE_KEY = "elevate_view_mode";

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

function getStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "client";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "client" || stored === "professional") return stored;
  return "client";
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(getStoredViewMode);

  useEffect(() => {
    const stored = getStoredViewMode();
    setViewModeState(stored);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const value: ViewModeContextValue = {
    viewMode,
    setViewMode,
  };

  return (
    <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return ctx;
}

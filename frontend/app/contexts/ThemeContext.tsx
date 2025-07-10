import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Color theme definitions
export interface ColorTheme {
  name: string;
  bg: {
    primary: string;
    secondary: string;
    tertiary: string;
    canvas: string;
  };
  accent: {
    primary: string;
    secondary: string;
    hover: string;
    selected: string;
    ring: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  button: {
    primary: string;
    secondary: string;
    hover: string;
  };
  border: string;
}

export const colorThemes: Record<string, ColorTheme> = {
  purple: {
    name: "Purple",
    bg: {
      primary: "#1C1323",
      secondary: "#2A1B3D", 
      tertiary: "#2E1E40",
      canvas: "#1C1323"
    },
    accent: {
      primary: "#9F5DE2",
      secondary: "#7E3AF2",
      hover: "#8B5CF6",
      selected: "#A855F7",
      ring: "#FFD6FA"
    },
    text: {
      primary: "#ffffff",
      secondary: "#E5E7EB",
      muted: "#9CA3AF"
    },
    button: {
      primary: "#EC4899",
      secondary: "#BE185D",
      hover: "#F472B6"
    },
    border: "#7C3AED"
  },
  blue: {
    name: "Blue",
    bg: {
      primary: "#112D4D",
      secondary: "#213D61",
      tertiary: "#132F50",
      canvas: "#112D4D"
    },
    accent: {
      primary: "#4882C4",
      secondary: "#5A9FF8",
      hover: "#6BB0FF",
      selected: "#4882C4",
      ring: "#B8D4F0"
    },
    text: {
      primary: "#ffffff",
      secondary: "#E2E8F0",
      muted: "#94A3B8"
    },
    button: {
      primary: "#106478",
      secondary: "#0E5A6B",
      hover: "#74C5B9"
    },
    border: "#4882C4"
  },
  yellow: {
    name: "Yellow",
    bg: {
      primary: "#F4EBD4",
      secondary: "#E8D3AC",
      tertiary: "#DACCAF",
      canvas: "#F4EBD4"
    },
    accent: {
      primary: "#BDAD90",
      secondary: "#F1E5CF",
      hover: "#C9B896",
      selected: "#BDAD90",
      ring: "#FFFAED"
    },
    text: {
      primary: "#1C1917",
      secondary: "#44403C",
      muted: "#78716C"
    },
    button: {
      primary: "#CDAF8F",
      secondary: "#554137",
      hover: "#D4B896"
    },
    border: "#BDAD90"
  },
  green: {
    name: "Green",
    bg: {
      primary: "#64A3A3",
      secondary: "#76AFAA",
      tertiary: "#CCEEE5",
      canvas: "#64A3A3"
    },
    accent: {
      primary: "#8EC1BE",
      secondary: "#539296",
      hover: "#9CCBC8",
      selected: "#8EC1BE",
      ring: "#E6F7F5"
    },
    text: {
      primary: "#1C1917",
      secondary: "#374151",
      muted: "#6B7280"
    },
    button: {
      primary: "#98C28F",
      secondary: "#7BB26E",
      hover: "#A8CC9F"
    },
    border: "#539296"
  }
};

interface ThemeContextType {
  currentTheme: string;
  theme: ColorTheme;
  setTheme: (themeName: string) => void;
  setThemeForCanvas: (canvasId: string, themeName: string) => void;
  getThemeForCanvas: (canvasId: string) => string;
  globalTheme: string;
  setGlobalTheme: (themeName: string) => void;
  colorThemes: Record<string, ColorTheme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [globalTheme, setGlobalThemeState] = useState<string>("purple");
  const [currentTheme, setCurrentTheme] = useState<string>("purple");

  // Load global theme from localStorage on startup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGlobalTheme = localStorage.getItem('global-theme');
      if (savedGlobalTheme && colorThemes[savedGlobalTheme]) {
        setGlobalThemeState(savedGlobalTheme);
        setCurrentTheme(savedGlobalTheme);
      }
    }
  }, []);

  // Save global theme to localStorage
  const setGlobalTheme = (themeName: string) => {
    if (colorThemes[themeName]) {
      setGlobalThemeState(themeName);
      setCurrentTheme(themeName);
      if (typeof window !== 'undefined') {
        localStorage.setItem('global-theme', themeName);
      }
    }
  };

  // Set theme for current context
  const setTheme = (themeName: string) => {
    if (colorThemes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  // Set theme for a specific canvas
  const setThemeForCanvas = (canvasId: string, themeName: string) => {
    if (colorThemes[themeName] && typeof window !== 'undefined') {
      localStorage.setItem(`canvas-theme-${canvasId}`, themeName);
      setCurrentTheme(themeName);
    }
  };
  // Get theme for a specific canvas
  const getThemeForCanvas = (canvasId: string): string => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(`canvas-theme-${canvasId}`);
      if (savedTheme && colorThemes[savedTheme]) {
        return savedTheme;
      }
    }
    return globalTheme;
  };

  const theme = colorThemes[currentTheme] || colorThemes.purple;
  const value: ThemeContextType = {
    currentTheme,
    theme,
    setTheme,
    setThemeForCanvas,
    getThemeForCanvas,
    globalTheme,
    setGlobalTheme,
    colorThemes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceLight: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  divider: string;
  success: string;
  warning: string;
  error: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: "classic-red",
    name: "Classic Red",
    primary: "#DC2626",
    primaryDark: "#991B1B",
    secondary: "#EF4444",
    accent: "#B91C1C",
    background: "#000000",
    surface: "#1A1A1A",
    surfaceLight: "#262626",
    text: "#FFFFFF",
    textSecondary: "#D1D5DB",
    textTertiary: "#9CA3AF",
    border: "#3A3A3A",
    divider: "#262626",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#DC2626",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    primary: "#0EA5E9",
    primaryDark: "#0284C7",
    secondary: "#38BDF8",
    accent: "#0369A1",
    background: "#0F172A",
    surface: "#1E293B",
    surfaceLight: "#334155",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textTertiary: "#94A3B8",
    border: "#475569",
    divider: "#334155",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  {
    id: "forest-green",
    name: "Forest Green",
    primary: "#10B981",
    primaryDark: "#059669",
    secondary: "#34D399",
    accent: "#047857",
    background: "#064E3B",
    surface: "#065F46",
    surfaceLight: "#047857",
    text: "#ECFDF5",
    textSecondary: "#D1FAE5",
    textTertiary: "#A7F3D0",
    border: "#059669",
    divider: "#047857",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    primary: "#9333EA",
    primaryDark: "#7E22CE",
    secondary: "#A855F7",
    accent: "#6B21A8",
    background: "#1E1B4B",
    surface: "#312E81",
    surfaceLight: "#3730A3",
    text: "#F5F3FF",
    textSecondary: "#DDD6FE",
    textTertiary: "#C4B5FD",
    border: "#4C1D95",
    divider: "#3730A3",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    primary: "#F97316",
    primaryDark: "#EA580C",
    secondary: "#FB923C",
    accent: "#C2410C",
    background: "#1C1917",
    surface: "#292524",
    surfaceLight: "#44403C",
    text: "#FAFAF9",
    textSecondary: "#E7E5E4",
    textTertiary: "#D6D3D1",
    border: "#57534E",
    divider: "#44403C",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  {
    id: "midnight-blue",
    name: "Midnight Blue",
    primary: "#3B82F6",
    primaryDark: "#2563EB",
    secondary: "#60A5FA",
    accent: "#1D4ED8",
    background: "#0C0A09",
    surface: "#1C1917",
    surfaceLight: "#292524",
    text: "#FAFAF9",
    textSecondary: "#E7E5E4",
    textTertiary: "#D6D3D1",
    border: "#44403C",
    divider: "#292524",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    primary: "#F43F5E",
    primaryDark: "#E11D48",
    secondary: "#FB7185",
    accent: "#BE123C",
    background: "#1F1315",
    surface: "#2D1B1F",
    surfaceLight: "#3F2429",
    text: "#FFF1F2",
    textSecondary: "#FFE4E6",
    textTertiary: "#FECDD3",
    border: "#4C1D24",
    divider: "#3F2429",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#F43F5E",
  },
  {
    id: "emerald-light",
    name: "Emerald Light",
    primary: "#059669",
    primaryDark: "#047857",
    secondary: "#10B981",
    accent: "#065F46",
    background: "#F0FDF4",
    surface: "#DCFCE7",
    surfaceLight: "#BBF7D0",
    text: "#14532D",
    textSecondary: "#166534",
    textTertiary: "#15803D",
    border: "#86EFAC",
    divider: "#BBF7D0",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
];

export interface ThemeSettings {
  businessName: string;
  backgroundImage: string | null;
  colorScheme: ColorScheme;
}

const DEFAULT_THEME: ThemeSettings = {
  businessName: "iChargeTexas",
  backgroundImage: null,
  colorScheme: COLOR_SCHEMES[0],
};

export const [ThemeContext, useTheme] = createContextHook(() => {
  const [theme, setThemeState] = useState<ThemeSettings>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem("@app_theme");
      if (storedTheme) {
        setThemeState(JSON.parse(storedTheme));
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = useCallback(async (newTheme: Partial<ThemeSettings>) => {
    const updatedTheme = { ...theme, ...newTheme };
    setThemeState(updatedTheme);
    try {
      await AsyncStorage.setItem("@app_theme", JSON.stringify(updatedTheme));
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, [theme]);

  const setBusinessName = useCallback(async (name: string) => {
    await setTheme({ businessName: name });
  }, [setTheme]);

  const setBackgroundImage = useCallback(async (imageUri: string | null) => {
    await setTheme({ backgroundImage: imageUri });
  }, [setTheme]);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    await setTheme({ colorScheme: scheme });
  }, [setTheme]);

  const getComplementaryColor = useCallback((hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const hsl = rgbToHsl(r, g, b);
    let newHue = (hsl.h + 180) % 360;
    
    const complementary = hslToRgb(newHue, hsl.s, hsl.l);
    return `#${componentToHex(complementary.r)}${componentToHex(complementary.g)}${componentToHex(complementary.b)}`;
  }, []);

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s, l };
  };

  const hslToRgb = (h: number, s: number, l: number) => {
    h /= 360;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  };

  const componentToHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  const colors = useMemo(() => ({
    primary: theme.colorScheme.primary,
    primaryDark: theme.colorScheme.primaryDark,
    secondary: theme.colorScheme.secondary,
    accent: theme.colorScheme.accent,
    roadside: getComplementaryColor(theme.colorScheme.primary),
    roadsideDark: getComplementaryColor(theme.colorScheme.primaryDark),
    charging: theme.colorScheme.success,
    chargingDark: "#059669",
    background: theme.colorScheme.background,
    surface: theme.colorScheme.surface,
    surfaceLight: theme.colorScheme.surfaceLight,
    camo1: "#2C2C2C",
    camo2: "#1A1A1A",
    camo3: "#3A3A3A",
    camo4: "#0D0D0D",
    text: theme.colorScheme.text,
    textSecondary: theme.colorScheme.textSecondary,
    textTertiary: theme.colorScheme.textTertiary,
    border: theme.colorScheme.border,
    divider: theme.colorScheme.divider,
    success: theme.colorScheme.success,
    warning: theme.colorScheme.warning,
    error: theme.colorScheme.error,
    white: "#FFFFFF",
    black: "#000000",
    overlay: "rgba(0, 0, 0, 0.7)",
    card: `${theme.colorScheme.surface}E6`,
  }), [theme.colorScheme, getComplementaryColor]);

  return useMemo(
    () => ({
      theme,
      colors,
      isLoading,
      setBusinessName,
      setBackgroundImage,
      setColorScheme,
      setTheme,
    }),
    [theme, colors, isLoading, setBusinessName, setBackgroundImage, setColorScheme, setTheme]
  );
});

import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { useAppStore } from "@/store/useAppStore";
import { lightColors, darkColors, type AppColors } from "@/constants/theme";

const ThemeContext = createContext<{ colors: AppColors; isDark: boolean }>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const colorScheme = useAppStore((s) => s.colorScheme);

  const isDark = useMemo(() => {
    if (colorScheme === "dark") return true;
    if (colorScheme === "light") return false;
    return systemScheme === "dark";
  }, [colorScheme, systemScheme]);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

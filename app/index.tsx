import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import { getSetting } from "@/db/repository";
import {
  useAppStore,
  type AppLanguage,
  type AppColorScheme,
} from "@/store/useAppStore";
import { useTheme } from "@/context/ThemeContext";

export default function EntryScreen() {
  const db = useSQLiteContext();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setColorScheme = useAppStore((s) => s.setColorScheme);
  const { colors } = useTheme();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const seen = await getSetting(db, "onboarding_seen");
        if (!active) return;

        const lang = await getSetting(db, "language");
        if (!active) return;
        if (lang === "vi" || lang === "en") setLanguage(lang as AppLanguage);

        const scheme = await getSetting(db, "color_scheme");
        if (!active) return;
        if (scheme === "light" || scheme === "dark" || scheme === "system") {
          setColorScheme(scheme as AppColorScheme);
        }

        router.replace(seen === "1" ? "/(tabs)" : "/onboarding");
      } catch (e) {
        console.error("App initialization failed:", e);
      } finally {
        setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 50);
      }
    })();
    return () => {
      active = false;
    };
  }, [db, setLanguage, setColorScheme]);

  return <View style={{ flex: 1, backgroundColor: colors.bgRoot }} />;
}

import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { migrateDb } from "@/db/database";
import { markPastPlannedWorkoutsMissed } from "@/db/repository";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { GlassAlertProvider } from "@/components/GlassAlert";

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 350, fade: true });

async function initializeDatabase(db: any) {
  await migrateDb(db);
  await markPastPlannedWorkoutsMissed(db);
}

function AppStack() {
  const { colors } = useTheme();
  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/[id]" options={{ presentation: "card" }} />
        <Stack.Screen
          name="workout/edit/[id]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="workout/result/[id]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen name="create-plan" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="runplan.db" onInit={initializeDatabase}>
      <ThemeProvider>
        <GlassAlertProvider>
          <AppStack />
        </GlassAlertProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
}

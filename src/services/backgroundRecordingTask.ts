import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import {
  appendRecordingLocations,
  type RecordingSnapshot,
} from "@/services/recordingSession";
import { updateRecordingLockScreen } from "@/services/recordingLockScreen";
import type { AppLanguage } from "@/store/useAppStore";

export const BACKGROUND_RECORDING_TASK = "Runmio-background-location";

type LocationTaskData = {
  locations: Location.LocationObject[];
};

if (!TaskManager.isTaskDefined(BACKGROUND_RECORDING_TASK)) {
  TaskManager.defineTask<LocationTaskData>(
    BACKGROUND_RECORDING_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      try {
        const snapshot = await appendRecordingLocations(data.locations);
        if (snapshot) await updateRecordingLockScreen(snapshot);
      } catch {
        // A later location batch can continue the same persisted session.
      }
    },
  );
}

export const startBackgroundRecordingUpdates = async (
  language: AppLanguage,
) => {
  const available = await TaskManager.isAvailableAsync();
  const backgroundAvailable =
    await Location.isBackgroundLocationAvailableAsync();
  if (!available || !backgroundAvailable) {
    throw new Error("BACKGROUND_LOCATION_UNAVAILABLE");
  }

  if (
    await Location.hasStartedLocationUpdatesAsync(BACKGROUND_RECORDING_TASK)
  ) {
    return;
  }

  const foregroundService =
    Platform.OS === "android"
      ? {
          notificationTitle:
            language === "vi" ? "Đang ghi hoạt động" : "Recording activity",
          notificationBody:
            language === "vi"
              ? "GPS vẫn hoạt động khi khóa màn hình · chạm để mở"
              : "GPS stays active while locked · tap to open",
          notificationColor: "#22C77A",
          killServiceOnDestroy: false,
        }
      : undefined;

  await Location.startLocationUpdatesAsync(BACKGROUND_RECORDING_TASK, {
    accuracy: Location.Accuracy.High,
    activityType: Location.LocationActivityType.Fitness,
    timeInterval: 2_000,
    distanceInterval: 3,
    deferredUpdatesDistance: 10,
    deferredUpdatesInterval: 5_000,
    deferredUpdatesTimeout: 5_000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: false,
    foregroundService,
  });
};

export const stopBackgroundRecordingUpdates = async () => {
  if (
    await Location.hasStartedLocationUpdatesAsync(BACKGROUND_RECORDING_TASK)
  ) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_RECORDING_TASK);
  }
};

export const syncRecordingLockScreen = async (snapshot: RecordingSnapshot) =>
  updateRecordingLockScreen(snapshot);

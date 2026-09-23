import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassBackground, GlassCard } from "@/components/Glass";
import { useGlassAlert } from "@/components/GlassAlert";
import { RunMap } from "@/components/RunMap";
import { useTheme } from "@/context/ThemeContext";
import {
  getActivePlan,
  getWorkoutForDate,
  saveRecordedActivity,
} from "@/db/repository";
import { useI18n } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import type {
  RecordedRoutePoint,
  TrainingPlan,
  Workout,
  WorkoutType,
} from "@/types/models";

type SessionPhase = "ready" | "recording" | "paused" | "saving";
type RecordSport = "RUN" | "WALK";
type MapMode = "follow" | "route" | "free";

const EARTH_RADIUS_M = 6_371_000;

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const localIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceBetween = (a: RecordedRoutePoint, b: RecordedRoutePoint) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const formatPace = (seconds: number, distanceMeters: number) => {
  if (seconds <= 0 || distanceMeters < 10) return "--:--";
  const pace = Math.round(seconds / (distanceMeters / 1000));
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}`;
};

export default function StartScreen() {
  const db = useSQLiteContext();
  const refreshKey = useAppStore((state) => state.refreshKey);
  const refresh = useAppStore((state) => state.refresh);
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const showAlert = useGlassAlert();

  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sport, setSport] = useState<RecordSport>("RUN");
  const [phase, setPhase] = useState<SessionPhase>("ready");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [route, setRoute] = useState<RecordedRoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<RecordedRoutePoint | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [permission, setPermission] =
    useState<Location.PermissionStatus | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("follow");
  const [mapInteracting, setMapInteracting] = useState(false);
  const [locatingMap, setLocatingMap] = useState(false);
  const [northUpRequest, setNorthUpRequest] = useState(0);

  const phaseRef = useRef<SessionPhase>("ready");
  const sportRef = useRef<RecordSport>("RUN");
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const routeRef = useRef<RecordedRoutePoint[]>([]);
  const lastPointRef = useRef<RecordedRoutePoint | null>(null);
  const distanceRef = useRef(0);
  const elevationRef = useRef(0);
  const sessionStartRef = useRef<Date | null>(null);
  const segmentStartRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef(0);

  const setSessionPhase = useCallback((next: SessionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopLocationUpdates = useCallback(() => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
  }, []);

  const acceptLocation = useCallback(
    (location: Location.LocationObject) => {
      const accuracy = location.coords.accuracy;
      const point: RecordedRoutePoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy,
        timestamp: location.timestamp,
      };
      setCurrentLocation(point);
      setGpsAccuracy(accuracy);

      if (accuracy != null && accuracy > 45) return;
      const previous = lastPointRef.current;
      if (previous) {
        const deltaSeconds = Math.max(
          0.25,
          (point.timestamp - previous.timestamp) / 1000,
        );
        const segmentMeters = distanceBetween(previous, point);
        const maxSpeed = sportRef.current === "WALK" ? 4.5 : 12;
        if (
          segmentMeters < 2 ||
          segmentMeters > 120 ||
          segmentMeters / deltaSeconds > maxSpeed
        ) {
          return;
        }
        distanceRef.current += segmentMeters;
        setDistanceMeters(distanceRef.current);

        if (previous.altitude != null && point.altitude != null) {
          const climb = point.altitude - previous.altitude;
          if (climb > 0 && climb < 20) {
            elevationRef.current += climb;
            setElevationGain(elevationRef.current);
          }
        }
      }
      lastPointRef.current = point;
      routeRef.current = [...routeRef.current, point];
      setRoute(routeRef.current);
    },
    [],
  );

  const beginLocationUpdates = useCallback(async () => {
    stopLocationUpdates();
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
      },
      acceptLocation,
    );
    if (phaseRef.current !== "recording") {
      subscription.remove();
      return;
    }
    locationSubscriptionRef.current = subscription;
  }, [acceptLocation, stopLocationUpdates]);

  const pauseSession = useCallback(
    (withHaptic = true) => {
      if (phaseRef.current !== "recording") return;
      if (segmentStartRef.current != null) {
        accumulatedMsRef.current += Date.now() - segmentStartRef.current;
      }
      segmentStartRef.current = null;
      setElapsedSeconds(Math.floor(accumulatedMsRef.current / 1000));
      stopLocationUpdates();
      setSessionPhase("paused");
      if (withHaptic)
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [setSessionPhase, stopLocationUpdates],
  );

  useEffect(() => {
    if (phase !== "ready") return;
    let active = true;
    (async () => {
      const activePlan = await getActivePlan(db);
      if (!active) return;
      setPlan(activePlan);
      const todayWorkout = activePlan
        ? await getWorkoutForDate(db, activePlan.id, todayIso())
        : null;
      if (!active) return;
      setWorkout(todayWorkout);
      const initialSport = todayWorkout?.type === "WALK" ? "WALK" : "RUN";
      sportRef.current = initialSport;
      setSport(initialSport);

      const response = await Location.getForegroundPermissionsAsync();
      if (!active) return;
      setPermission(response.status);
      if (response.status === Location.PermissionStatus.GRANTED) {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 60_000,
          requiredAccuracy: 200,
        });
        if (active && last) acceptLocation(last);
      }
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, [acceptLocation, db, phase, refreshKey]);

  useEffect(() => {
    if (phase !== "recording") return;
    const update = () => {
      const activeMs = segmentStartRef.current
        ? Date.now() - segmentStartRef.current
        : 0;
      setElapsedSeconds(
        Math.floor((accumulatedMsRef.current + activeMs) / 1000),
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (
      phase !== "ready" ||
      permission !== Location.PermissionStatus.GRANTED
    ) {
      return;
    }
    let active = true;
    let previewSubscription: Location.LocationSubscription | null = null;
    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 2000,
        distanceInterval: 3,
      },
      (location) => {
        if (!active) return;
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        });
        setGpsAccuracy(location.coords.accuracy);
      },
    )
      .then((subscription) => {
        if (!active) {
          subscription.remove();
          return;
        }
        previewSubscription = subscription;
      })
      .catch(() => {});
    return () => {
      active = false;
      previewSubscription?.remove();
    };
  }, [permission, phase]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && phaseRef.current === "recording") {
        pauseSession(false);
      }
    });
    return () => subscription.remove();
  }, [pauseSession]);

  useEffect(() => stopLocationUpdates, [stopLocationUpdates]);

  const ensureLocationPermission = async () => {
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      showAlert(t("locationUnavailableTitle"), t("locationUnavailableHelp"));
      return false;
    }
    let response = await Location.getForegroundPermissionsAsync();
    if (response.status !== Location.PermissionStatus.GRANTED) {
      response = await Location.requestForegroundPermissionsAsync();
    }
    setPermission(response.status);
    if (response.status !== Location.PermissionStatus.GRANTED) {
      showAlert(t("locationDeniedTitle"), t("locationDeniedHelp"));
      return false;
    }
    return true;
  };

  const locateOnMap = async () => {
    if (locatingMap) return;
    setLocatingMap(true);
    try {
      if (!(await ensureLocationPermission())) return;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      });
      setGpsAccuracy(location.coords.accuracy);
      setMapMode("follow");
      void Haptics.selectionAsync();
    } catch {
      showAlert(t("locationUnavailableTitle"), t("locationUnavailableHelp"));
    } finally {
      setLocatingMap(false);
    }
  };

  const startSession = async () => {
    if (!plan) {
      showAlert(t("noCurrentPlan"), t("createPlanToRecord"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("createPlan"), onPress: () => router.push("/create-plan") },
      ]);
      return;
    }
    if (workout?.status === "COMPLETED") {
      showAlert(t("completed"), t("todayWorkoutCompleted"));
      return;
    }
    try {
      if (!(await ensureLocationPermission())) return;
      routeRef.current = [];
      lastPointRef.current = null;
      distanceRef.current = 0;
      elevationRef.current = 0;
      accumulatedMsRef.current = 0;
      sessionStartRef.current = new Date();
      segmentStartRef.current = Date.now();
      setRoute([]);
      setDistanceMeters(0);
      setElevationGain(0);
      setElapsedSeconds(0);
      setMapMode("follow");
      setSessionPhase("recording");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await beginLocationUpdates();
    } catch (error: any) {
      stopLocationUpdates();
      setSessionPhase("ready");
      showAlert(
        t("locationUnavailableTitle"),
        error?.message ?? t("locationUnavailableHelp"),
      );
    }
  };

  const resumeSession = async () => {
    segmentStartRef.current = Date.now();
    setSessionPhase("recording");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await beginLocationUpdates();
    } catch (error: any) {
      pauseSession(false);
      showAlert(
        t("locationUnavailableTitle"),
        error?.message ?? t("locationUnavailableHelp"),
      );
    }
  };

  const resetSession = useCallback(() => {
    stopLocationUpdates();
    routeRef.current = [];
    lastPointRef.current = null;
    distanceRef.current = 0;
    elevationRef.current = 0;
    accumulatedMsRef.current = 0;
    sessionStartRef.current = null;
    segmentStartRef.current = null;
    setRoute([]);
    setDistanceMeters(0);
    setElevationGain(0);
    setElapsedSeconds(0);
    setMapMode("follow");
    setSessionPhase("ready");
  }, [setSessionPhase, stopLocationUpdates]);

  const saveSession = async () => {
    if (!plan || !sessionStartRef.current) return;
    setSessionPhase("saving");
    try {
      await saveRecordedActivity(db, {
        planId: plan.id,
        workoutId: workout?.id ?? null,
        workoutType: sport === "WALK" ? "WALK" : "EASY",
        startTime: localIso(sessionStartRef.current),
        distanceKm: distanceRef.current / 1000,
        durationSeconds: Math.max(1, elapsedSeconds),
        elevationGain: elevationRef.current,
        route: routeRef.current,
      });
      refresh();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert(
        t("activitySaved"),
        `${t("activitySavedHelp")}\n${(distanceRef.current / 1000).toFixed(2)} ${t("kilometerShort")} · ${formatDuration(elapsedSeconds)}`,
        [{ text: t("ok"), onPress: resetSession }],
      );
    } catch (error: any) {
      setSessionPhase("paused");
      showAlert(t("recordingFailed"), error?.message ?? t("invalidData"));
    }
  };

  const discardSession = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    resetSession();
  };

  const confirmDiscard = () =>
    showAlert(t("discardActivityTitle"), t("discardActivityMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("discardActivity"),
        style: "destructive",
        onPress: discardSession,
      },
    ]);

  const confirmFinish = () =>
    showAlert(
      t("finishActivityTitle"),
      `${t("finishActivityMessage")}\n${(distanceMeters / 1000).toFixed(2)} ${t("kilometerShort")} · ${formatDuration(elapsedSeconds)}`,
      [
        {
          text: t("continueRecording"),
          style: "cancel",
          onPress: resumeSession,
        },
        {
          text: t("discardActivity"),
          style: "destructive",
          onPress: confirmDiscard,
        },
        { text: t("saveActivity"), onPress: saveSession },
      ],
    );

  const routeCoordinates = useMemo(
    () => route.map(({ latitude, longitude }) => ({ latitude, longitude })),
    [route],
  );
  const showRouteOverview = () => {
    if (routeCoordinates.length < 2) return;
    setMapMode("route");
    void Haptics.selectionAsync();
  };
  const orientNorthUp = () => {
    setMapMode("follow");
    setNorthUpRequest((value) => value + 1);
    void Haptics.selectionAsync();
  };
  const mapLocation = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }
    : null;
  const pace = formatPace(elapsedSeconds, distanceMeters);
  const gpsLabel =
    permission === Location.PermissionStatus.DENIED
      ? t("gpsPermissionRequired")
      : gpsAccuracy == null
        ? t("gpsWaiting")
        : gpsAccuracy <= 25
          ? t("gpsReady")
          : t("gpsWeak");
  const gpsColor =
    permission === Location.PermissionStatus.DENIED
      ? "#F04438"
      : gpsAccuracy != null && gpsAccuracy <= 25
        ? colors.accent
        : "#F79009";
  const phaseLabel =
    phase === "recording"
      ? t("recording")
      : phase === "paused"
        ? t("recordingPaused")
        : t("readyToRecord");
  const selectSport = (value: RecordSport) => {
    if (phase !== "ready" || sport === value) return;
    sportRef.current = value;
    setSport(value);
    void Haptics.selectionAsync();
  };

  const workoutTypeLabel = (type: WorkoutType) =>
    type === "EASY"
      ? t("easy")
      : type === "TEMPO"
        ? t("tempo")
        : type === "INTERVAL"
          ? t("interval")
          : type === "LONG_RUN"
            ? t("longRun")
            : type === "RECOVERY"
              ? t("recovery")
              : type === "WALK"
                ? t("walk")
                : t("rest");

  const workoutDescription = (current: Workout) => {
    const description = current.description?.trim();
    if (!description) return `${current.date} · ${plan?.name ?? ""}`;

    if (
      description === "Easy run: giữ nhịp thoải mái, có thể nói chuyện." ||
      description === "Easy run, giữ nhịp thoải mái" ||
      description === "Easy run"
    ) {
      return t("easyRunDescription");
    }
    if (
      description ===
        "Long run: ưu tiên hoàn thành cự ly, kiểm soát nhịp tim và tiếp nước." ||
      description === "Long run, ưu tiên hoàn thành cự ly" ||
      description === "Long run"
    ) {
      return t("longRunDescription");
    }
    if (
      description ===
        "Tempo: 1–2 km khởi động, phần giữa ở pace kiểm soát, sau đó thả lỏng." ||
      description === "2 km easy + 3 km tempo + 2 km easy"
    ) {
      return t("tempoRunDescription");
    }
    if (
      description ===
        "Interval: khởi động kỹ, chạy các đoạn nhanh ngắn xen kẽ hồi phục." ||
      description === "Khởi động 2 km, 4 x 400m, thả lỏng"
    ) {
      return t("intervalRunDescription");
    }
    if (
      description === "Recovery: chạy thật nhẹ, mục tiêu phục hồi." ||
      description === "Recovery run"
    ) {
      return t("recoveryRunDescription");
    }
    if (description === "GPS recorded activity") {
      return t("gpsWorkoutDescription");
    }
    if (description.startsWith("RACE DAY · mục tiêu ")) {
      return `${t("raceDayGoal")} ${description.slice("RACE DAY · mục tiêu ".length)}`;
    }
    return description;
  };

  return (
    <GlassBackground>
      <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
        <View style={s.header}>
          <View>
            <Text style={[s.eyebrow, { color: colors.accent }]}>
              {phaseLabel}
            </Text>
            <Text style={[s.title, { color: colors.textPrimary }]}>
              {t("recordActivity")}
            </Text>
          </View>
          <View
            style={[
              s.gpsBadge,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.bgCardBorder,
              },
            ]}
          >
            <View style={[s.gpsDot, { backgroundColor: gpsColor }]} />
            <Text style={[s.gpsText, { color: colors.textSecondary }]}>
              {gpsLabel}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          <ScrollView
            style={s.mapScroll}
            contentContainerStyle={s.mapContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
            scrollEnabled={!mapInteracting}
          >
          <View
            style={[
              s.map,
              { borderColor: colors.bgCardBorder },
            ]}
          >
            <RunMap
              current={mapLocation}
              route={routeCoordinates}
              isDark={isDark}
              accentColor={colors.accent}
              fitRoute={mapMode === "route"}
              followCurrent={mapMode === "follow"}
              northUpRequest={northUpRequest}
              interactive
              onInteractionChange={(active) => {
                setMapInteracting(active);
                if (active) setMapMode("free");
              }}
            />
            <View
              style={[
                s.sportSwitch,
                {
                  backgroundColor: isDark
                    ? "rgba(7,18,11,0.78)"
                    : "rgba(255,255,255,0.82)",
                },
              ]}
            >
              {(["RUN", "WALK"] as const).map((value) => {
                const active = sport === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={value === "RUN" ? t("run") : t("walk")}
                    accessibilityState={{ selected: active, disabled: phase !== "ready" }}
                    disabled={phase !== "ready"}
                    hitSlop={6}
                    onPress={() => selectSport(value)}
                    style={({ pressed }) => [
                      s.sport,
                      active && { backgroundColor: colors.accent },
                      pressed && phase === "ready" && { opacity: 0.72 },
                    ]}
                  >
                    {value === "RUN" ? (
                      <MaterialCommunityIcons
                        name="run-fast"
                        size={20}
                        color={active ? "#FFFFFF" : colors.textPrimary}
                      />
                    ) : (
                      <Ionicons
                        name="footsteps-outline"
                        size={18}
                        color={active ? "#FFFFFF" : colors.textPrimary}
                      />
                    )}
                    <Text
                      style={[
                        s.sportText,
                        { color: active ? "#FFFFFF" : colors.textPrimary },
                      ]}
                    >
                      {value === "RUN" ? t("run") : t("walk")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {gpsAccuracy != null && (
              <View
                style={[
                  s.accuracy,
                  {
                    backgroundColor: isDark
                      ? "rgba(7,18,11,0.74)"
                      : "rgba(255,255,255,0.82)",
                  },
                ]}
              >
                <Ionicons name="navigate" size={13} color={gpsColor} />
                <Text style={[s.accuracyText, { color: colors.textPrimary }]}>
                  ±{Math.round(gpsAccuracy)} {t("meterShort")}
                </Text>
              </View>
            )}
            <View style={s.mapControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("locateCurrentPosition")}
                disabled={locatingMap}
                hitSlop={7}
                onPress={locateOnMap}
                style={({ pressed }) => [
                  s.mapControl,
                  {
                    backgroundColor:
                      mapMode === "follow"
                        ? colors.accent
                        : isDark
                          ? "rgba(7,18,11,0.86)"
                          : "rgba(255,255,255,0.92)",
                    borderColor: colors.bgCardBorder,
                    opacity: pressed || locatingMap ? 0.68 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={locatingMap ? "hourglass-outline" : "locate"}
                  size={21}
                  color={
                    mapMode === "follow" ? "#FFFFFF" : colors.textPrimary
                  }
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("showFullRoute")}
                accessibilityState={{
                  disabled: routeCoordinates.length < 2,
                  selected: mapMode === "route",
                }}
                disabled={routeCoordinates.length < 2}
                hitSlop={7}
                onPress={showRouteOverview}
                style={({ pressed }) => [
                  s.mapControl,
                  {
                    backgroundColor:
                      mapMode === "route"
                        ? colors.accent
                        : isDark
                          ? "rgba(7,18,11,0.86)"
                          : "rgba(255,255,255,0.92)",
                    borderColor: colors.bgCardBorder,
                    opacity:
                      routeCoordinates.length < 2
                        ? 0.42
                        : pressed
                          ? 0.68
                          : 1,
                  },
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={
                    mapMode === "route" ? "#FFFFFF" : colors.textPrimary
                  }
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("northUp")}
                hitSlop={7}
                onPress={orientNorthUp}
                style={({ pressed }) => [
                  s.mapControl,
                  {
                    backgroundColor: isDark
                      ? "rgba(7,18,11,0.86)"
                      : "rgba(255,255,255,0.92)",
                    borderColor: colors.bgCardBorder,
                    opacity: pressed ? 0.68 : 1,
                  },
                ]}
              >
                <View style={s.compassGlyph}>
                  <Text style={[s.compassNorth, { color: colors.textPrimary }]}>
                    {t("northShort")}
                  </Text>
                  <Ionicons
                    name="navigate-outline"
                    size={17}
                    color={colors.textPrimary}
                  />
                </View>
              </Pressable>
            </View>
          </View>

          <GlassCard style={s.workoutCard}>
            <View
              style={[s.workoutIcon, { backgroundColor: colors.rowIconBg }]}
            >
              {sport === "WALK" ? (
                <Ionicons
                  name="footsteps-outline"
                  size={21}
                  color={colors.accent}
                />
              ) : (
                <MaterialCommunityIcons
                  name="run-fast"
                  size={24}
                  color={colors.accent}
                />
              )}
            </View>
            <View style={s.workoutCopy}>
              <Text style={[s.workoutLabel, { color: colors.textLabel }]}>
                {t("todayWorkout")}
              </Text>
              <Text style={[s.workoutTitle, { color: colors.textPrimary }]}>
                {workout
                  ? `${workoutTypeLabel(workout.type)} · ${workout.distanceKm.toFixed(1)} ${t("kilometerShort")}`
                  : t("unplannedActivity")}
              </Text>
              <Text
                style={[s.workoutHelp, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {workout
                  ? workoutDescription(workout)
                  : t("unplannedActivityHelp")}
              </Text>
            </View>
            {workout?.status === "COMPLETED" && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.accent}
              />
            )}
          </GlassCard>
          </ScrollView>

          <GlassCard style={s.statsCard}>
            <View style={s.statsRow}>
              <Metric
                value={(distanceMeters / 1000).toFixed(2)}
                unit={t("kilometerShort")}
                label={t("distance")}
                colors={colors}
              />
              <View
                style={[s.metricDivider, { backgroundColor: colors.divider }]}
              />
              <Metric
                value={formatDuration(elapsedSeconds)}
                label={t("elapsedTime")}
                colors={colors}
                compact
              />
              <View
                style={[s.metricDivider, { backgroundColor: colors.divider }]}
              />
              <Metric
                value={pace}
                unit={t("perKilometer")}
                label={t("averagePace")}
                colors={colors}
                compact
              />
            </View>
            {elevationGain > 0 && (
              <Text style={[s.elevation, { color: colors.textSecondary }]}>
                {t("elevationGainShort")} +{Math.round(elevationGain)} {t("meterShort")}
              </Text>
            )}

            <View style={s.controls}>
              {phase === "ready" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("startRecording")}
                  onPress={startSession}
                  style={({ pressed }) => [
                    s.startButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: pressed
                        ? 0.74
                        : plan && workout?.status !== "COMPLETED"
                          ? 1
                          : 0.5,
                    },
                  ]}
                >
                  <Ionicons name="play" size={25} color="#FFFFFF" />
                </Pressable>
              )}
              {phase === "recording" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("pauseRecording")}
                  onPress={() => pauseSession()}
                  style={({ pressed }) => [
                    s.pauseButton,
                    { borderColor: colors.accent, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Ionicons name="pause" size={25} color={colors.accent} />
                </Pressable>
              )}
              {phase === "paused" && (
                <View style={s.pausedControls}>
                  <ControlButton
                    icon="play"
                    label={t("resumeRecording")}
                    color={colors.accent}
                    onPress={resumeSession}
                  />
                  <ControlButton
                    icon="stop"
                    label={t("finishRecording")}
                    color="#F04438"
                    onPress={confirmFinish}
                  />
                </View>
              )}
              {phase === "saving" && (
                <View
                  style={[
                    s.savingButton,
                    { backgroundColor: colors.rowIconBg },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={25}
                    color={colors.accent}
                  />
                </View>
              )}
              <Text style={[s.controlLabel, { color: colors.textPrimary }]}>
                {phase === "ready"
                  ? plan
                    ? workout?.status === "COMPLETED"
                      ? t("todayWorkoutCompleted")
                      : t("startRecording")
                    : t("createPlanToRecord")
                  : phase === "recording"
                    ? t("pauseRecording")
                    : phase === "paused"
                      ? t("resumeOrFinish")
                      : t("pleaseWait")}
              </Text>
              {!plan && phase === "ready" && (
                <Pressable onPress={() => router.push("/create-plan")}>
                  <Text style={[s.createPlan, { color: colors.accent }]}>
                    {t("createPlan")}
                  </Text>
                </Pressable>
              )}
            </View>
          </GlassCard>
        </View>
      </SafeAreaView>
    </GlassBackground>
  );
}

function Metric({
  value,
  unit,
  label,
  colors,
  compact,
}: {
  value: string;
  unit?: string;
  label: string;
  colors: ReturnType<typeof useTheme>["colors"];
  compact?: boolean;
}) {
  return (
    <View style={s.metric}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          s.metricValue,
          compact && s.metricValueCompact,
          { color: colors.textPrimary },
        ]}
      >
        {value}
        {!!unit && (
          <Text style={[s.metricUnit, { color: colors.textSecondary }]}>
            {" "}
            {unit}
          </Text>
        )}
      </Text>
      <Text
        numberOfLines={1}
        style={[s.metricLabel, { color: colors.textLabel }]}
      >
        {label}
      </Text>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: "play" | "stop";
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <View style={s.controlItem}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          s.smallControl,
          { backgroundColor: color, opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <Ionicons name={icon} size={26} color="#FFFFFF" />
      </Pressable>
      <Text style={[s.smallControlLabel, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { marginTop: 2, fontSize: 30, fontWeight: "900", letterSpacing: -0.7 },
  gpsBadge: {
    maxWidth: "48%",
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { fontSize: 11, fontWeight: "800" },
  body: { flex: 1 },
  mapScroll: { flex: 1 },
  mapContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 2,
    gap: 12,
  },
  map: {
    flexGrow: 1,
    minHeight: 280,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#10231A",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  sportSwitch: {
    position: "absolute",
    left: 14,
    bottom: 16,
    padding: 4,
    borderRadius: 24,
    flexDirection: "row",
    gap: 3,
    zIndex: 20,
    elevation: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  sport: {
    minWidth: 78,
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  sportText: { fontSize: 12, fontWeight: "900" },
  accuracy: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingHorizontal: 9,
    minHeight: 31,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 10,
  },
  accuracyText: { fontSize: 11, fontWeight: "900" },
  mapControls: {
    position: "absolute",
    right: 14,
    bottom: 16,
    gap: 9,
    zIndex: 22,
    elevation: 22,
  },
  mapControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.17,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  compassGlyph: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  compassNorth: {
    marginBottom: -3,
    fontSize: 8,
    lineHeight: 9,
    fontWeight: "900",
  },
  workoutCard: {
    flexShrink: 0,
    minHeight: 86,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutCopy: { flex: 1 },
  workoutLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  workoutTitle: { marginTop: 3, fontSize: 16, fontWeight: "900" },
  workoutHelp: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  statsCard: {
    flexShrink: 0,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 96,
    paddingHorizontal: 14,
    paddingTop: 17,
    paddingBottom: 15,
  },
  statsRow: { flexDirection: "row", alignItems: "stretch" },
  metric: { flex: 1, alignItems: "center", paddingHorizontal: 3 },
  metricValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.7 },
  metricValueCompact: { fontSize: 22 },
  metricUnit: { fontSize: 11, fontWeight: "800" },
  metricLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  metricDivider: { width: 1, marginVertical: 4 },
  elevation: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
  },
  controls: { alignItems: "center", marginTop: 25 },
  startButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
    shadowColor: "#079455",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  pauseButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pausedControls: { flexDirection: "row", justifyContent: "center", gap: 42 },
  controlItem: { alignItems: "center", width: 94 },
  smallControl: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
  },
  smallControlLabel: { marginTop: 7, fontSize: 9, fontWeight: "900" },
  savingButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  controlLabel: {
    marginTop: 10,
    maxWidth: "90%",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "900",
  },
  createPlan: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});

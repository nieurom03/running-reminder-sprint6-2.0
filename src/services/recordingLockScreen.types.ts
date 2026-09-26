import type { RecordingSnapshot } from "@/services/recordingSession";

export type RecordingLiveActivityProps = {
  sportLabel: string;
  statusLabel: string;
  distanceLabel: string;
  paceLabel: string;
  timeLabel: string;
  distance: string;
  pace: string;
  timerBaseAtMs: number;
  pauseAtMs: number | null;
  isPaused: boolean;
  isWalk: boolean;
};

const formatPace = (seconds: number, distanceMeters: number) => {
  if (seconds <= 0 || distanceMeters < 10) return "--:-- /km";
  const pace = Math.round(seconds / (distanceMeters / 1000));
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")} /km`;
};

export const toLiveActivityProps = (
  snapshot: RecordingSnapshot,
): RecordingLiveActivityProps => {
  const isVietnamese = snapshot.language === "vi";
  const now = Date.now();
  return {
    sportLabel: snapshot.sport === "WALK"
      ? isVietnamese
        ? "Đi bộ"
        : "Walk"
      : isVietnamese
        ? "Chạy bộ"
        : "Run",
    statusLabel:
      snapshot.phase === "paused"
        ? isVietnamese
          ? "Đã tạm dừng"
          : "Paused"
        : isVietnamese
          ? "Đang ghi GPS"
          : "Recording GPS",
    distanceLabel: isVietnamese ? "CỰ LY" : "DISTANCE",
    paceLabel: "PACE",
    timeLabel: isVietnamese ? "THỜI GIAN" : "TIME",
    distance: `${(snapshot.distanceMeters / 1000).toFixed(2)} km`,
    pace: formatPace(snapshot.elapsedSeconds, snapshot.distanceMeters),
    timerBaseAtMs: now - snapshot.elapsedSeconds * 1000,
    pauseAtMs: snapshot.phase === "paused" ? now : null,
    isPaused: snapshot.phase === "paused",
    isWalk: snapshot.sport === "WALK",
  };
};

import RunningLiveActivity from "@/widgets/RunningLiveActivity";
import type { RecordingSnapshot } from "@/services/recordingSession";
import { toLiveActivityProps } from "@/services/recordingLockScreen.types";

export const startRecordingLockScreen = async (snapshot: RecordingSnapshot) => {
  try {
    const existing = RunningLiveActivity.getInstances();
    await Promise.all(existing.map((instance) => instance.end("immediate")));
    RunningLiveActivity.start(
      toLiveActivityProps(snapshot),
      "Runmio://start",
      new Date(Date.now() + 60_000),
    );
  } catch {
    // Live Activities can be disabled by the user; GPS recording still works.
  }
};

export const updateRecordingLockScreen = async (
  snapshot: RecordingSnapshot,
) => {
  try {
    const props = toLiveActivityProps(snapshot);
    const instances = RunningLiveActivity.getInstances();
    if (instances.length === 0) {
      RunningLiveActivity.start(
        props,
        "Runmio://start",
        new Date(Date.now() + 60_000),
      );
      return;
    }
    await Promise.all(
      instances.map((instance) =>
        instance.update(props, new Date(Date.now() + 60_000)),
      ),
    );
  } catch {
    // Do not interrupt a workout when ActivityKit rejects an update.
  }
};

export const endRecordingLockScreen = async (
  snapshot?: RecordingSnapshot | null,
) => {
  try {
    const props = snapshot ? toLiveActivityProps(snapshot) : undefined;
    await Promise.all(
      RunningLiveActivity.getInstances().map((instance) =>
        instance.end("immediate", props, new Date()),
      ),
    );
  } catch {
    // The activity may already have been dismissed by the system or the user.
  }
};

import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  monospacedDigit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import {
  createLiveActivity,
  type LiveActivityEnvironment,
} from "expo-widgets";

import type { RecordingLiveActivityProps } from "@/services/recordingLockScreen.types";

const RunningActivity = (
  props: RecordingLiveActivityProps,
  environment: LiveActivityEnvironment,
) => {
  "widget";

  // Widget functions run in an isolated JavaScript runtime. Keep values used
  // by the rendered activity inside this function so they are serialized with
  // the widget instead of becoming unresolved module-level references.
  const secondary = "#AAB4AF";
  const icon = props.isWalk ? "figure.walk" : "figure.run";
  const accent = environment.isLuminanceReduced ? "#FFFFFF" : "#22C77A";
  const timerEnd = new Date(props.timerBaseAtMs + 365 * 24 * 60 * 60 * 1000);
  const timer = (
    <Text
      timerInterval={{
        lower: new Date(props.timerBaseAtMs),
        upper: timerEnd,
      }}
      countsDown={false}
      pauseTime={props.pauseAtMs ? new Date(props.pauseAtMs) : undefined}
      modifiers={[
        font({ size: 22, weight: "bold", design: "rounded" }),
        monospacedDigit(),
      ]}
    />
  );

  return {
    banner: (
      <VStack spacing={12} modifiers={[padding({ all: 16 })]}>
        <HStack spacing={10}>
          <Image systemName={icon} size={24} color={accent} />
          <VStack alignment="leading" spacing={1}>
            <Text modifiers={[font({ size: 15, weight: "semibold" })]}>
              {props.sportLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: 12, weight: "medium" }),
                foregroundStyle(props.isPaused ? "#F5A623" : accent),
              ]}
            >
              {props.statusLabel}
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={1}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary)]}>
              {props.timeLabel}
            </Text>
            {timer}
          </VStack>
        </HStack>
        <HStack spacing={28}>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary)]}>
              {props.distanceLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: 20, weight: "bold", design: "rounded" }),
                monospacedDigit(),
              ]}
            >
              {props.distance}
            </Text>
          </VStack>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary)]}>
              {props.paceLabel}
            </Text>
            <Text
              modifiers={[
                font({ size: 20, weight: "bold", design: "rounded" }),
                monospacedDigit(),
              ]}
            >
              {props.pace}
            </Text>
          </VStack>
          <Spacer />
        </HStack>
      </VStack>
    ),
    compactLeading: <Image systemName={icon} size={17} color={accent} />,
    compactTrailing: (
      <Text modifiers={[font({ size: 13, weight: "semibold" }), monospacedDigit()]}>
        {props.distance}
      </Text>
    ),
    minimal: <Image systemName={icon} size={17} color={accent} />,
    expandedLeading: (
      <VStack spacing={3} modifiers={[padding({ all: 10 })]}>
        <Image systemName={icon} size={22} color={accent} />
        <Text modifiers={[font({ size: 11, weight: "medium" })]}>
          {props.sportLabel}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ all: 10 })]}>
        <Text modifiers={[font({ size: 10 }), foregroundStyle(secondary)]}>
          {props.timeLabel}
        </Text>
        {timer}
      </VStack>
    ),
    expandedBottom: (
      <HStack spacing={24} modifiers={[padding({ horizontal: 12, bottom: 10 })]}>
        <Text modifiers={[font({ size: 16, weight: "bold" }), monospacedDigit()]}>
          {props.distance}
        </Text>
        <Text modifiers={[font({ size: 16, weight: "bold" }), monospacedDigit()]}>
          {props.pace}
        </Text>
      </HStack>
    ),
  };
};

export default createLiveActivity<RecordingLiveActivityProps>(
  "RunningActivity",
  RunningActivity,
);

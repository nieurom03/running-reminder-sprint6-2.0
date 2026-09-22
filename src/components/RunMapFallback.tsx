import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import type { RunMapProps } from "@/components/RunMap.types";

const WIDTH = 400;
const HEIGHT = 250;
const PADDING = 42;

export function RunMapFallback({ route, isDark, accentColor }: RunMapProps) {
  const points = useMemo(() => {
    if (route.length < 2) return "";
    const latitudes = route.map((point) => point.latitude);
    const longitudes = route.map((point) => point.longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const latSpan = Math.max(maxLat - minLat, 0.0001);
    const lonSpan = Math.max(maxLon - minLon, 0.0001);
    return route
      .map((point) => {
        const x =
          PADDING +
          ((point.longitude - minLon) / lonSpan) * (WIDTH - PADDING * 2);
        const y =
          PADDING +
          (1 - (point.latitude - minLat) / latSpan) * (HEIGHT - PADDING * 2);
        return `${x},${y}`;
      })
      .join(" ");
  }, [route]);

  const street = isDark ? "rgba(255,255,255,0.10)" : "rgba(36,82,60,0.12)";

  return (
    <View style={[s.root, { backgroundColor: isDark ? "#14241A" : "#DFEEE6" }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Line
          x1="-30"
          y1="65"
          x2="430"
          y2="165"
          stroke={street}
          strokeWidth="18"
        />
        <Line
          x1="55"
          y1="-25"
          x2="185"
          y2="285"
          stroke={street}
          strokeWidth="12"
        />
        <Line
          x1="300"
          y1="-20"
          x2="230"
          y2="285"
          stroke={street}
          strokeWidth="9"
        />
        <Line
          x1="-20"
          y1="210"
          x2="430"
          y2="105"
          stroke={street}
          strokeWidth="7"
        />
        {points ? (
          <>
            <Polyline
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.86)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={points}
              fill="none"
              stroke={accentColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <Circle cx="200" cy="125" r="22" fill={`${accentColor}22`} />
            <Circle cx="200" cy="125" r="8" fill={accentColor} />
            <Circle cx="200" cy="125" r="3" fill="#FFFFFF" />
          </>
        )}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
});

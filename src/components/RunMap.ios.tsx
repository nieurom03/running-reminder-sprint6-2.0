import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Polyline } from "react-native-maps";

import type { RunMapProps } from "@/components/RunMap.types";

const FALLBACK = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export function RunMap({ current, route, isDark, accentColor }: RunMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (!current) return;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500,
    );
  }, [current?.latitude, current?.longitude]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={
        current
          ? { ...current, latitudeDelta: 0.006, longitudeDelta: 0.006 }
          : FALLBACK
      }
      mapType="mutedStandard"
      userInterfaceStyle={isDark ? "dark" : "light"}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      {route.length > 1 && (
        <Polyline
          coordinates={route}
          strokeColor={accentColor}
          strokeWidth={6}
          lineCap="round"
          lineJoin="round"
        />
      )}
    </MapView>
  );
}

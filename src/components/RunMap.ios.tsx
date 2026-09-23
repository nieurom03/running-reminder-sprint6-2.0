import { useCallback, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import type { RunMapProps } from "@/components/RunMap.types";

const FALLBACK = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

export function RunMap({
  current,
  route,
  isDark,
  accentColor,
  fitRoute = false,
  showsUserLocation = true,
  focusCoordinate = null,
  followCurrent = true,
  northUpRequest = 0,
  interactive = true,
  onInteractionChange,
}: RunMapProps) {
  const mapRef = useRef<MapView>(null);
  const handledNorthUpRequestRef = useRef(0);
  const currentLatitude = current?.latitude;
  const currentLongitude = current?.longitude;
  const focusLatitude = focusCoordinate?.latitude;
  const focusLongitude = focusCoordinate?.longitude;

  const focusMap = useCallback(
    (animated: boolean) => {
      if (focusLatitude != null && focusLongitude != null) {
        mapRef.current?.animateToRegion(
          {
            latitude: focusLatitude,
            longitude: focusLongitude,
            latitudeDelta: 0.006,
            longitudeDelta: 0.006,
          },
          animated ? 500 : 0,
        );
        return;
      }
      if (fitRoute && route.length > 1) {
        mapRef.current?.fitToCoordinates(route, {
          edgePadding: { top: 42, right: 42, bottom: 42, left: 42 },
          animated,
        });
        return;
      }
      if (!followCurrent) return;
      if (currentLatitude == null || currentLongitude == null) return;
      mapRef.current?.animateToRegion(
        {
          latitude: currentLatitude,
          longitude: currentLongitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        animated ? 500 : 0,
      );
    },
    [
      currentLatitude,
      currentLongitude,
      fitRoute,
      followCurrent,
      focusLatitude,
      focusLongitude,
      route,
    ],
  );

  useEffect(() => {
    focusMap(true);
  }, [focusMap]);

  useEffect(() => {
    if (
      northUpRequest <= 0 ||
      handledNorthUpRequestRef.current === northUpRequest
    ) {
      return;
    }
    handledNorthUpRequestRef.current = northUpRequest;
    void (async () => {
      const camera = await mapRef.current?.getCamera();
      if (!camera) return;
      mapRef.current?.animateCamera(
        { ...camera, heading: 0 },
        { duration: 320 },
      );
    })();
  }, [northUpRequest]);

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
      onMapReady={() => focusMap(false)}
      userInterfaceStyle={isDark ? "dark" : "light"}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={interactive}
      rotateEnabled={interactive}
      onTouchStart={() => onInteractionChange?.(true)}
      onTouchEnd={() => onInteractionChange?.(false)}
      onTouchCancel={() => onInteractionChange?.(false)}
    >
      {fitRoute && route.length > 0 && (
        <Marker coordinate={route[0]} pinColor={accentColor} />
      )}
      {fitRoute && route.length > 1 && (
        <Marker coordinate={route[route.length - 1]} pinColor="#F04438" />
      )}
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

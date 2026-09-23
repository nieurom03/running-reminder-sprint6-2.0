import Constants from "expo-constants";
import { useCallback, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type MapStyleElement,
} from "react-native-maps";

import { RunMapFallback } from "@/components/RunMapFallback";
import type { RunMapProps } from "@/components/RunMap.types";

const FALLBACK_REGION = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#17251D" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9DB1A5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#17251D" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#365244" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#17251D" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#20382A" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#193E2A" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2B4035" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#142018" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3D5D4B" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#243A2E" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#102B31" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6C979A" }],
  },
];

export function RunMap(props: RunMapProps) {
  const {
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
  } = props;
  const mapRef = useRef<MapView>(null);
  const handledNorthUpRequestRef = useRef(0);
  const currentLatitude = current?.latitude;
  const currentLongitude = current?.longitude;
  const focusLatitude = focusCoordinate?.latitude;
  const focusLongitude = focusCoordinate?.longitude;
  const googleMapsConfigured =
    Constants.expoConfig?.extra?.googleMapsAndroidConfigured === true;

  const focusMap = useCallback(
    (animated: boolean) => {
      if (!googleMapsConfigured) return;
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
      googleMapsConfigured,
      route,
    ],
  );

  useEffect(() => {
    focusMap(true);
  }, [focusMap]);

  useEffect(() => {
    if (
      !googleMapsConfigured ||
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
  }, [googleMapsConfigured, northUpRequest]);

  if (!googleMapsConfigured) {
    return <RunMapFallback {...props} />;
  }

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFill}
      initialRegion={
        current
          ? { ...current, latitudeDelta: 0.006, longitudeDelta: 0.006 }
          : FALLBACK_REGION
      }
      customMapStyle={isDark ? DARK_MAP_STYLE : []}
      onMapReady={() => focusMap(false)}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={interactive}
      rotateEnabled={interactive}
      zoomControlEnabled={false}
      onTouchStart={() => onInteractionChange?.(true)}
      onTouchEnd={() => onInteractionChange?.(false)}
      onTouchCancel={() => onInteractionChange?.(false)}
      toolbarEnabled={false}
      loadingEnabled
      loadingBackgroundColor={isDark ? "#17251D" : "#DFEEE6"}
      loadingIndicatorColor={accentColor}
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

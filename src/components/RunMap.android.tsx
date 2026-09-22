import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, {
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
  const { current, route, isDark, accentColor } = props;
  const mapRef = useRef<MapView>(null);
  const googleMapsConfigured =
    Constants.expoConfig?.extra?.googleMapsAndroidConfigured === true;

  useEffect(() => {
    if (!current || !googleMapsConfigured) return;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      },
      500,
    );
  }, [current?.latitude, current?.longitude, googleMapsConfigured]);

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
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
      loadingEnabled
      loadingBackgroundColor={isDark ? "#17251D" : "#DFEEE6"}
      loadingIndicatorColor={accentColor}
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

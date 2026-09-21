import React from "react";
import { FontAwesome6 } from "@expo/vector-icons";

type WalkerIconProps = {
  size?: number;
  color?: string;
};

/**
 * A rounded, upright walking silhouette. The wider arm swing and separated
 * stride keep it recognisable as walking (rather than running) at small sizes.
 */
export function WalkerIcon({
  size = 24,
  color = "#2DB526",
}: WalkerIconProps) {
  return <FontAwesome6 name="person-walking" size={size} color={color} />;
}

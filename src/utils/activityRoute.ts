import type { RunMapCoordinate } from "@/components/RunMap.types";

export function parseRecordedRoute(
  rawData: string | null | undefined,
): RunMapCoordinate[] {
  if (!rawData) return [];

  try {
    const parsed: unknown = JSON.parse(rawData);
    if (
      typeof parsed !== "object" ||
      parsed == null ||
      !("route" in parsed) ||
      !Array.isArray(parsed.route)
    ) {
      return [];
    }

    return parsed.route.flatMap((point): RunMapCoordinate[] => {
      if (typeof point !== "object" || point == null) return [];
      const latitude = Number("latitude" in point ? point.latitude : NaN);
      const longitude = Number("longitude" in point ? point.longitude : NaN);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return [];
      }
      return [{ latitude, longitude }];
    });
  } catch {
    return [];
  }
}

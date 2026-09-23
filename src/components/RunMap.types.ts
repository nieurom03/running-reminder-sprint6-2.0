export type RunMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type RunMapProps = {
  current: RunMapCoordinate | null;
  route: RunMapCoordinate[];
  isDark: boolean;
  accentColor: string;
  fitRoute?: boolean;
  showsUserLocation?: boolean;
  focusCoordinate?: RunMapCoordinate | null;
  followCurrent?: boolean;
  northUpRequest?: number;
  interactive?: boolean;
  onInteractionChange?: (active: boolean) => void;
};

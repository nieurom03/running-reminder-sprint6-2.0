export type RunMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type RunMapProps = {
  current: RunMapCoordinate | null;
  route: RunMapCoordinate[];
  isDark: boolean;
  accentColor: string;
};

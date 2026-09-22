const googleMapsAndroidApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(googleMapsAndroidApiKey
      ? [
          [
            "react-native-maps",
            { androidGoogleMapsApiKey: googleMapsAndroidApiKey },
          ],
        ]
      : []),
  ],
  extra: {
    ...(config.extra ?? {}),
    googleMapsAndroidConfigured: Boolean(googleMapsAndroidApiKey),
  },
});

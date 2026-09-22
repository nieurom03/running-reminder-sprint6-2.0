# Running Reminder Sprint 5.1 — clean install

Use Node 22.13+.

```bash
nvm use 22
rm -rf node_modules package-lock.json .expo ios
npm install
npx expo-doctor
```

Then regenerate the native iOS project so the new app name and native modules are applied:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/WorkoutTraining-*
npx expo prebuild --clean -p ios
npx expo run:ios --device
npx expo run:ios --configuration release
```

If you prefer Xcode:

```bash
open ios/RunningReminder.xcworkspace
```

Always open `RunningReminder.xcworkspace`, not `RunningReminder.xcodeproj`. The
workspace includes the CocoaPods targets; opening only the project can cause
errors such as `ExpoAsset/ExpoAsset.modulemap not found` when building for an
iPhone.

If the generated workspace name differs, list it with:

```bash
ls ios/*.xcworkspace
```

## Verify dependencies

```bash
npm ls react react-dom react-native react-native-reanimated react-native-worklets expo-device @react-native-community/datetimepicker
npx expo-doctor
```

## Language

Open **More / Thêm → Language / Ngôn ngữ** and choose Vietnamese or English. The selection is stored locally in SQLite.

## Android Google Maps

Google Maps authenticates the Android application with a Google Cloud API key;
it does not use the runner's Gmail account. In Google Cloud, enable **Maps SDK
for Android**, create a key, and restrict it to:

- Android package: `com.vovannieu.workouttraining`
- The SHA-1 fingerprints of every certificate used to sign the app (debug,
  release and Play App Signing as applicable)
- API restriction: **Maps SDK for Android**

Then copy `.env.example` to `.env`, set `GOOGLE_MAPS_ANDROID_API_KEY`, and
regenerate the Android native project so the key is written to the manifest:

```bash
cp .env.example .env
npx expo prebuild --clean -p android
npx expo run:android
```

If the key is absent, the Start screen intentionally uses the local schematic
map instead of showing a broken Google map. Google account sign-in is a
separate account feature and requires OAuth client IDs plus a backend session;
it is not required for map display.

### Sprint 5.8 clean rebuild

Because the icon asset changed, remove generated iOS assets before rebuilding:

```bash
rm -rf .expo ios
npx expo prebuild --clean -p ios
npx expo run:ios --device
```

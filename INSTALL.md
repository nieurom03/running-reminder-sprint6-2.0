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
rm -rf ~/Library/Developer/Xcode/DerivedData/RunPlan-*
rm -rf ~/Library/Developer/Xcode/DerivedData/RunningReminder-*
npx expo prebuild --clean -p ios
npx expo run:ios --device
```

If you prefer Xcode:

```bash
open ios/RunningReminder.xcworkspace
```

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

### Sprint 5.8 clean rebuild
Because the icon asset changed, remove generated iOS assets before rebuilding:
```bash
rm -rf .expo ios
npx expo prebuild --clean -p ios
npx expo run:ios --device
```

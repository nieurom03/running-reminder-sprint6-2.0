# Running Reminder — Sprint 5.1

React Native / Expo SDK 57 running-plan app, offline-first with SQLite.

## Sprint 5.1 changes

- App renamed to **Running Reminder**.
- Vietnamese / English runtime language switch, persisted in SQLite (`app_settings.language`).
- Native date picker for race date and workout date.
- Pace picker uses a dedicated MM:SS timer-style picker to support seconds (for example 7:30/km).
- Device name/model shown at the top-right of every main tab header.
- All app-owned `SafeAreaView` usage now comes from `react-native-safe-area-context`.
- Keeps Sprint 5 NaN/CoreGraphics protections.
- Keeps manual run entry, workout editing, auto-Missed, status colors, dashboard weekly km, splash and onboarding.

## Native dependencies added

- `expo-device ~57.0.1`
- `@react-native-community/datetimepicker 9.1.0`

Core versions are intentionally preserved from Sprint 5 / Expo SDK 57.

## iOS note about device name

On recent iOS versions, Apple may return a generic device name such as `iPhone` unless the app has the required entitlement. Running Reminder falls back to the human-friendly model name when possible.

## Bundle identifier

The bundle identifier remains:

`com.nieu.runplan`

This is intentional to avoid disrupting your current signing/provisioning setup. You can change it later before App Store release if needed.


## Sprint 5.2
- Dashboard hiển thị km đã chạy / km kế hoạch trong tuần và phần trăm hoàn thành.
- Goal Time dùng picker giờ/phút/giây theo dạng wheel giống Current Pace.
- App icon mới gồm 3 đường màu: Completed (xanh), Skipped (cam), Missed (đỏ).

## Sprint 5.6
- Uses the new Running Reminder app icon for app icon, splash screen, and onboarding.
- Fixes DateTimePicker 9.1 API migration: `onValueChange(event, selectedDate)` + `onDismiss`.
- Prevents the previous `selectedDate.getTime()` runtime error by validating the second callback argument before converting it.
- Version bumped to 0.5.6.

## Sprint 5.7
- Full bilingual cleanup for new Dashboard, Plan, reminder and workout-result text.
- Per-workout reminder presets: 1h, 2h, 6h, 12h, 1 day, 2 days, plus custom days before.
- Edit Workout uses compact PacePicker to prevent icon overflow in two-column layout.
- Plan management actions moved from Settings to Plan.
- Current Plan summary moved from Settings to the bottom of Dashboard.
- Keeps Sprint 5.6 DateField `onValueChange` fix and icon/splash/onboarding assets.
- Dashboard weekly ring now reflects actual percentage instead of a permanently full green ring.

## Sprint 5.8
- SQLite hotfix: removed parallel database reads in app startup/dashboard/workout detail and replaced manual BEGIN/COMMIT/ROLLBACK with `withTransactionAsync`.
- App icon/splash artwork background changed to transparent PNG.
- Dashboard weekly chart now shows `planned km / completed km` for every day; completed distance is green.

## Sprint 5.9

- App icon artwork scaled up and re-centered to reduce unused transparent space.
- Added manual iCloud Drive backup/restore for local SQLite data.
  - Settings -> Backup & Restore -> Back up to iCloud Drive.
  - In the iOS share sheet choose Save to Files -> iCloud Drive.
  - On a new iPhone install Running Reminder, open Settings -> Restore from iCloud Drive, and select the JSON backup file.
- Backup includes training plans, workouts, activities/results, and app settings.
- Restore is transactional and replaces current local data only after the selected backup is validated.

This is manual file backup through iCloud Drive, not continuous CloudKit synchronization. Continuous automatic multi-device sync would require an iCloud/CloudKit capability and a separate sync layer.

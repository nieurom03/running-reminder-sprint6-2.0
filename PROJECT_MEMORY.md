# Workout Training — Project Memory

> Cập nhật lần cuối: 2026-09-21. Đây là ghi nhớ làm việc lâu dài cho các phiên Codex sau. Hãy đọc file này trước khi sửa dự án, rồi kiểm tra lại mã nguồn liên quan vì code có thể đã thay đổi.

## 1. Mục tiêu sản phẩm

Workout Training là ứng dụng lập và theo dõi giáo án chạy bộ, ưu tiên iOS, hoạt động offline-first. Người dùng tạo giáo án theo cự ly race, ngày race, goal time, pace hiện tại và các ngày chạy; ứng dụng sinh workout, nhắc lịch, cho sửa từng buổi và nhập kết quả chạy thủ công.

Tính năng hiện có:

- Giáo án 5K, 10K, 21K và 42K được sinh tự động; người dùng chọn riêng ngày Long Run trong các ngày chạy.
- Dashboard tiến độ, km kế hoạch/thực tế theo tuần, workout tiếp theo.
- Tab Plan, Calendar, Settings; chi tiết/sửa workout và nhập/sửa kết quả.
- Trạng thái `PLANNED`, `COMPLETED`, `SKIPPED`, `MISSED`; workout quá hạn tự chuyển `MISSED` (trừ `REST`).
- Notification cục bộ theo toàn giáo án hoặc theo từng workout.
- Tiếng Việt/English và giao diện `light`/`dark`/`system`, lưu trong SQLite.
- Backup/restore thủ công qua iOS share sheet và Files/iCloud Drive. Backup mới dùng file `.rrbackup` mã hóa bằng mật khẩu; restore vẫn đọc được backup JSON cũ. Đây không phải CloudKit sync tự động.
- Settings có form Feedback dùng share sheet hệ thống, tự kèm phiên bản app và phiên bản hệ điều hành.
- Onboarding, icon/splash và phong cách UI liquid-glass/mint.

## 2. Stack và cấu hình

- Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript strict.
- Expo Router file-based routing; entry là `expo-router/entry`.
- Expo SQLite (`runplan.db`) là nguồn dữ liệu bền vững.
- Zustand chỉ giữ state UI toàn cục nhỏ: language, color scheme và `refreshKey`.
- Alias TypeScript: `@/*` trỏ tới `src/*`.
- App name: `Workout Training`; scheme nội bộ vẫn là `runningreminder` để giữ tương thích.
- Bundle ID/package hiện giữ nguyên: `com.vovannieu.runplan`.
- Scripts chính: `npm start`, `npm run ios`, `npm run android`, `npm run doctor`, `npm run typecheck`.
- Tài liệu cài đặt yêu cầu Node 22.13+ và khuyến nghị prebuild sạch khi native dependency/asset thay đổi.

## 3. Bản đồ mã nguồn

- `app/_layout.tsx`: bọc `SQLiteProvider` + `ThemeProvider`; migrate DB và đánh dấu workout quá hạn lúc khởi tạo.
- `app/index.tsx`: nạp settings (`onboarding_seen`, `language`, `color_scheme`), ẩn splash và điều hướng vào onboarding/tabs.
- `app/(tabs)/index.tsx`: Dashboard.
- `app/(tabs)/plan.tsx`: tổng quan và quản lý giáo án, reschedule reminder, xóa plan.
- `app/(tabs)/calendar.tsx`: lịch workout theo tháng.
- `app/(tabs)/settings.tsx`: ngôn ngữ, theme, thống kê, backup/restore, onboarding.
- `app/create-plan.tsx`: form tạo giáo án và schedule notifications.
- `app/workout/[id].tsx`: chi tiết, trạng thái và reminder riêng.
- `app/workout/edit/[id].tsx`: sửa/xóa một workout.
- `app/workout/result/[id].tsx`: tạo/sửa/xóa activity thủ công.
- `src/db/database.ts`: schema, migration cộng dồn và dữ liệu demo khi chưa có plan.
- `src/db/repository.ts`: toàn bộ truy vấn và transaction nghiệp vụ.
- `src/services/trainingGenerator.ts`: thuật toán sinh giáo án.
- `src/services/notifications.ts`: quyền và lịch local notification.
- `src/services/backup.ts`: export AES-256-GCM/PBKDF2 có mật khẩu, chọn file và import transactional; tương thích backup JSON cũ.
- `src/types/models.ts`: domain types.
- `src/i18n/index.ts`: dictionary VI/EN và `useI18n`.
- `src/context/ThemeContext.tsx`, `src/constants/theme.ts`: theme runtime.
- `src/components/Glass.tsx`, `WorkoutCard.tsx`: visual system và reusable card UI.
- `src/components/LiquidGlassModal.tsx`: khung popup kính mờ dùng chung và popup chọn một giá trị.
- `src/components/GlassAlert.tsx`: provider cảnh báo/xác nhận toàn app; thay cho `Alert.alert` để luôn bám theme trong app.
- `DateField.tsx`, `PacePicker.tsx`, `GoalTimePicker.tsx`, `DurationPicker.tsx`: các picker dùng chung `LiquidGlassModal`.

## 4. Dữ liệu và quy tắc nghiệp vụ

SQLite có bốn bảng được backup: `training_plans`, `workouts`, `activities`, `app_settings`.

- Active plan là plan có `id` lớn nhất; dự án chưa có cờ active riêng.
- `workouts.is_extra=1` đánh dấu buổi chạy phát sinh do người dùng thêm cho ngày hiện tại. Workout này không tham gia cấu trúc, progress, trạng thái tổng hoặc reminder của giáo án.
- `WorkoutType` hỗ trợ `WALK`. Người dùng chọn một workout từ Plan/Calendar, mở Edit và đổi riêng ngày đó sang Walk mà không tái tạo hoặc thay đổi các ngày còn lại. Kết quả thủ công của Walk lưu `sport_type='Walk'` và vẫn cộng vào tổng hoạt động tuần.
- Xóa plan cascade xóa workouts; xóa workout làm activity liên kết bị xóa theo schema hiện tại.
- Một kết quả manual được upsert theo `workout_id` + source `MANUAL`, đồng thời đặt workout thành `COMPLETED`.
- Xóa kết quả manual đưa workout về `PLANNED`.
- Weekly summary chạy từ thứ Hai đến Chủ nhật và cộng activity loại Run/TrailRun/VirtualRun hoặc chưa có `sport_type`.
- Weekly summary trên Dashboard được lọc theo active plan; activity của plan đã xóa được giữ làm lịch sử nhưng không được cộng vào vòng tiến độ của plan mới.
- Activity của workout phát sinh vẫn được cộng vào weekly summary của active plan; km kế hoạch và biểu đồ kế hoạch chỉ lấy workout có `is_extra=0`.
- Trong Weekly Activity, cự ly workout phát sinh được cộng vào mốc hiển thị của đúng ngày và có dấu `*`; dấu này không làm thay đổi tổng km kế hoạch hoặc progress giáo án.
- `training_plans.long_run_day` lưu ngày Long Run do người dùng chọn. Generator dùng ngày này; nếu dữ liệu cũ không hợp lệ thì mới fallback sang thứ Bảy hoặc ngày chạy cuối tuần.
- Generator có quality workout xen kẽ tempo/interval, recovery, cutback mỗi tuần thứ tư, taper hai tuần cuối, rồi thêm Race Day.
- Tạo plan chuyển thẳng sang tab Plan ngay khi transaction hoàn tất; không mở popup thành công lồng trong modal `create-plan`. Việc schedule notification chạy nền sau điều hướng và chỉ giữ 60 workout sắp tới để UI không bị chặn.
- `goalTimeMinutes` được khai báo là số phút nhưng UI có thể truyền số lẻ từ giây (`goalSec / 60`). Cần giữ độ chính xác khi chỉnh luồng này.
- Các giá trị số đọc từ DB được bảo vệ bằng helpers trong `src/utils/numbers.ts` để tránh NaN/CoreGraphics crash.

## 5. Quy ước kỹ thuật quan trọng

- Không chạy các thao tác `expo-sqlite` song song trên cùng connection. Sprint 5.8 đã sửa lỗi bằng truy vấn tuần tự và `db.withTransactionAsync`.
- Với thao tác nhiều bước hoặc restore, dùng `withTransactionAsync`; không tự ghép `BEGIN/COMMIT/ROLLBACK`.
- Giữ migration cộng dồn bằng `addColumnIfMissing`; không xóa dữ liệu người dùng khi nâng schema.
- UI đổi dữ liệu phải gọi `useAppStore(...refresh)` để các màn hình dựa vào `refreshKey` tải lại.
- Text mới phải có cả VI và EN. Hiện vẫn còn một số text inline theo `language`; ưu tiên đưa về dictionary khi chỉnh khu vực đó.
- Popup chọn dữ liệu, cảnh báo và xác nhận trong app phải dùng `LiquidGlassModal`, `GlassOptionModal` hoặc `useGlassAlert`; không quay lại `Alert.alert`/`ActionSheetIOS`, vì chúng có thể không khớp Light/Dark do người dùng chọn trong app.
- `GlassAlertProvider` phải nằm bên trong `ThemeProvider` ở `app/_layout.tsx`. Các luồng thật sự thuộc hệ thống như share sheet iOS vẫn để native.
- Date-only dùng dạng ISO `YYYY-MM-DD`; code thường tạo local date lúc 12:00 để tránh lệch ngày do timezone.
- `SafeAreaView` thuộc app phải import từ `react-native-safe-area-context`.
- Giữ phong cách giao diện hiện tại: nền mint, glass card, tab bar capsule tối, màu trạng thái xanh/cam/đỏ.
- Không thay bundle identifier nếu chưa được yêu cầu vì liên quan signing/provisioning.
- Thay native dependency, icon hoặc splash có thể cần `expo prebuild --clean -p ios` và rebuild iOS.
- Mã hóa backup dùng `randomblob` của SQLite đã được liên kết sẵn để tạo salt/nonce, PBKDF2-HMAC-SHA256 (310.000 vòng) để dẫn xuất khóa và AES-256-GCM để bảo mật/xác thực nội dung. Không lưu mật khẩu; mất mật khẩu thì không khôi phục được file. Không thêm native module chỉ để mã hóa vì development build cũ sẽ lỗi ngay khi tải Settings.
- Tên hiển thị của app là `Workout Training`; target/project iOS là `WorkoutTraining`, bundle identifier iOS và application ID Android là `com.vovannieu.workouttraining`. Định danh nội bộ của định dạng backup vẫn giữ nguyên để đọc được file backup cũ.
- Build bằng iOS 27 SDK bắt buộc dùng UIKit scene lifecycle. Giữ `expo-build-properties.ios.enableSceneSupport=true`, `AppDelegate` conform `ExpoReactNativeFactoryProvider`, không khởi tạo `UIWindow`/React Native trực tiếp trong `didFinishLaunching`, và giữ `UIApplicationSceneManifest` trỏ tới `EXExpoAppSceneDelegate`. Cần Expo SDK từ `57.0.23` trở lên cho cấu hình này.
- Feedback dùng `Share.share` cho nội dung text nhưng loại activity `SaveToFiles`/iCloud Drive trên iOS; lưu file chỉ thuộc luồng Backup. Popup Feedback chỉ đóng sau khi người dùng chọn một kênh chia sẻ.

## 6. Tình trạng kiểm tra ngày 2026-09-21

- Không tìm thấy `AGENTS.md` trong workspace.
- Workspace hiện là Git repository; luôn giữ nguyên các thay đổi chưa commit không thuộc tác vụ hiện tại.
- Settings đọc version từ `app.json`, không hard-code. Hiện `package.json` là `0.6.0` còn `app.json` là `0.6.2`; khi release nên gom version về một nguồn duy nhất.
- Popup Language/Appearance, date/pace/goal-time/duration và toàn bộ cảnh báo/xác nhận trong app đã dùng chung Liquid Glass, theo đúng Light/Dark do người dùng chọn.
- `npm run typecheck`, export bundle iOS và Android chạy thành công sau thay đổi popup. Đã kiểm tra trực quan Light/Dark trên Simulator iPhone 17 Pro Max, iOS 26.3.
- Bản Release đã build bằng iOS 27 SDK và khởi chạy thành công trên Simulator iPhone 18 Pro Max, iOS 27.0 sau khi chuyển sang scene lifecycle; không còn lỗi `UIScene life cycle is required`.
- `tsconfig.json` tạm dùng `ignoreDeprecations: "6.0"` cho alias dựa trên `baseUrl`; cần migrate cấu hình trước TypeScript 7.
- README chính có tiêu đề Sprint 5.1 nhưng chứa changelog đến 5.9; `README_SPRINT_6.md` mô tả UI 6.0.

## 7. Checklist trước khi bàn giao thay đổi

1. Đọc file này và các file trực tiếp liên quan.
2. Không làm mất dữ liệu/migration cũ; kiểm tra transaction và foreign keys.
3. Kiểm tra cả VI/EN, light/dark/system và iOS safe areas nếu có thay UI.
4. Chạy ít nhất `npm run typecheck`; nếu thay dependency/config thì thêm `npm run doctor`.
5. Với thay đổi UI, kiểm tra màn hình ở trạng thái có/không có plan, activity và các status.
6. Cập nhật file này nếu kiến trúc, schema, workflow hoặc rủi ro quan trọng thay đổi.

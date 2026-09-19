# Hướng dẫn tái sử dụng Liquid Glass iOS 26 — Tab Bar, View và Card

## 1. Mục tiêu

Tab bar hiện tại không tự vẽ hiệu ứng kính bằng `View` và animation JavaScript trên iOS. Thay vào đó, ứng dụng dùng `NativeTabs` của Expo Router để UIKit tạo `UITabBarController` thật.

Trên thiết bị chạy iOS 26, hệ thống sẽ tự xử lý:

- Liquid Glass và khúc xạ nội dung phía sau.
- Bubble co giãn, phản hồi khi nhấn và chuyển tab.
- Spring, haptic và các thiết lập Accessibility của hệ thống.
- Safe Area, kích thước và bố cục phù hợp từng thiết bị.

Android và web vẫn sử dụng `Tabs` kết hợp `BlurView` làm fallback.

Từ mục 13 trở đi, tài liệu mô tả thêm hệ thống `GlassBackground`, `GlassCard` và View bán trong suốt đang dùng cho nội dung ứng dụng.

> Không thể tái tạo chính xác vật liệu Liquid Glass của Apple chỉ bằng `BlurView`, opacity và Reanimated. Nếu cần hiệu ứng giống iOS 26 nhất, phải sử dụng tab bar native và chạy trên iOS 26.

## 2. Kiến trúc

```text
TabLayout
├── iOS
│   └── NativeTabs
│       └── UITabBarController / Liquid Glass của UIKit
│
└── Android / Web
    └── Tabs
        ├── BlurView
        ├── lớp màu trong suốt
        └── active highlight fallback
```

File đang áp dụng trong dự án:

```text
app/(tabs)/_layout.tsx
```

## 3. Phiên bản đã kiểm chứng

```json
{
  "expo": "~57.0.20",
  "expo-router": "~57.0.19",
  "react-native": "0.86.3",
  "react-native-screens": "~4.26.0",
  "expo-blur": "~57.0.3"
}
```

Môi trường native:

- Xcode 26 trở lên.
- Thiết bị hoặc Simulator chạy iOS 26 để thấy đầy đủ Liquid Glass.
- Node.js 22 được khuyến nghị cho Expo SDK 57.
- Không bật `UIDesignRequiresCompatibility` trong `Info.plist`.

Trong `app.json`, cho phép giao diện tự đổi theo theme:

```json
{
  "expo": {
    "userInterfaceStyle": "automatic",
    "plugins": ["expo-router"]
  }
}
```

## 4. Theme contract

Ví dụ bên dưới giả định dự án có hook trả về:

```ts
const { colors, isDark } = useTheme();
```

Trong đó:

```ts
type ThemeValue = {
  isDark: boolean;
  colors: {
    accent: string;
    bgRoot: string;
    bgCard: string;
    bgCardBorder: string;
    bgOrb1: string;
    bgOrb2: string;
    bgOrb3: string;
    rowIconBg: string;
    rowIcon: string;
    divider: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textLabel: string;
  };
};
```

Dự án hiện tại sử dụng màu chủ đạo:

```ts
accent: "#2DB526";
```

## 5. Cấu hình iOS NativeTabs

Phần quan trọng nhất:

```tsx
import { NativeTabs } from "expo-router/unstable-native-tabs";

function IOSLiquidGlassTabs() {
  const { colors, isDark } = useTheme();

  const inactiveColor = isDark
    ? "rgba(255,255,255,0.72)"
    : "rgba(16,35,26,0.58)";

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{
        default: inactiveColor,
        selected: colors.accent,
      }}
      labelStyle={{
        default: { color: inactiveColor },
        selected: { color: colors.accent },
      }}
      backgroundColor={
        isDark
          ? "rgba(5,13,9,0.18)"
          : "rgba(255,255,255,0.12)"
      }
      blurEffect={
        isDark
          ? "systemUltraThinMaterialDark"
          : "systemUltraThinMaterialLight"
      }
      minimizeBehavior="never"
      sidebarAdaptable={false}
      unstable_nativeProps={{
        colorScheme: isDark ? "dark" : "light",
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{
            default: "rectangle.grid.1x2",
            selected: "rectangle.grid.1x2.fill",
          }}
        />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Icon
          sf={{ default: "dumbbell", selected: "dumbbell.fill" }}
        />
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

Có thể thay label tĩnh bằng hệ thống đa ngôn ngữ:

```tsx
<NativeTabs.Trigger.Label>
  {t("dashboard")}
</NativeTabs.Trigger.Label>
```

Tên trong `NativeTabs.Trigger` phải khớp chính xác với tên route:

```text
app/(tabs)/index.tsx      → name="index"
app/(tabs)/plan.tsx       → name="plan"
app/(tabs)/calendar.tsx   → name="calendar"
app/(tabs)/settings.tsx   → name="settings"
```

Không dùng `name="setting"` nếu file thực tế là `settings.tsx`.

## 6. Ý nghĩa các thuộc tính

| Thuộc tính | Vai trò |
|---|---|
| `tintColor` | Màu icon, label và glow của selection bubble trên iOS 26. |
| `iconColor` | Khóa màu icon active/inactive theo theme ứng dụng. |
| `labelStyle` | Khóa màu label active/inactive theo theme ứng dụng. |
| `backgroundColor` | Lớp tint rất mỏng; alpha thấp để vẫn nhìn thấy nền. |
| `blurEffect` | Dùng vật liệu `UltraThin` để tab bar trong hơn. |
| `minimizeBehavior="never"` | Giữ tab bar luôn hiển thị và không tự thu nhỏ khi cuộn. |
| `sidebarAdaptable={false}` | Không tự chuyển thành sidebar trên iPad. |
| `unstable_nativeProps.colorScheme` | Khóa UIKit theo light/dark mode của ứng dụng. |

## 7. Vì sao phải khóa colorScheme

Nếu chỉ đổi màu giao diện React Native nhưng không truyền theme xuống native, mỗi tab UIKit mới được focus có thể kế thừa `userInterfaceStyle` khác nhau. Biểu hiện thường gặp:

```text
Dark mode đang đúng
→ chọn tab khác
→ tab bar chuyển sang xám hoặc vật liệu light
```

Cách xử lý:

```tsx
unstable_nativeProps={{
  colorScheme: isDark ? "dark" : "light",
}}
```

Đồng thời khai báo `backgroundColor`, `blurEffect`, `iconColor` và `labelStyle` ở cấp `NativeTabs`, không khai báo khác nhau trong từng tab.

## 8. Thông số trong suốt hiện tại

| Mode | Blur | Tint |
|---|---|---|
| Light | `systemUltraThinMaterialLight` | `rgba(255,255,255,0.12)` |
| Dark | `systemUltraThinMaterialDark` | `rgba(5,13,9,0.18)` |

Muốn tab bar trong hơn:

- Giảm alpha xuống khoảng `0.08–0.10` cho light.
- Giảm alpha xuống khoảng `0.12–0.15` cho dark.

Muốn tab bar dễ đọc hơn trên nền phức tạp:

- Tăng alpha từng bước nhỏ `0.02`.
- Không nên vượt quá khoảng `0.30`, vì tab bar sẽ giống một nền màu đặc thay vì kính.
- Không dùng `opacity` cho toàn bộ `NativeTabs`; làm vậy có thể phá cách UIKit kết hợp vật liệu kính.

## 9. SF Symbols

Native iOS nên dùng SF Symbols để kích thước, weight và transition do hệ thống quản lý:

```tsx
<NativeTabs.Trigger.Icon
  sf={{ default: "gearshape", selected: "gearshape.fill" }}
/>
```

Một số icon phù hợp:

| Chức năng | Default | Selected |
|---|---|---|
| Dashboard | `rectangle.grid.1x2` | `rectangle.grid.1x2.fill` |
| Workout plan | `dumbbell` | `dumbbell.fill` |
| Calendar | `calendar` | `calendar` |
| Settings | `gearshape` | `gearshape.fill` |

Không cần tự scale icon khi nhấn. UIKit thực hiện chuyển động native và giữ đúng Accessibility.

## 10. Chọn navigator theo platform

```tsx
import { Platform } from "react-native";

export default function TabLayout() {
  return Platform.OS === "ios"
    ? <IOSLiquidGlassTabs />
    : <FallbackTabs />;
}
```

Trên iOS thấp hơn 26, `NativeTabs` tự dùng giao diện tab bar UIKit phù hợp phiên bản hệ điều hành. Full Liquid Glass chỉ có trên iOS 26.

## 11. Fallback Android và web

Fallback nên dùng `BlurView` với tint động, không hard-code dark:

```tsx
<BlurView
  intensity={42}
  tint={isDark ? "dark" : "light"}
  style={StyleSheet.absoluteFill}
>
  <View
    style={[
      StyleSheet.absoluteFill,
      {
        backgroundColor: isDark
          ? "rgba(5,13,9,0.18)"
          : "rgba(255,255,255,0.12)",
      },
    ]}
  />
</BlurView>
```

Màu tab fallback:

```ts
tabBarActiveTintColor: colors.accent;
tabBarInactiveTintColor: isDark
  ? "rgba(255,255,255,0.72)"
  : "rgba(16,35,26,0.58)";
```

Fallback chỉ mô phỏng phần blur và tint; nó không có shader Liquid Glass giống UIKit.

## 12. Quy trình áp dụng sang dự án khác

1. Cài và cấu hình Expo Router.
2. Đảm bảo các route tab nằm trong cùng một route group, ví dụ `app/(tabs)`.
3. Cài phiên bản `react-native-screens` tương thích Expo SDK.
4. Tạo hook theme cung cấp `isDark` và `colors.accent`.
5. Thêm `IOSLiquidGlassTabs` vào `app/(tabs)/_layout.tsx`.
6. Dùng SF Symbols cho nhánh iOS.
7. Giữ `backgroundColor` có alpha thấp và dùng `systemUltraThinMaterial`.
8. Truyền `unstable_nativeProps.colorScheme` để theme không đổi màu khi chuyển tab.
9. Build lại native development client; không chỉ reload web.

Không nên tự chỉnh trực tiếp `node_modules` hoặc mã UIKit bên trong `react-native-screens`.

## 13. Phạm vi Liquid Glass cho View và Card

Khác với tab bar iOS 26, React Native chưa cung cấp trực tiếp vật liệu Liquid Glass UIKit cho một `View` tùy ý. Card trong dự án dùng cách mô phỏng ổn định bằng bốn thành phần:

1. Nền có chiều sâu (`bgRoot` và các orb màu mềm).
2. `BlurView` dùng system material trên iOS/web.
3. Một lớp tint có alpha thấp nằm trên blur.
4. Border sáng mỏng và shadow nằm ngoài vùng clip.

Kết quả gần với ngôn ngữ thị giác Liquid Glass, tự đổi theo Light/Dark và có thể dùng lại trên Android bằng lớp màu bán trong suốt. Đây là cách mô phỏng cho nội dung React Native; không nên tuyên bố nó có shader khúc xạ giống hoàn toàn UIKit trên iOS 26.

Kiến trúc đang dùng:

```text
GlassBackground
├── màu nền bgRoot
├── orb 1 / orb 2 / orb 3
└── content
    └── GlassCard (shadow + border ngoài)
        ├── materialClip (overflow: hidden)
        │   ├── BlurView hoặc Android fallback
        │   └── surface tint bán trong suốt
        └── nội dung card
```

## 14. Token màu View/Card

Không hard-code `#FFFFFF` hoặc một màu tối đặc lên card. Dùng token alpha để nền phía sau vẫn hiện qua kính.

| Token | Light | Dark | Mục đích |
|---|---|---|---|
| `bgRoot` | `#EEF7F2` | `#0D1A12` | Nền gốc của màn hình. |
| `bgCard` | `rgba(255,255,255,0.34)` | `rgba(18,32,24,0.42)` | Fallback cho View/Card không blur và Android. |
| `bgCardBorder` | `rgba(255,255,255,0.62)` | `rgba(255,255,255,0.16)` | Viền kính 1 px. |
| `bgOrb1` | `rgba(184,238,208,0.62)` | `rgba(20,80,45,0.50)` | Orb trang trí thứ nhất. |
| `bgOrb2` | `rgba(218,246,230,0.72)` | `rgba(15,60,35,0.55)` | Orb trang trí thứ hai. |
| `bgOrb3` | `rgba(203,239,222,0.58)` | `rgba(18,70,40,0.45)` | Orb trang trí thứ ba. |
| `rowIconBg` | `rgba(218,247,231,0.30)` | `rgba(34,84,58,0.32)` | View con, icon bubble, chip hoặc trạng thái chọn. |
| `rowIcon` | `#315B47` | `#72D9A3` | Màu icon phụ nằm trên surface kính. |
| `divider` | `rgba(82,112,97,0.16)` | `rgba(255,255,255,0.10)` | Đường phân cách bên trong card. |
| `textPrimary` | `#10231A` | `#FFFFFF` | Tiêu đề và nội dung chính. |
| `textSecondary` | `#557066` | `#8AAF98` | Nội dung phụ. |
| `textMuted` | `#60776C` | `#789B87` | Metadata hoặc nội dung ít quan trọng. |
| `textLabel` | `#557066` | `#7AAE90` | Label của form và section nhỏ. |
| `accent` | `#2DB526` | `#2DB526` | Trạng thái active và CTA chính. |

Ví dụ khai báo tối thiểu:

```ts
export const lightColors = {
  bgRoot: '#EEF7F2',
  bgCard: 'rgba(255,255,255,0.34)',
  bgCardBorder: 'rgba(255,255,255,0.62)',
  bgOrb1: 'rgba(184,238,208,0.62)',
  bgOrb2: 'rgba(218,246,230,0.72)',
  bgOrb3: 'rgba(203,239,222,0.58)',
  rowIconBg: 'rgba(218,247,231,0.30)',
  rowIcon: '#315B47',
  divider: 'rgba(82,112,97,0.16)',
  textPrimary: '#10231A',
  textSecondary: '#557066',
  textMuted: '#60776C',
  textLabel: '#557066',
  accent: '#2DB526',
} as const;

export const darkColors = {
  bgRoot: '#0D1A12',
  bgCard: 'rgba(18,32,24,0.42)',
  bgCardBorder: 'rgba(255,255,255,0.16)',
  bgOrb1: 'rgba(20,80,45,0.50)',
  bgOrb2: 'rgba(15,60,35,0.55)',
  bgOrb3: 'rgba(18,70,40,0.45)',
  rowIconBg: 'rgba(34,84,58,0.32)',
  rowIcon: '#72D9A3',
  divider: 'rgba(255,255,255,0.10)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8AAF98',
  textMuted: '#789B87',
  textLabel: '#7AAE90',
  accent: '#2DB526',
} as const;
```

## 15. GlassBackground tái sử dụng

Nền phẳng sẽ làm hiệu ứng kính khó nhận ra. Các orb tạo biến thiên màu để người dùng nhìn thấy blur và độ trong suốt khi cuộn nội dung.

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function GlassBackground({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.bgRoot }]}>
      <View
        pointerEvents="none"
        style={[styles.orb, styles.orb1, { backgroundColor: colors.bgOrb1 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.orb, styles.orb2, { backgroundColor: colors.bgOrb2 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.orb, styles.orb3, { backgroundColor: colors.bgOrb3 }]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.88 },
  orb1: { width: 330, height: 330, right: -130, top: -90 },
  orb2: { width: 260, height: 260, left: -120, top: 260 },
  orb3: { width: 360, height: 360, right: -180, bottom: 70 },
});
```

Luôn đặt `pointerEvents="none"` cho các lớp trang trí để chúng không chặn thao tác trên nội dung.

`GlassBackground` không tự xử lý Safe Area. Dự án khác phải đặt `SafeAreaView` hoặc content inset phù hợp bên trong. Ba orb dùng kích thước cố định, vì vậy cần kiểm tra lại trên iPad, landscape và màn hình rất nhỏ.

## 16. GlassCard hoàn chỉnh

Cài dependency đúng theo Expo SDK của dự án:

```bash
npx expo install expo-blur
```

Component tái sử dụng:

```tsx
import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, isDark } = useTheme();
  const flattenedStyle = StyleSheet.flatten(style);

  const radius =
    typeof flattenedStyle?.borderRadius === 'number'
      ? flattenedStyle.borderRadius
      : 28;

  const surfaceColor = (flattenedStyle?.backgroundColor ??
    (Platform.OS === 'android'
      ? colors.bgCard
      : isDark
        ? 'rgba(7,18,11,0.12)'
        : 'rgba(255,255,255,0.10)')) as ColorValue;

  const borderColor = (flattenedStyle?.borderColor ??
    colors.bgCardBorder) as ColorValue;

  return (
    <View
      style={[
        styles.card,
        style,
        { backgroundColor: 'transparent', borderColor },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.materialClip,
          { borderRadius: radius },
        ]}
      >
        {Platform.OS === 'android' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: surfaceColor },
            ]}
          />
        ) : (
          <BlurView
            intensity={isDark ? 30 : 24}
            tint={
              isDark
                ? 'systemUltraThinMaterialDark'
                : 'systemUltraThinMaterialLight'
            }
            style={StyleSheet.absoluteFill}
          />
        )}

        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: surfaceColor },
          ]}
        />
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 28,
    shadowColor: '#315B47',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  materialClip: { overflow: 'hidden' },
});
```

### Vì sao phải tách hai lớp

- `styles.card` giữ border và shadow, không dùng `overflow: 'hidden'`.
- `materialClip` nằm tuyệt đối bên trong, có cùng `borderRadius` và dùng `overflow: 'hidden'` để blur không tràn góc.
- Nếu đặt `overflow: 'hidden'` lên lớp có shadow, shadow iOS sẽ bị cắt.
- Nếu không clip lớp material, `BlurView` sẽ tạo các góc vuông bên ngoài card.
- `pointerEvents="none"` bảo đảm lớp blur/tint không chặn `Pressable`, input hoặc gesture bên trong.

## 17. Cách dùng GlassCard

```tsx
export function DashboardSection() {
  const { colors } = useTheme();

  return (
    <GlassBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <GlassCard style={styles.heroCard}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Weekly progress
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            18.5 / 30 km
          </Text>
        </GlassCard>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120 },
  heroCard: { padding: 20, borderRadius: 30 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { marginTop: 6, fontSize: 15, fontWeight: '600' },
});
```

`GlassCard` đọc `borderRadius`, `backgroundColor` và `borderColor` từ prop `style`:

```tsx
<GlassCard
  style={{
    padding: 18,
    borderRadius: 24,
    backgroundColor: isDark
      ? 'rgba(12,28,18,0.22)'
      : 'rgba(255,255,255,0.16)',
  }}
>
  {children}
</GlassCard>
```

`backgroundColor` truyền vào không được vẽ thành nền đặc của View ngoài. Component lấy màu đó làm tint bên trong rồi khóa View ngoài về `transparent`, nhờ vậy shadow và blur vẫn hoạt động đúng.

Giới hạn API hiện tại:

- `GlassCard` không có padding hoặc margin mặc định; từng màn hình phải truyền qua `style`.
- Chỉ `borderRadius` dạng một số được đồng bộ vào lớp clip. Các giá trị radius riêng cho từng góc cần mở rộng component trước khi dùng.
- Component chỉ nhận `children` và `style`, không nhận `onPress` hoặc accessibility props. Với card tương tác toàn vùng, dùng một `Pressable` bọc ngoài hoặc dùng surface `Pressable` không blur như mục 18.
- `backgroundColor` tùy chỉnh nên là RGBA alpha thấp. Màu đặc sẽ che gần như toàn bộ blur.
- `paddingBottom: 120` trong ví dụ dành cho màn hình có tab bar; điều chỉnh hoặc bỏ ở màn hình thông thường.

## 18. View bán trong suốt bên trong Card

Không phải View nào cũng cần một `BlurView` riêng. Với icon bubble, chip, input, button phụ hoặc item lặp lại dày đặc, dùng `rowIconBg` để giữ chiều sâu mà không tạo quá nhiều blur layer:

```tsx
function MetricRow() {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.rowIconBg,
          borderColor: colors.bgCardBorder,
        },
      ]}
    >
      <View
        style={[styles.iconBubble, { backgroundColor: colors.rowIconBg }]}
      >
        <Ionicons name="walk" size={20} color={colors.accent} />
      </View>
      <Text style={[styles.rowText, { color: colors.textPrimary }]}>
        8.0 km
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: 16, fontWeight: '800' },
});
```

Quy tắc phân lớp:

| Thành phần | Nên dùng |
|---|---|
| Card lớn, hero, panel chính | `GlassCard` có `BlurView`. |
| Row/chip/icon/input nằm trong card | `View` + `rowIconBg`. |
| Form card đơn giản cần chạy nhẹ | `View` + `bgCard` + `bgCardBorder`. |
| Modal | Material/modal token riêng; không dùng nền card đặc. |

Không đặt nhiều `BlurView` lồng nhau trong cùng một card. Nhiều lớp blur thường làm nền đục, giảm FPS và không còn cảm giác kính trong.

## 19. Thông số và cách tinh chỉnh

Thông số hiện tại:

| Thuộc tính | Light | Dark |
|---|---:|---:|
| Blur intensity | `24` | `30` |
| System material | `systemUltraThinMaterialLight` | `systemUltraThinMaterialDark` |
| Tint mặc định trên iOS/web | `rgba(255,255,255,0.10)` | `rgba(7,18,11,0.12)` |
| Border | alpha `0.62` | alpha `0.16` |
| Shadow opacity | `0.12` | `0.12` |
| Shadow radius | `24` | `24` |
| Shadow offset Y | `10` | `10` |
| Border radius mặc định | `28` | `28` |

Khi tinh chỉnh:

- Card còn đục: giảm alpha tint từng bước `0.02`; không giảm `opacity` của toàn card.
- Chữ khó đọc: tăng alpha tint hoặc làm nền phía sau bớt tương phản; không đổi text sang màu xám quá nhạt.
- Dark mode bị xám: dùng đúng `systemUltraThinMaterialDark` và token dark, không dùng `tint="light"` cố định.
- Muốn card nổi hơn: tăng shadow nhẹ trước khi tăng alpha nền.
- Muốn nền trực quan hơn: điều chỉnh vị trí/alpha orb thay vì làm card trắng hơn.

## 20. Hiệu năng và fallback platform

- iOS/web: dùng `BlurView` và lớp tint alpha thấp.
- Android: implementation hiện tại dùng `View` bán trong suốt làm fallback để tránh phụ thuộc blur không ổn định giữa thiết bị.
- Snippet hiện tại vẽ `surfaceColor` ở fallback Android và thêm một overlay chung để giữ đúng giao diện dự án. Nếu dự án đích chỉ muốn một lớp tint, bỏ một lớp rồi kiểm tra lại độ tương phản thay vì copy máy móc.
- Với list dài, chỉ blur panel/card cấp cao; item con dùng `rowIconBg`.
- Dùng `StyleSheet.absoluteFill` cho blur/tint để không tham gia đo layout.
- Không animation `intensity` liên tục trong lúc scroll; nếu cần animation, ưu tiên transform/opacity của lớp tint.
- Test trên máy thật vì Simulator và web có thể hiển thị blur khác GPU thiết bị.

## 21. Lỗi thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Card vẫn trắng đục | Dùng `#fff`, alpha quá cao hoặc còn style nền cũ. | Dùng `GlassCard`; bỏ màu đặc và giảm tint. |
| Không thấy hiệu ứng kính | Nền phía sau quá phẳng. | Dùng `GlassBackground`, gradient hoặc orb nhẹ. |
| Blur bị vuông ở góc | Lớp material không được clip. | Thêm View con có cùng radius và `overflow: 'hidden'`. |
| Shadow bị đứt | `overflow: 'hidden'` đặt trên View ngoài. | Chuyển clip vào `materialClip`; giữ shadow ở View ngoài. |
| Không bấm được nội dung | Lớp blur/tint bắt touch. | Thêm `pointerEvents="none"`. |
| Dark mode chuyển xám | Hard-code tint/màu Light. | Lấy `isDark` và toàn bộ token từ theme runtime. |
| Android không blur | Fallback đang dùng màu bán trong suốt. | Đây là hành vi chủ ý; chỉ bật Android blur sau khi test thiết bị mục tiêu. |
| List cuộn giật | Có quá nhiều `BlurView` hoặc blur lồng nhau. | Blur card cấp cao, item con dùng màu alpha. |

## 22. Checklist mang sang dự án khác

1. Cài `expo-blur` đúng phiên bản Expo SDK.
2. Tạo `ThemeProvider` cung cấp `colors` và `isDark`.
3. Copy đủ token Light/Dark trong mục 14.
4. Copy `GlassBackground` và `GlassCard`, giữ nguyên cấu trúc shadow ngoài/clip trong.
5. Bọc mỗi màn hình bằng `GlassBackground`.
6. Đổi panel chính sang `GlassCard`; không giữ nền `#fff` cũ.
7. Đổi View con sang `rowIconBg` hoặc `bgCard` tùy mật độ nội dung.
8. Gán text bằng `textPrimary`/`textSecondary`, không hard-code màu chỉ hợp Light mode.
9. Kiểm tra Light, Dark, màn hình có nền phức tạp và list dài.
10. Kiểm tra iOS thật hoặc Simulator iOS 26; Android phải được đánh giá như fallback riêng.

Implementation tham chiếu của dự án này:

```text
src/components/Glass.tsx
src/constants/theme.ts
src/context/ThemeContext.tsx
```

## 23. Lệnh chạy và kiểm tra

```bash
nvm use 22
npm install
npm run typecheck
npm run start:clean
```

Build iOS:

```bash
npx expo run:ios
```

Build trên điện thoại thật:

```bash
npx expo run:ios --device
```

Kiểm tra bundle iOS mà không cần mở Simulator:

```bash
npx expo export --platform ios --clear
```

## 24. Checklist kiểm thử

- Light mode giữ nguyên màu khi chuyển qua tất cả tab.
- Dark mode không chuyển thành gray/light khi đổi tab.
- Icon và label active luôn dùng màu chủ đạo.
- Nhấn, giữ và rê qua các tab trên thiết bị iOS 26.
- Nội dung phía sau vẫn thấy được qua tab bar.
- Kiểm tra nền sáng, nền tối và nền có nhiều chi tiết.
- Kiểm tra Reduce Transparency, Increase Contrast và Reduce Motion.
- Kiểm tra VoiceOver và kích thước chữ lớn.
- Kiểm tra iPhone có Home Indicator và iPad.
- Kiểm tra khi bàn phím mở.
- Card vẫn nhìn thấy biến thiên nền/orb qua surface ở cả Light và Dark.
- Border bo tròn liên tục, blur không tràn góc và shadow không bị cắt.
- Pressable/input trong card vẫn nhận touch vì lớp material dùng `pointerEvents="none"`.
- Android fallback đủ tương phản dù không dùng blur native.
- List dài không giật do lồng quá nhiều `BlurView`.

## 25. Lỗi Tab Bar thường gặp

### Tab bar chuyển xám khi đổi tab

Nguyên nhân thường là native tab mới đang kế thừa theme hệ thống thay vì theme ứng dụng.

Kiểm tra:

```tsx
unstable_nativeProps={{ colorScheme: isDark ? "dark" : "light" }}
```

### Tab bar quá đục

- Giảm alpha của `backgroundColor`.
- Dùng `systemUltraThinMaterialLight/Dark`.
- Không đặt thêm View màu đặc phía trên native tab bar.

### Không thấy Liquid Glass

- Xác nhận thiết bị đang chạy iOS 26.
- Build bằng Xcode 26 trở lên.
- Không bật `UIDesignRequiresCompatibility`.
- Sử dụng development build/native build thay vì chỉ xem trên web.
- Xác nhận nhánh iOS thực sự render `NativeTabs`, không phải `Tabs` fallback.

### Cảnh báo route

Nếu có lỗi dạng:

```text
No route named "setting" exists
```

hãy kiểm tra tên route. Với file `settings.tsx`, tên đúng là:

```tsx
<NativeTabs.Trigger name="settings" />
```

### Metro vẫn hiển thị giao diện cũ

```bash
npm run start:clean
```

Nếu thay đổi native dependency hoặc development client quá cũ, build lại bằng `npx expo run:ios --device`.

## 26. Giới hạn cần biết

- `expo-router/unstable-native-tabs` vẫn là API có nhãn `unstable`; cần đọc migration notes khi nâng Expo SDK.
- Spring, bubble geometry và shader của iOS 26 do UIKit điều khiển, không có API công khai để đặt chính xác từng hằng số.
- Nếu tự thay thế bằng tab bar JavaScript để điều chỉnh từng frame, ứng dụng sẽ mất vật liệu Liquid Glass native và khó đạt độ chính xác tương đương hệ thống.
- Trên Android/web, `BlurView` chỉ là fallback về thị giác.

## 27. Nguyên tắc quan trọng

```text
iOS 26:
NativeTabs + UIKit mặc định
        ↓
Liquid Glass thật

Android / Web:
Tabs + BlurView + tint động
        ↓
Fallback gần giống
```

Ưu tiên để hệ thống vẽ kính, animation và tương tác. Chỉ tùy chỉnh màu thương hiệu, độ trong suốt và light/dark mode ở cấp navigator.

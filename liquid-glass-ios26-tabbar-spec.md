# Đặc tả Tab Bar Liquid Glass kiểu iOS 26

## 1. Mục tiêu

Tài liệu này mô tả chi tiết cách hoạt động của Tab Bar trong video tham chiếu để có thể tái tạo trong project riêng với cảm giác gần iOS 26 nhất có thể.

Lưu ý:

- Có thể mô tả rất sát các hành vi quan sát được từ video.
- Các tham số nội bộ thực tế của Apple như shader, optical kernel hoặc spring constants chính xác không thể suy ra tuyệt đối chỉ từ video.
- Mục tiêu ở đây là tái tạo hành vi, hình học, chuyển động và hierarchy thị giác gần như 1:1.

---

## 2. Thông tin video tham chiếu

Video có:

```text
Resolution: 512 × 1112
FPS:        30
Duration:   ~14.97 giây
```

Tab bar là dạng floating capsule nằm phía trên safe area.

---

## 3. Cấu trúc tổng thể

Tab bar có dạng:

```text
┌──────────────────────────────────────────────┐
│                                              │
│   ▣        🚀        ◆        ◇        ⌕      │
│ Hôm nay   Trò chơi  Ứng dụng  Arcade   Tìm kiếm │
│                                              │
└──────────────────────────────────────────────┘
```

Trong frame 512 × 1112, vị trí xấp xỉ:

```text
x          ≈ 24 px
right      ≈ 24 px
width      ≈ 464 px

y          ≈ 1016 px
height     ≈ 70 px
bottom     ≈ 26 px

cornerRadius ≈ 35 px
```

Công thức:

```text
barWidth  = screenWidth - 48
barHeight = 70
barRadius = barHeight / 2
```

Đây là floating tab bar, không phải bottom navigation opaque gắn sát đáy màn hình.

---

## 4. Các tab và cách chia slot

Có 5 tab:

```text
1. Hôm nay
2. Trò chơi
3. Ứng dụng
4. Arcade
5. Tìm kiếm
```

Tâm các tab xấp xỉ:

```text
Tab 1: x ≈ 77
Tab 2: x ≈ 166
Tab 3: x ≈ 256
Tab 4: x ≈ 345
Tab 5: x ≈ 434
```

Khoảng cách giữa tâm:

```text
≈ 89–90 px
```

Với width 464:

```text
slotWidth = 464 / 5
          ≈ 92.8 px
```

Toàn bộ slot là touch target, không chỉ icon.

---

## 5. Kiến trúc rendering

Tab bar thực tế nên được hiểu thành hai lớp kính khác nhau:

```text
Outer Glass Capsule
│
├── Tab
├── Tab
├── Active Liquid Lens
├── Tab
└── Tab
```

Rendering order:

```text
Background content
        ↓
Outer backdrop blur
        ↓
Outer glass tint
        ↓
Active liquid lens
        ↓
Icons + labels
        ↓
Specular / highlight
```

Điểm quan trọng:

> Active tab không phải là mỗi tab tự có background riêng.

Phải có một liquid lens duy nhất dùng chung cho toàn bộ tab bar.

---

## 6. Outer Glass Capsule

Outer capsule gồm:

```text
dark translucent tint
+
background blur
+
saturation
+
inner edge
+
subtle highlight
```

Không nên dùng:

```css
background: rgba(30,30,30,0.8);
```

vì sẽ quá opaque.

Gợi ý:

```css
background: rgba(28,28,30,.55);

backdrop-filter:
  blur(25px)
  saturate(150%);
```

Nội dung phía sau phải vẫn nhìn thấy được qua lớp kính.

---

## 7. Active Liquid Lens

Active tab có một liquid lens nằm phía sau icon và label.

Kích thước xấp xỉ:

```text
width  ≈ 88–100 px
height ≈ 60–66 px
radius ≈ 30–33 px
```

Khoảng hở so với outer capsule:

```text
top    ≈ 2–5 px
bottom ≈ 2–5 px
```

Shape:

```text
      ____________
    /              \
   |      ◆         |
   |    Ứng dụng     |
    \______________/
```

Lens không nên dùng border trắng rõ.

Nó nên được tạo bởi:

```text
soft refraction
+
inner highlight
+
dark edge
+
light bleed
```

---

## 8. Active và inactive state

Inactive:

```text
icon  → white / light gray
label → white / light gray
```

Active:

```text
icon  → system blue
label → system blue
```

Màu gần với:

```text
#0A84FF
```

hoặc iOS dynamic system blue.

Active icon có prominence cao hơn nhưng rất nhẹ:

```text
scale ≈ 1.02–1.05
```

Không nên scale mạnh như Material Design.

---

## 9. Label luôn hiển thị

Tất cả các tab trong video đều có label.

Không phải:

```text
inactive → icon only
active   → icon + label
```

Mà là:

```text
inactive:
icon
label

active:
icon blue
label blue
+
liquid lens phía sau
```

Đây là điểm bắt buộc nếu muốn giống video.

---

## 10. Nguyên tắc quan trọng nhất: chỉ có một lens duy nhất

Sai:

```jsx
<Tab>
  {active && <Bubble />}
</Tab>
```

Cách này dẫn tới:

```text
bubble cũ disappear
bubble mới appear
```

Đúng:

```text
TabBar
│
├── ONE ActiveLens
│
├── Item1
├── Item2
├── Item3
├── Item4
└── Item5
```

ActiveLens luôn tồn tại và di chuyển giữa các tab.

---

## 11. Chuyển tab không phải fade

Khi chuyển:

```text
Arcade
→
Ứng dụng
```

Không làm:

```text
old bubble opacity 0
new bubble opacity 1
```

Và cũng không chỉ:

```text
translateX()
```

đơn thuần.

Animation phải là morphing.

---

## 12. Tổng thời gian animation

Quan sát video:

```text
main movement ≈ 250–350 ms
```

Phần settling kéo dài thêm rất nhẹ.

Nên cảm nhận giống spring, không phải linear timing.

---

## 13. Phase 1 — Release old state

Khoảng:

```text
0–60 ms
```

Lens bắt đầu rời tab cũ.

Từ:

```text
   ○
```

sang:

```text
   ◯━━
```

theo hướng tab mới.

Đồng thời:

```text
old icon blue → bắt đầu giảm blue
new icon white → bắt đầu nhận blue
```

---

## 14. Phase 2 — Stretch

Khoảng:

```text
60–140 ms
```

Lens widen theo hướng di chuyển.

Ví dụ:

```text
before

          ╭───────╮
          │Arcade │
          ╰───────╯
```

giữa transition:

```text
      ╭──────────────╮
      │              │
      ╰──────────────╯
```

rồi về:

```text
      ╭────────╮
      │Ứng dụng│
      ╰────────╯
```

Điểm tạo cảm giác Liquid Glass nằm ở phase này.

---

## 15. Hai cạnh di chuyển khác tốc độ

Đây là kỹ thuật cực kỳ quan trọng.

Không animate toàn bubble như một rectangle rigid.

Phải animate:

```text
leftEdge
rightEdge
```

riêng.

Nếu đi sang phải:

```text
front edge  = right edge → chạy nhanh hơn
rear edge   = left edge  → chạy chậm hơn
```

Ví dụ:

```text
T0
|------|

T1
   |----------|

T2
       |---------|

T3
          |------|
```

Nếu đi sang trái thì đảo ngược.

Hiệu ứng thu được:

```text
stretch
→
drag
→
compress
```

---

## 16. Overshoot

Lens không dừng cứng tại destination.

Nó có:

```text
move
→
overshoot nhẹ
→
return
```

Biên độ:

```text
≈ 2–4 px
```

hoặc:

```text
≈ 2–4% distance
```

Không nên overshoot quá mạnh.

---

## 17. Spring profile đề xuất

Điểm bắt đầu tốt:

```text
stiffness: 340
damping:   29
mass:      0.78
```

React Native Reanimated:

```javascript
withSpring(target, {
  stiffness: 340,
  damping: 29,
  mass: 0.78
})
```

Không nên dùng duy nhất:

```javascript
withTiming(target, { duration: 300 })
```

cho toàn bộ bubble.

---

## 18. Icon animation

Icon có spring riêng, không hoàn toàn đồng bộ với bubble.

Tab mới:

```text
0.96
↓
1.04
↓
1.00
```

Thời gian:

```text
≈ 200–300 ms
```

Tab cũ:

```text
1
↓
0.97
↓
1
```

rất nhẹ.

---

## 19. Color transition

Color transition xảy ra trong lúc lens đang di chuyển.

New item:

```javascript
newColor = interpolate(
  progress,
  [0, 0.45, 1],
  [white, blue, blue]
)
```

Old item:

```javascript
oldColor = interpolate(
  progress,
  [0, 0.55, 1],
  [blue, white, white]
)
```

Như vậy có một giai đoạn ngắn mà state màu overlap, giúp transition tự nhiên.

---

## 20. Bubble nằm dưới icon và label

Layer order:

```text
TAB BAR
│
├── Outer glass
├── Liquid lens
├── Icon
├── Label
└── Highlight / reflection
```

Bubble không được render phía trên text/icon.

---

## 21. Content chạy phía sau tab bar

Tab bar là persistent floating overlay.

Không có bottom opaque area.

Layout nên:

```text
ScrollView
│
├── Content
├── Content
├── Content
└── Content tiếp tục chạy xuống dưới
```

Tab bar:

```text
absolute / fixed overlay
```

Nội dung scroll phía sau và vẫn nhìn thấy qua blur.

---

## 22. Safe Area

Không hardcode bottom.

Native:

```text
bottom = max(safeAreaBottom, 12)
```

React Native:

```javascript
bottom: Math.max(insets.bottom, 12)
```

---

## 23. Optical behavior

Outer glass cần:

```text
Blur       ≈ 20–30 px
Saturation ≈ 130–160%
Dark tint  ≈ 55–70%
```

Ví dụ:

```css
background: rgba(28,28,30,.55);

backdrop-filter:
  blur(25px)
  saturate(150%);
```

---

## 24. Outer border

Không dùng:

```css
border: 1px solid #fff;
```

Nên dùng:

```css
border: 1px solid rgba(255,255,255,.12);

box-shadow:
  inset 0 1px 0 rgba(255,255,255,.18),
  inset 0 -1px 0 rgba(0,0,0,.18);
```

Top edge sáng hơn, bottom edge tối hơn.

---

## 25. Active lens sáng hơn bằng optics, không phải fill

Active lens không nên chỉ là background sáng.

Nó nổi lên bằng:

```text
clearer material
+
refraction mạnh hơn
+
edge highlight rõ hơn
+
inner light
```

Không nên:

```text
background-color: white;
```

---

## 26. Geometry đề xuất

Normalize theo screen width `W`:

```text
barWidth  = W - 48
barHeight = 70
barX      = 24
barRadius = 35
```

5 tab:

```text
slotWidth = barWidth / 5
```

Lens:

```text
lensWidth  ≈ slotWidth + 4~8
lensHeight ≈ 62~66
lensRadius = lensHeight / 2
```

Với W = 512:

```text
barWidth  = 464
slotWidth = 92.8

lensWidth  ≈ 96
lensHeight ≈ 64
radius     ≈ 32
```

---

## 27. Icon và label geometry

Xấp xỉ:

```text
icon size        ≈ 23–27 px
icon-label gap   ≈ 2–4 px
label size       ≈ 11–12 px
icon top         ≈ 10–12 px
```

Container:

```text
vertical
center aligned
```

---

## 28. Touch target

Mặc dù icon chỉ khoảng 24px, toàn slot phải clickable.

Ví dụ:

```text
slot touch target ≈ 90 × 70 px
```

Không chỉ bắt touch trên icon.

---

## 29. State machine

Nên dùng:

```text
IDLE
 ↓ tap
PRESSING
 ↓
MORPHING
 ↓
SETTLING
 ↓
IDLE
```

Không nên chỉ:

```text
activeIndex = newIndex
```

---

## 30. Touch sequence

Khi user tap:

```text
touchDown
│
├─ icon scale 1 → .96
├─ highlight tăng nhẹ
│
touchUp
│
├─ set destination
├─ icon .96 → 1.04 → 1
├─ active lens stretch
├─ active lens translate
├─ old icon blue → white
├─ new icon white → blue
├─ content switch
│
lens arrival
│
├─ overshoot
├─ compress
│
└─ settle
```

---

## 31. Khi chuyển xa nhiều tab

Ví dụ:

```text
Tab 1 → Tab 5
```

Không nên kéo lens thành một thanh dài nối toàn bộ tab bar.

Giới hạn:

```text
maxScaleX ≈ 1.25–1.40
```

Lens:

```text
stretch vừa phải
+
translate nhanh
```

không nối vật lý toàn quãng đường.

---

## 32. Tab bar phải persistent

Tab bar không nên remount khi đổi page.

Architecture:

```text
App
│
├── PageContainer
└── LiquidTabBar
```

Tab bar luôn tồn tại.

---

## 33. React Native / Expo architecture

Đề xuất:

```text
LiquidTabBar
│
├── BlurView
├── GlassOverlay
├── AnimatedLiquidLens
└── TabItems
     ├── TabItem
     ├── TabItem
     ├── TabItem
     ├── TabItem
     └── TabItem
```

Shared values:

```text
activeIndex

leftEdge
rightEdge

pressedIndex

iconScale[]
iconColor[]
```

---

## 34. Không nên chỉ animate translateX

Bản đơn giản:

```javascript
const x = useSharedValue(0);
```

rồi:

```javascript
x.value = withSpring(targetX);
```

vẫn chưa đủ.

Bản giống video hơn cần:

```text
leftEdge
rightEdge
```

---

## 35. Animate hai cạnh riêng

Bubble:

```javascript
width = rightEdge - leftEdge
```

Position:

```javascript
translateX = leftEdge
```

Nếu đi sang phải:

```text
rightEdge → stiffness cao hơn
leftEdge  → stiffness thấp hơn
```

Ví dụ:

```text
rightEdge stiffness = 420
leftEdge  stiffness = 300
```

Nếu đi sang trái thì đảo lại.

---

## 36. Pseudocode

```javascript
function selectTab(newIndex) {

  if (newIndex === activeIndex) {
    return;
  }

  const oldIndex = activeIndex;

  pressedScale[newIndex] = spring(0.96);

  if (newIndex > oldIndex) {

    rightEdge.spring(
      targetRight,
      stiffness = 420
    );

    leftEdge.spring(
      targetLeft,
      stiffness = 300
    );

  } else {

    leftEdge.spring(
      targetLeft,
      stiffness = 420
    );

    rightEdge.spring(
      targetRight,
      stiffness = 300
    );
  }

  iconColor[oldIndex] = white;
  iconColor[newIndex] = blue;

  iconScale[newIndex]:
      0.96
      → 1.04
      → 1.00;

  activeIndex = newIndex;
}
```

---

## 37. Những lỗi làm mất chất iOS 26

Tránh:

```text
❌ active background là rectangle
❌ bubble fade in/fade out
❌ bubble chỉ translateX
❌ timing linear
❌ icon scale quá mạnh
❌ blur quá cao
❌ border trắng rõ
❌ shadow đen nặng
❌ tab bar opaque
❌ content dừng trước tab bar
❌ mỗi tab có bubble riêng
❌ tab bar remount khi đổi screen
```

---

## 38. Công thức cuối cùng

Tab bar trong video hoạt động theo mô hình:

```text
Persistent Floating Glass Capsule
                +
        One Shared Liquid Lens
                +
         Equal Tab Slots
                +
       Active Blue Icon/Text
                +
    Directional Edge Animation
                +
          Spring Morphing
                +
         Optical Refraction
                +
Content Continuously Passing Behind
```

Điểm cốt lõi:

> Không animate “tab”.

Hãy animate một khối vật liệu kính duy nhất di chuyển và biến dạng giữa các tab.

Đây là yếu tố tạo cảm giác như một giọt kính lỏng trượt giữa các control thay vì một navigation bar có selection background thông thường.

---

## 39. Kiến trúc nên chọn cho project thực tế

Nếu mục tiêu là clone cảm giác trong video gần nhất có thể, kiến trúc nên là:

```text
persistent BlurView
+
one shared lens
+
left/right edge independent animation
+
spring-driven icon state
+
content behind glass
```

Đây là phần quan trọng nhất để đạt cảm giác Liquid Glass gần iOS 26.

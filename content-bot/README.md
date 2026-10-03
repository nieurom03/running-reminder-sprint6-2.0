# Runmio Content Bot

Bot local tạo nội dung **1 bài/ngày** về chạy bộ và gắn trực tiếp với các tính năng hiện có của Runmio: Dashboard, Plan, Create/Edit Plan, Calendar, GPS Workout, Workout Pace, Edit Result, Reminder và iCloud Backup.

## Mục tiêu

- Mỗi ngày có một chủ đề khác nhau: tiến độ, easy run, long run, pace, interval, phục hồi, thói quen, kỹ thuật, lợi ích chạy bộ...
- Mỗi bài có một hành động nhỏ để người đọc tiến bộ ngay trong ngày.
- Mỗi bài có CTA tự nhiên dẫn về một tính năng thực tế trong Runmio.
- Sinh sẵn caption tiếng Việt, hashtag và ý tưởng hình/video.
- Chạy hoàn toàn local, không cần backend và không cần API trả phí.

## Cách dùng

Tạo bài cho ngày hiện tại:

```bash
npm run content:today
```

Tạo bài cho một ngày cụ thể:

```bash
node content-bot/runmio-content-bot.mjs today --start 2026-10-01
```

Tạo kế hoạch 30 ngày:

```bash
npm run content:plan
```

Hoặc tùy chỉnh số ngày và ngày bắt đầu:

```bash
node content-bot/runmio-content-bot.mjs plan --days 30 --start 2026-10-01
```

## Output

File được lưu tại `content-bot/output/`.

- `YYYY-MM-DD.md`: bài hoàn chỉnh để đọc/copy đăng.
- `YYYY-MM-DD.json`: dữ liệu có cấu trúc của bài trong ngày.
- `plan-START-to-END.md`: bảng kế hoạch nội dung.
- `plan-START-to-END.json`: dữ liệu 30 ngày để nối với AI, workflow hoặc hệ thống đăng bài tự động.

Mỗi record JSON có:

```json
{
  "date": "2026-10-01",
  "theme": "Theo dõi tiến độ",
  "title": "Bạn chỉ cần tốt hơn chính mình của tuần trước",
  "feature": "Dashboard",
  "hook": "...",
  "action": "...",
  "caption": "...",
  "visualIdea": "...",
  "hashtags": ["#Runmio", "#ChayBo"]
}
```

## Gợi ý lịch tự động mỗi ngày

Trên macOS có thể dùng `launchd` hoặc cron để chạy lệnh sau vào buổi sáng:

```bash
cd /Users/macbook/Documents/Working/React/running-reminder-sprint6-2.0 && npm run content:today
```

Bot hiện chịu trách nhiệm **lên kế hoạch và sinh nội dung**. File JSON đã được thiết kế để bước sau có thể nối thêm AI rewrite theo từng nền tảng và API đăng Facebook/Instagram/TikTok khi cần.

import type { TranslationKey } from "@/i18n";

type Translate = (key: TranslationKey) => string;

const generatedDescriptionKeys: Record<string, TranslationKey> = {
  "Easy run: giữ nhịp thoải mái, có thể nói chuyện.": "easyRunDescription",
  "Easy run, giữ nhịp thoải mái": "easyRunDescription",
  "Easy run": "easyRunDescription",
  "Easy run: Keep a comfortable, conversational effort.": "easyRunDescription",
  "Long run: ưu tiên hoàn thành cự ly, kiểm soát nhịp tim và tiếp nước.":
    "longRunDescription",
  "Long run, ưu tiên hoàn thành cự ly": "longRunDescription",
  "Long run": "longRunDescription",
  "Long run: Prioritize completing the distance, manage your heart rate, and stay hydrated.":
    "longRunDescription",
  "Tempo: 1–2 km khởi động, phần giữa ở pace kiểm soát, sau đó thả lỏng.":
    "tempoRunDescription",
  "2 km easy + 3 km tempo + 2 km easy": "tempoRunDescription",
  "Tempo: Warm up for 1–2 km, run the middle section at a controlled pace, then cool down.":
    "tempoRunDescription",
  "Interval: khởi động kỹ, chạy các đoạn nhanh ngắn xen kẽ hồi phục.":
    "intervalRunDescription",
  "Khởi động 2 km, 4 x 400m, thả lỏng": "intervalRunDescription",
  "Interval: Warm up thoroughly, then alternate short fast efforts with recovery.":
    "intervalRunDescription",
  "Recovery: chạy thật nhẹ, mục tiêu phục hồi.": "recoveryRunDescription",
  "Recovery run": "recoveryRunDescription",
  "Recovery: Run very easy and focus on recovery.": "recoveryRunDescription",
  "GPS recorded activity": "gpsWorkoutDescription",
};

const raceDayPrefixes = ["RACE DAY · mục tiêu ", "RACE DAY · target "];

export function localizeWorkoutDescription(
  description: string | null | undefined,
  t: Translate,
) {
  const normalized = description?.trim();
  if (!normalized) return null;

  const key = generatedDescriptionKeys[normalized];
  if (key) return t(key);

  const prefix = raceDayPrefixes.find((value) => normalized.startsWith(value));
  if (prefix) {
    return `${t("raceDayGoal")} ${normalized.slice(prefix.length)}`;
  }

  return normalized;
}

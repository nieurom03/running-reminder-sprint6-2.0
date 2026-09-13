import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { setSetting } from "@/db/repository";
import { useI18n } from "@/i18n";
const icons = [
  "calendar-outline",
  "create-outline",
  "stats-chart-outline",
] as const;
export default function Onboarding() {
  const db = useSQLiteContext();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const titles = [
    t("onboarding1Title"),
    t("onboarding2Title"),
    t("onboarding3Title"),
  ];
  const texts = [
    t("onboarding1Text"),
    t("onboarding2Text"),
    t("onboarding3Text"),
  ];
  const finish = async () => {
    await setSetting(db, "onboarding_seen", "1");
    router.replace("/(tabs)");
  };
  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={s.root}>
      <View style={s.content}>
        {/* <Image
          source={require("../assets/images/icon.png")}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.brand}>RUNNING REMINDER</Text> */}
        <View style={s.hero}>
          <Image
            source={require("../assets/images/icon.png")}
            style={s.heroLogo}
            resizeMode="contain"
          />
          <View style={s.heroBadge}>
            <Ionicons name={icons[step]} size={20} color="#111827" />
          </View>
        </View>
        <Text style={s.title}>{titles[step]}</Text>
        <Text style={s.text}>{texts[step]}</Text>
        <View style={s.dots}>
          {icons.map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotOn]} />
          ))}
        </View>
      </View>
      <View style={s.footer}>
        <Pressable onPress={finish}>
          <Text style={s.skip}>{t("skip")}</Text>
        </Pressable>
        <Pressable
          style={s.next}
          onPress={() => (step === 2 ? finish() : setStep(step + 1))}
        >
          <Text style={s.nextText}>{step === 2 ? t("start") : t("next")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { flex: 1, padding: 28, paddingTop: 30, alignItems: "center" },
  logo: { width: 96, height: 96, borderRadius: 24 },
  brand: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2.1,
    color: "#2DB526",
    marginTop: 14,
  },
  hero: {
    marginTop: 50,
    width: 188,
    height: 188,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAECF0",
    position: "relative",
    overflow: "hidden",
  },
  heroLogo: { width: 164, height: 164 },
  heroBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#EAECF0",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#101828",
    textAlign: "center",
    marginTop: 32,
  },
  text: {
    fontSize: 16,
    lineHeight: 25,
    color: "#667085",
    textAlign: "center",
    marginTop: 14,
    maxWidth: 340,
  },
  dots: { flexDirection: "row", gap: 8, marginTop: 30 },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: "#D0D5DD" },
  dotOn: { width: 24, backgroundColor: "#111827" },
  footer: {
    padding: 24,
    paddingBottom: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skip: { fontWeight: "800", color: "#667085", padding: 12 },
  next: {
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  nextText: { color: "#fff", fontWeight: "900", letterSpacing: 0.5 },
});

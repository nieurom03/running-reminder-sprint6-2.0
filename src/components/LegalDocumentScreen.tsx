import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassBackground, GlassCard } from "@/components/Glass";
import { getLegalDocument } from "@/content/legal";
import { useI18n } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";

export function LegalDocumentScreen({ type }: { type: "privacy" | "terms" }) {
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const document = getLegalDocument(type, language);
  const title = t(type === "privacy" ? "privacyPolicy" : "termsOfUse");

  return (
    <GlassBackground>
      <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            hitSlop={12}
            onPress={() => router.back()}
            style={[s.backButton, { backgroundColor: colors.bgCard }]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
          <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
          <View style={s.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={s.card}>
          <View style={[s.heroIcon, { backgroundColor: colors.rowIconBg }]}>
            <Ionicons
              name={
                type === "privacy"
                  ? "shield-checkmark-outline"
                  : "document-text-outline"
              }
              size={26}
              color={colors.accent}
            />
          </View>
          <Text style={[s.updated, { color: colors.textMuted }]}>
            {document.updated}
          </Text>
          <Text style={[s.intro, { color: colors.textPrimary }]}>
            {document.intro}
          </Text>

          {document.sections.map((section, index) => (
            <View
              key={section.title}
              style={[
                s.section,
                index > 0 && {
                  borderTopColor: colors.divider,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[s.body, { color: colors.textSecondary }]}>
                {section.body}
              </Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </GlassBackground>
  );
}

const s = StyleSheet.create({
  safe: { backgroundColor: "transparent" },
  header: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 20, fontWeight: "900", textAlign: "center" },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 48 },
  card: { padding: 20 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  updated: { fontSize: 12, fontWeight: "700" },
  intro: { fontSize: 17, lineHeight: 25, fontWeight: "800", marginTop: 8 },
  section: { paddingTop: 18, marginTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 7 },
  body: { fontSize: 14, lineHeight: 22 },
});

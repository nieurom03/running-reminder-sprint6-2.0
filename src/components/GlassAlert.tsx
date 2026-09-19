import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/i18n";
import { LiquidGlassModal } from "@/components/LiquidGlassModal";

export type GlassAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

type GlassAlertConfig = {
  title: string;
  message?: string;
  buttons?: GlassAlertButton[];
};

type ShowGlassAlert = (
  title: string,
  message?: string,
  buttons?: GlassAlertButton[],
) => void;

const GlassAlertContext = createContext<ShowGlassAlert | null>(null);

export function GlassAlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [dialog, setDialog] = useState<GlassAlertConfig | null>(null);

  const showAlert = useCallback<ShowGlassAlert>((title, message, buttons) => {
    setDialog({ title, message, buttons });
  }, []);

  const actions = useMemo(
    () =>
      dialog?.buttons?.length
        ? dialog.buttons
        : [{ text: t("ok") } satisfies GlassAlertButton],
    [dialog?.buttons, t],
  );

  const close = useCallback(() => setDialog(null), []);
  const choose = useCallback((button: GlassAlertButton) => {
    setDialog(null);
    const result = button.onPress?.();
    if (result) void result;
  }, []);

  return (
    <GlassAlertContext.Provider value={showAlert}>
      {children}
      <LiquidGlassModal
        visible={dialog !== null}
        onRequestClose={close}
        dismissOnBackdropPress={false}
        contentStyle={s.content}
      >
        {dialog && (
          <>
            <Text style={[s.title, { color: colors.textPrimary }]}>
              {dialog.title}
            </Text>
            {!!dialog.message && (
              <Text style={[s.message, { color: colors.textSecondary }]}>
                {dialog.message}
              </Text>
            )}
            <View
              style={[s.actions, actions.length > 2 && s.actionsStacked]}
            >
              {actions.map((button, index) => {
                const destructive = button.style === "destructive";
                const primary = button.style !== "cancel";
                return (
                  <Pressable
                    key={`${button.text}-${index}`}
                    accessibilityRole="button"
                    onPress={() => choose(button)}
                    style={({ pressed }) => [
                      s.button,
                      actions.length > 2 && s.buttonStacked,
                      {
                        backgroundColor: destructive
                          ? "rgba(217,45,32,0.14)"
                          : primary
                            ? colors.accent
                            : colors.rowIconBg,
                        borderColor: destructive
                          ? "rgba(217,45,32,0.46)"
                          : primary
                            ? colors.accent
                            : colors.modalBorder,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.buttonText,
                        {
                          color: destructive
                            ? "#F04438"
                            : primary
                              ? "#FFFFFF"
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </LiquidGlassModal>
    </GlassAlertContext.Provider>
  );
}

export function useGlassAlert() {
  const showAlert = useContext(GlassAlertContext);
  if (!showAlert) {
    throw new Error("useGlassAlert must be used inside GlassAlertProvider");
  }
  return showAlert;
}

const s = StyleSheet.create({
  content: { padding: 22 },
  title: { fontSize: 23, lineHeight: 29, fontWeight: "900" },
  message: { marginTop: 10, fontSize: 15, lineHeight: 22, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  actionsStacked: { flexDirection: "column" },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonStacked: { flex: 0, width: "100%" },
  buttonText: { fontSize: 15, fontWeight: "900", textAlign: "center" },
});

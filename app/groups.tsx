import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassBackground, GlassCard } from "@/components/Glass";
import { useGlassAlert } from "@/components/GlassAlert";
import { useTheme } from "@/context/ThemeContext";
import {
  deleteRunningGroup,
  getGroupMembers,
  getGroupTrainingPlanBundle,
  getRecentActivities,
  getRunningGroup,
  getRunningGroups,
  getSetting,
  getSharedGroupResults,
  saveGroupMember,
  saveGroupTrainingPlanBundle,
  saveRunningGroup,
  saveSharedGroupResult,
  setSetting,
} from "@/db/repository";
import { useI18n } from "@/i18n";
import {
  addNearbyListener,
  getConnectedNearbyPeers,
  inviteNearbyPeer,
  nearbyGroupsSupported,
  respondToNearbyInvitation,
  sendNearbyMessage,
  startNearby,
  stopNearby,
  type NearbyPeer,
} from "@/services/nearbyGroups";
import type {
  GroupMember,
  GroupTrainingPlanBundle,
  RunningGroup,
  SharedGroupResult,
} from "@/types/models";
import { isClosedResourceError } from "@/utils/errors";

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const normalizeDisplayName = (value: string) => {
  const trimmed = value.trim();
  let result = "";
  for (const character of trimmed) {
    const candidate = result + character;
    if (new TextEncoder().encode(candidate).length > 48) break;
    result = candidate;
  }
  return result;
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};

const formatPace = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

type GroupInviteContext = {
  type: "groupInvite";
  group: RunningGroup;
};

type GroupResultMessage = {
  type: "groupResult";
  result: SharedGroupResult;
};

type GroupPlanMessage = {
  type: "groupPlan";
  bundle: GroupTrainingPlanBundle;
};

const workoutTypes = new Set([
  "EASY",
  "TEMPO",
  "INTERVAL",
  "LONG_RUN",
  "RECOVERY",
  "WALK",
  "REST",
]);

const isGroupInviteContext = (value: unknown): value is GroupInviteContext => {
  const context = value as Partial<GroupInviteContext> | null;
  const group = context?.group as Partial<RunningGroup> | undefined;
  return Boolean(
    context?.type === "groupInvite" &&
      group &&
      typeof group.id === "string" &&
      group.id.length > 0 &&
      group.id.length <= 120 &&
      typeof group.name === "string" &&
      group.name.length > 0 &&
      group.name.length <= 80 &&
      typeof group.ownerName === "string" &&
      group.ownerName.length <= 80 &&
      typeof group.createdAt === "string",
  );
};

const isGroupResultMessage = (value: unknown): value is GroupResultMessage => {
  const message = value as Partial<GroupResultMessage> | null;
  const result = message?.result as Partial<SharedGroupResult> | undefined;
  return Boolean(
    message?.type === "groupResult" &&
      result &&
      typeof result.id === "string" &&
      result.id.length <= 300 &&
      typeof result.groupId === "string" &&
      result.groupId.length <= 120 &&
      typeof result.senderName === "string" &&
      result.senderName.length <= 80 &&
      typeof result.activityStartTime === "string" &&
      typeof result.distanceKm === "number" &&
      Number.isFinite(result.distanceKm) &&
      result.distanceKm >= 0 &&
      typeof result.durationSeconds === "number" &&
      Number.isFinite(result.durationSeconds) &&
      result.durationSeconds >= 0 &&
      typeof result.receivedAt === "string",
  );
};

const isGroupPlanMessage = (value: unknown): value is GroupPlanMessage => {
  const message = value as Partial<GroupPlanMessage> | null;
  const bundle = message?.bundle as Partial<GroupTrainingPlanBundle> | undefined;
  const plan = bundle?.plan as GroupTrainingPlanBundle["plan"] | undefined;
  if (
    message?.type !== "groupPlan" ||
    !bundle ||
    !plan ||
    typeof plan.id !== "string" ||
    !plan.id ||
    plan.id.length > 120 ||
    typeof plan.groupId !== "string" ||
    !plan.groupId ||
    plan.groupId.length > 120 ||
    typeof plan.raceDate !== "string" ||
    typeof plan.raceDistanceKm !== "number" ||
    !Number.isFinite(plan.raceDistanceKm) ||
    plan.raceDistanceKm <= 0 ||
    plan.raceDistanceKm > 1000 ||
    typeof plan.goalTimeMinutes !== "number" ||
    !Number.isFinite(plan.goalTimeMinutes) ||
    plan.goalTimeMinutes <= 0 ||
    plan.goalTimeMinutes > 24 * 60 ||
    !Number.isInteger(plan.runsPerWeek) ||
    plan.runsPerWeek < 3 ||
    plan.runsPerWeek > 7 ||
    !Array.isArray(plan.runningDays) ||
    plan.runningDays.length < 3 ||
    plan.runsPerWeek !== plan.runningDays.length ||
    plan.runningDays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    ) ||
    !Number.isInteger(plan.longRunDay) ||
    !plan.runningDays.includes(plan.longRunDay) ||
    typeof plan.createdAt !== "string" ||
    typeof plan.createdBy !== "string" ||
    plan.createdBy.length > 80 ||
    !Array.isArray(bundle.members) ||
    bundle.members.length < 1 ||
    bundle.members.length > 20 ||
    !Array.isArray(bundle.workouts) ||
    bundle.workouts.length < 1 ||
    bundle.workouts.length > 6000
  ) {
    return false;
  }
  const memberNames = new Set<string>();
  for (const member of bundle.members) {
    if (
      member.planId !== plan.id ||
      typeof member.memberName !== "string" ||
      !member.memberName.trim() ||
      member.memberName.length > 80 ||
      typeof member.currentPaceSec !== "number" ||
      !Number.isFinite(member.currentPaceSec) ||
      member.currentPaceSec < 180 ||
      member.currentPaceSec > 900
    ) {
      return false;
    }
    const normalizedName = member.memberName.trim().toLocaleLowerCase();
    if (memberNames.has(normalizedName)) return false;
    memberNames.add(normalizedName);
  }
  const workoutIds = new Set<string>();
  return bundle.workouts.every((workout) => {
    if (workoutIds.has(workout.id)) return false;
    workoutIds.add(workout.id);
    return (
      workout.planId === plan.id &&
      typeof workout.id === "string" &&
      workout.id.length > 0 &&
      workout.id.length <= 300 &&
      typeof workout.memberName === "string" &&
      memberNames.has(workout.memberName.trim().toLocaleLowerCase()) &&
      typeof workout.date === "string" &&
      workoutTypes.has(workout.type) &&
      typeof workout.distanceKm === "number" &&
      Number.isFinite(workout.distanceKm) &&
      workout.distanceKm >= 0 &&
      workout.distanceKm <= 1000 &&
      (workout.targetPaceMinSec === null ||
        (typeof workout.targetPaceMinSec === "number" &&
          Number.isFinite(workout.targetPaceMinSec) &&
          workout.targetPaceMinSec >= 0)) &&
      (workout.targetPaceMaxSec === null ||
        (typeof workout.targetPaceMaxSec === "number" &&
          Number.isFinite(workout.targetPaceMaxSec) &&
          workout.targetPaceMaxSec >= 0)) &&
      typeof workout.description === "string" &&
      workout.description.length <= 1000
    );
  });
};

export default function GroupsScreen() {
  const db = useSQLiteContext();
  const { t, language } = useI18n();
  const { colors } = useTheme();
  const showAlert = useGlassAlert();
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groups, setGroups] = useState<RunningGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<RunningGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [results, setResults] = useState<SharedGroupResult[]>([]);
  const [groupPlan, setGroupPlan] = useState<GroupTrainingPlanBundle | null>(null);
  const [peers, setPeers] = useState<NearbyPeer[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);

  const loadGroupData = useCallback(
    async (group: RunningGroup | null) => {
      if (!group) {
        setMembers([]);
        setResults([]);
        setGroupPlan(null);
        return;
      }
      const [nextMembers, nextResults, nextGroupPlan] = await Promise.all([
        getGroupMembers(db, group.id),
        getSharedGroupResults(db, group.id),
        getGroupTrainingPlanBundle(db, group.id),
      ]);
      setMembers(nextMembers);
      setResults(nextResults);
      setGroupPlan(nextGroupPlan);
    },
    [db],
  );

  const loadInitial = useCallback(async () => {
    const [storedName, storedDeviceId, storedGroups] = await Promise.all([
      getSetting(db, "nearby_display_name"),
      getSetting(db, "nearby_device_id"),
      getRunningGroups(db),
    ]);
    const nextDeviceId = storedDeviceId ?? makeId();
    if (!storedDeviceId) await setSetting(db, "nearby_device_id", nextDeviceId);
    setDeviceId(nextDeviceId);
    setDisplayName(storedName ?? "");
    setSavedDisplayName(storedName ?? "");
    setGroups(storedGroups);
    const current = storedGroups[0] ?? null;
    setSelectedGroup(current);
    await loadGroupData(current);
  }, [db, loadGroupData]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadInitial().catch((error) => {
        if (active && !isClosedResourceError(error)) {
          console.error("Running groups DB error:", error);
        }
      });
      return () => {
        active = false;
      };
    }, [loadInitial]),
  );

  useEffect(
    () => () => {
      void stopNearby();
    },
    [],
  );

  useEffect(() => {
    const subscriptions = [
      addNearbyListener("onPeersChanged", ({ peers: nextPeers }) => {
        setPeers(nextPeers);
      }),
      addNearbyListener("onPeerState", async ({ peerName, state }) => {
        setConnectedPeers((current) =>
          state === "connected"
            ? Array.from(new Set([...current, peerName])).sort()
            : current.filter((name) => name !== peerName),
        );
        if (state === "connected" && selectedGroup) {
          await saveGroupMember(db, selectedGroup.id, peerName);
          await loadGroupData(selectedGroup);
          if (
            groupPlan &&
            selectedGroup.ownerName === savedDisplayName
          ) {
            try {
              await sendNearbyMessage(
                { type: "groupPlan", bundle: groupPlan },
                [peerName],
              );
            } catch (error) {
              showAlert(
                t("nearbyError"),
                error instanceof Error ? error.message : "",
              );
            }
          }
        }
      }),
      addNearbyListener("onInvitation", (invitation) => {
        let context: unknown = null;
        try {
          context = JSON.parse(invitation.context) as unknown;
        } catch {
          context = null;
        }
        if (!isGroupInviteContext(context)) {
          void respondToNearbyInvitation(invitation.token, false);
          return;
        }
        const invitedGroup = context.group;
        const message =
          language === "vi"
            ? `${invitation.peerName} mời bạn tham gia nhóm “${invitedGroup.name}”.`
            : `${invitation.peerName} invited you to join “${invitedGroup.name}”.`;
        showAlert(t("invitationTitle"), message, [
          {
            text: t("decline"),
            style: "cancel",
            onPress: async () => {
              await respondToNearbyInvitation(invitation.token, false);
            },
          },
          {
            text: t("join"),
            onPress: async () => {
              await saveRunningGroup(db, invitedGroup);
              await saveGroupMember(db, invitedGroup.id, invitation.peerName);
              if (savedDisplayName) {
                await saveGroupMember(db, invitedGroup.id, savedDisplayName);
              }
              setGroups((current) => [
                invitedGroup,
                ...current.filter((group) => group.id !== invitedGroup.id),
              ]);
              setSelectedGroup(invitedGroup);
              await loadGroupData(invitedGroup);
              await respondToNearbyInvitation(invitation.token, true);
            },
          },
        ]);
      }),
      addNearbyListener("onMessage", async ({ peerName, payload }) => {
        let message: unknown = null;
        try {
          message = JSON.parse(payload) as unknown;
        } catch {
          message = null;
        }
        if (isGroupPlanMessage(message)) {
          const targetGroup = await getRunningGroup(db, message.bundle.plan.groupId);
          if (!targetGroup || targetGroup.ownerName !== peerName) return;
          const receivedBundle: GroupTrainingPlanBundle = {
            ...message.bundle,
            plan: {
              ...message.bundle.plan,
              createdBy: peerName,
            },
          };
          await saveGroupTrainingPlanBundle(db, receivedBundle);
          if (selectedGroup?.id === targetGroup.id) {
            await loadGroupData(selectedGroup);
          }
          showAlert(t("groupPlanReceived"), targetGroup.name);
          return;
        }
        if (!isGroupResultMessage(message)) return;
        const resultGroup = await getRunningGroup(db, message.result.groupId);
        if (!resultGroup) return;
        await saveSharedGroupResult(db, {
          ...message.result,
          senderName: peerName,
          receivedAt: new Date().toISOString(),
        });
        await saveGroupMember(db, message.result.groupId, peerName);
        if (selectedGroup?.id === message.result.groupId) {
          await loadGroupData(selectedGroup);
        }
      }),
      addNearbyListener("onError", ({ message }) => {
        showAlert(t("nearbyError"), message);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [
    db,
    language,
    loadGroupData,
    groupPlan,
    savedDisplayName,
    selectedGroup,
    showAlert,
    t,
  ]);

  const saveNameAndStart = async () => {
    const name = normalizeDisplayName(displayName);
    if (!name) return;
    try {
      await setSetting(db, "nearby_display_name", name);
      setDisplayName(name);
      setSavedDisplayName(name);
      await startNearby(name);
      setScanning(true);
      setConnectedPeers(await getConnectedNearbyPeers());
    } catch (error) {
      showAlert(t("nearbyError"), error instanceof Error ? error.message : "");
    }
  };

  const toggleScanning = async () => {
    try {
      if (scanning) {
        await stopNearby();
        setScanning(false);
        setPeers([]);
        setConnectedPeers([]);
        return;
      }
      if (!savedDisplayName) {
        await saveNameAndStart();
        return;
      }
      await startNearby(savedDisplayName);
      setScanning(true);
    } catch (error) {
      showAlert(t("nearbyError"), error instanceof Error ? error.message : "");
    }
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name || !savedDisplayName) return;
    const group: RunningGroup = {
      id: makeId(),
      name,
      ownerName: savedDisplayName,
      createdAt: new Date().toISOString(),
    };
    await saveRunningGroup(db, group);
    await saveGroupMember(db, group.id, savedDisplayName);
    setGroups((current) => [group, ...current]);
    setSelectedGroup(group);
    setGroupName("");
    await loadGroupData(group);
  };

  const invitePeer = async (peer: NearbyPeer) => {
    if (!selectedGroup) return;
    try {
      const sent = await inviteNearbyPeer(peer.id, {
        type: "groupInvite",
        group: selectedGroup,
      });
      if (sent) showAlert(t("inviteSent"), peer.name);
    } catch (error) {
      showAlert(t("nearbyError"), error instanceof Error ? error.message : "");
    }
  };

  const shareLatestResult = async () => {
    if (!selectedGroup) return;
    const memberNames = new Set(members.map((member) => member.peerName));
    const connectedGroupPeers = connectedPeers.filter((peerName) =>
      memberNames.has(peerName),
    );
    if (connectedGroupPeers.length === 0) {
      showAlert(t("shareLatestResult"), t("noConnectedRunners"));
      return;
    }
    const [activity] = await getRecentActivities(db, 1);
    if (!activity) {
      showAlert(t("shareLatestResult"), t("noActivityToShare"));
      return;
    }
    const result: SharedGroupResult = {
      id: `${selectedGroup.id}:${deviceId}:${activity.id}`,
      groupId: selectedGroup.id,
      senderName: savedDisplayName,
      activityStartTime: activity.startTime,
      distanceKm: activity.distanceKm,
      durationSeconds: activity.durationSeconds,
      receivedAt: new Date().toISOString(),
    };
    let sentCount = 0;
    try {
      sentCount = await sendNearbyMessage(
        { type: "groupResult", result },
        connectedGroupPeers,
      );
    } catch (error) {
      showAlert(t("nearbyError"), error instanceof Error ? error.message : "");
      return;
    }
    if (sentCount === 0) {
      showAlert(t("shareLatestResult"), t("noConnectedRunners"));
      return;
    }
    await saveSharedGroupResult(db, result);
    await loadGroupData(selectedGroup);
    showAlert(t("resultShared"), `${sentCount} ${t("memberUnit")}`);
  };

  const shareCurrentGroupPlan = async () => {
    if (
      !selectedGroup ||
      !groupPlan ||
      selectedGroup.ownerName !== savedDisplayName
    ) return;
    const memberNames = new Set(members.map((member) => member.peerName));
    const targets = connectedPeers.filter(
      (peerName) =>
        peerName !== savedDisplayName && memberNames.has(peerName),
    );
    if (!targets.length) {
      showAlert(t("shareGroupTrainingPlan"), t("noConnectedRunners"));
      return;
    }
    try {
      const sentCount = await sendNearbyMessage(
        { type: "groupPlan", bundle: groupPlan },
        targets,
      );
      showAlert(
        t("groupPlanSaved"),
        `${t("groupPlanSharedCount")}: ${sentCount}`,
      );
    } catch (error) {
      showAlert(t("nearbyError"), error instanceof Error ? error.message : "");
    }
  };

  const leaveCurrentGroup = () => {
    if (!selectedGroup) return;
    showAlert(t("leaveGroup"), t("leaveGroupConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("leaveGroup"),
        style: "destructive",
        onPress: async () => {
          await deleteRunningGroup(db, selectedGroup.id);
          const remaining = groups.filter((group) => group.id !== selectedGroup.id);
          const next = remaining[0] ?? null;
          setGroups(remaining);
          setSelectedGroup(next);
          await loadGroupData(next);
        },
      },
    ]);
  };

  const groupTotal = useMemo(
    () => results.reduce((total, result) => total + result.distanceKm, 0),
    [results],
  );

  return (
    <GlassBackground>
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={[s.title, { color: colors.textPrimary }]}>
            {t("runningGroups")}
          </Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {!nearbyGroupsSupported && (
            <GlassCard style={s.notice}>
              <Ionicons name="phone-portrait-outline" size={22} color={colors.accent} />
              <Text style={[s.noticeText, { color: colors.textSecondary }]}>
                {t("nearbyUnavailable")}
              </Text>
            </GlassCard>
          )}

          <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
            {t("yourNearbyName")}
          </Text>
          <GlassCard style={s.formCard}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={48}
              placeholder={t("nearbyNamePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={[
                s.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.bgCardBorder,
                  backgroundColor: colors.bgCard,
                },
              ]}
            />
            <Pressable
              disabled={!displayName.trim() || !nearbyGroupsSupported}
              onPress={savedDisplayName === displayName.trim() ? toggleScanning : saveNameAndStart}
              style={({ pressed }) => [
                s.primaryButton,
                {
                  backgroundColor: colors.accent,
                  opacity:
                    !displayName.trim() || !nearbyGroupsSupported
                      ? 0.45
                      : pressed
                        ? 0.72
                        : 1,
                },
              ]}
            >
              <Ionicons name={scanning ? "stop-circle-outline" : "scan-outline"} size={19} color="#fff" />
              <Text style={s.primaryButtonText}>
                {savedDisplayName !== displayName.trim()
                  ? t("saveAndScan")
                  : scanning
                    ? t("stopScanning")
                    : t("startScanning")}
              </Text>
            </Pressable>
            {scanning && (
              <Text style={[s.helper, { color: colors.textSecondary }]}>
                {t("scanningNearby")}
              </Text>
            )}
          </GlassCard>

          {savedDisplayName && (
            <>
              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("createRunningGroup")}
              </Text>
              <GlassCard style={s.formCard}>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={80}
                  placeholder={t("groupNamePlaceholder")}
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    s.input,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.bgCardBorder,
                      backgroundColor: colors.bgCard,
                    },
                  ]}
                />
                <Pressable
                  disabled={!groupName.trim()}
                  onPress={createGroup}
                  style={({ pressed }) => [
                    s.secondaryButton,
                    {
                      borderColor: colors.accent,
                      opacity: !groupName.trim() ? 0.4 : pressed ? 0.65 : 1,
                    },
                  ]}
                >
                  <Ionicons name="people-outline" size={18} color={colors.accent} />
                  <Text style={[s.secondaryButtonText, { color: colors.accent }]}>
                    {t("createGroup")}
                  </Text>
                </Pressable>
              </GlassCard>
            </>
          )}

          {groups.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("currentGroup")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupChips}>
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => {
                      setSelectedGroup(group);
                      void loadGroupData(group).catch((error) => {
                        if (!isClosedResourceError(error)) {
                          console.error("Could not load group data:", error);
                        }
                      });
                    }}
                    style={[
                      s.groupChip,
                      {
                        backgroundColor:
                          selectedGroup?.id === group.id
                            ? colors.accent
                            : colors.bgCard,
                        borderColor: colors.bgCardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.groupChipText,
                        {
                          color:
                            selectedGroup?.id === group.id
                              ? "#fff"
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {group.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {selectedGroup && (
            <>
              <GlassCard style={s.groupHero}>
                <View style={[s.groupIcon, { backgroundColor: colors.rowIconBg }]}>
                  <Ionicons name="people" size={25} color={colors.accent} />
                </View>
                <View style={s.groupHeroCopy}>
                  <Text style={[s.groupName, { color: colors.textPrimary }]}>
                    {selectedGroup.name}
                  </Text>
                  <Text style={[s.groupMeta, { color: colors.textSecondary }]}>
                    {members.length} {t("memberUnit")} · {groupTotal.toFixed(2)} km
                  </Text>
                </View>
              </GlassCard>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("groupTrainingPlan")}
              </Text>
              <GlassCard style={s.planCard}>
                {groupPlan ? (
                  <>
                    <View style={s.planHeader}>
                      <View style={[s.planIcon, { backgroundColor: colors.rowIconBg }]}>
                        <Ionicons name="calendar" size={21} color={colors.accent} />
                      </View>
                      <View style={s.groupHeroCopy}>
                        <Text style={[s.planTitle, { color: colors.textPrimary }]}>
                          {groupPlan.plan.raceDistanceKm} km · {groupPlan.plan.raceDate}
                        </Text>
                        <Text style={[s.groupMeta, { color: colors.textSecondary }]}>
                          {groupPlan.members.length} {t("groupPlanParticipants")} · {formatDuration(groupPlan.plan.goalTimeMinutes * 60)}
                        </Text>
                      </View>
                    </View>
                    <View style={s.planMembers}>
                      {groupPlan.members.map((member) => (
                        <View
                          key={member.memberName}
                          style={[s.planMemberChip, { backgroundColor: colors.rowIconBg }]}
                        >
                          <Text style={[s.planMemberName, { color: colors.textPrimary }]}>
                            {member.memberName}
                          </Text>
                          <Text style={[s.planMemberPace, { color: colors.textSecondary }]}>
                            {formatPace(member.currentPaceSec)}/km
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                    {t("noGroupTrainingPlan")}
                  </Text>
                )}
                {selectedGroup.ownerName === savedDisplayName && (
                  <View style={s.planActions}>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/group-plan",
                          params: { groupId: selectedGroup.id },
                        })
                      }
                      style={[s.planPrimaryButton, { backgroundColor: colors.accent }]}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                      <Text style={s.planPrimaryText}>
                        {groupPlan
                          ? t("updateGroupTrainingPlan")
                          : t("createGroupTrainingPlan")}
                      </Text>
                    </Pressable>
                    {groupPlan && (
                      <>
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: "/group-plan",
                              params: { groupId: selectedGroup.id, mode: "view" },
                            })
                          }
                          style={[s.planSecondaryButton, { borderColor: colors.accent }]}
                        >
                          <Ionicons name="reader-outline" size={18} color={colors.accent} />
                          <Text style={[s.planSecondaryText, { color: colors.accent }]}>
                            {t("viewGroupTrainingPlan")}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={shareCurrentGroupPlan}
                          style={[s.planSecondaryButton, { borderColor: colors.accent }]}
                        >
                          <Ionicons name="share-outline" size={18} color={colors.accent} />
                          <Text style={[s.planSecondaryText, { color: colors.accent }]}>
                            {t("shareGroupTrainingPlan")}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
                {groupPlan && selectedGroup.ownerName !== savedDisplayName && (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/group-plan",
                        params: { groupId: selectedGroup.id },
                      })
                    }
                    style={[s.planPrimaryButton, s.planViewButton, { backgroundColor: colors.accent }]}
                  >
                    <Ionicons name="reader-outline" size={18} color="#fff" />
                    <Text style={s.planPrimaryText}>{t("viewGroupTrainingPlan")}</Text>
                  </Pressable>
                )}
              </GlassCard>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("nearbyRunners")}
              </Text>
              <GlassCard style={s.listCard}>
                {peers.length === 0 ? (
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                    {t("noNearbyRunners")}
                  </Text>
                ) : (
                  peers.map((peer, index) => (
                    <View key={peer.id}>
                      {index > 0 && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
                      <View style={s.peerRow}>
                        <View style={[s.avatar, { backgroundColor: colors.rowIconBg }]}>
                          <Ionicons name="person" size={18} color={colors.accent} />
                        </View>
                        <Text style={[s.peerName, { color: colors.textPrimary }]}>{peer.name}</Text>
                        <Pressable onPress={() => invitePeer(peer)} style={[s.inviteButton, { backgroundColor: colors.accent }]}>
                          <Text style={s.inviteText}>{t("invite")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </GlassCard>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("groupMembers")}
              </Text>
              <GlassCard style={s.listCard}>
                {members.map((member, index) => (
                  <View key={member.peerName}>
                    {index > 0 && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
                    <View style={s.memberRow}>
                      <Ionicons
                        name={connectedPeers.includes(member.peerName) ? "radio-button-on" : "radio-button-off"}
                        size={16}
                        color={connectedPeers.includes(member.peerName) ? colors.accent : colors.textSecondary}
                      />
                      <Text style={[s.memberName, { color: colors.textPrimary }]}>
                        {member.peerName}
                      </Text>
                      {connectedPeers.includes(member.peerName) && (
                        <Text style={[s.connectedText, { color: colors.accent }]}>
                          {t("connectedNow")}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </GlassCard>

              <Pressable onPress={shareLatestResult} style={({ pressed }) => [s.shareButton, { backgroundColor: colors.accent, opacity: pressed ? 0.72 : 1 }]}>
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={s.shareText}>{t("shareLatestResult")}</Text>
              </Pressable>

              <Text style={[s.sectionTitle, { color: colors.groupTitle }]}>
                {t("groupResults")}
              </Text>
              <GlassCard style={s.listCard}>
                {results.length === 0 ? (
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                    {t("noGroupResults")}
                  </Text>
                ) : (
                  results.map((result, index) => (
                    <View key={result.id}>
                      {index > 0 && <View style={[s.divider, { backgroundColor: colors.divider }]} />}
                      <View style={s.resultRow}>
                        <View style={[s.resultIcon, { backgroundColor: colors.rowIconBg }]}>
                          <Ionicons name="walk-outline" size={19} color={colors.accent} />
                        </View>
                        <View style={s.resultCopy}>
                          <Text style={[s.resultName, { color: colors.textPrimary }]}>
                            {result.senderName}
                          </Text>
                          <Text style={[s.resultMeta, { color: colors.textSecondary }]}>
                            {result.activityStartTime.slice(0, 10)} · {result.distanceKm.toFixed(2)} km · {formatDuration(result.durationSeconds)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </GlassCard>

              <Pressable onPress={leaveCurrentGroup} style={s.leaveButton}>
                <Text style={s.leaveText}>{t("leaveGroup")}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 42 },
  title: { fontSize: 25, fontWeight: "900" },
  content: { paddingHorizontal: 18, paddingBottom: 48 },
  sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  notice: { padding: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  formCard: { padding: 14, gap: 10 },
  input: { minHeight: 48, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, fontSize: 16, fontWeight: "700" },
  primaryButton: { minHeight: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  secondaryButton: { minHeight: 46, borderRadius: 23, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryButtonText: { fontWeight: "900", fontSize: 13 },
  helper: { textAlign: "center", fontSize: 12, fontWeight: "600" },
  groupChips: { gap: 8, paddingRight: 8 },
  groupChip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  groupChipText: { fontSize: 13, fontWeight: "800" },
  groupHero: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  groupIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  groupHeroCopy: { flex: 1 },
  groupName: { fontSize: 21, fontWeight: "900" },
  groupMeta: { marginTop: 4, fontSize: 12, fontWeight: "600" },
  planCard: { padding: 15 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  planIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  planTitle: { fontSize: 16, fontWeight: "900" },
  planMembers: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  planMemberChip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 },
  planMemberName: { fontSize: 12, fontWeight: "900" },
  planMemberPace: { marginTop: 2, fontSize: 10, fontWeight: "700" },
  planActions: { marginTop: 14, gap: 9 },
  planPrimaryButton: { minHeight: 46, borderRadius: 23, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  planPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "900", textAlign: "center" },
  planSecondaryButton: { minHeight: 44, borderRadius: 22, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  planSecondaryText: { fontSize: 12, fontWeight: "900", textAlign: "center" },
  planViewButton: { marginTop: 14 },
  listCard: { paddingHorizontal: 14, paddingVertical: 6 },
  emptyText: { paddingVertical: 14, fontSize: 13, lineHeight: 19, textAlign: "center" },
  divider: { height: 1, marginLeft: 46 },
  peerRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  peerName: { flex: 1, fontSize: 15, fontWeight: "800" },
  inviteButton: { minHeight: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  inviteText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  memberRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
  memberName: { flex: 1, fontSize: 14, fontWeight: "800" },
  connectedText: { fontSize: 10, fontWeight: "900" },
  shareButton: { marginTop: 14, minHeight: 50, borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  shareText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  resultRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 11 },
  resultIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  resultCopy: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: "900" },
  resultMeta: { marginTop: 3, fontSize: 11, fontWeight: "600" },
  leaveButton: { marginTop: 18, minHeight: 44, alignItems: "center", justifyContent: "center" },
  leaveText: { color: "#D92D20", fontSize: 13, fontWeight: "900" },
});

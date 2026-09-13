import * as Notifications from 'expo-notifications';
import type { TrainingPlan, Workout } from '@/types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function scheduleWorkoutReminder(date: Date, title: string, body: string) {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  if (date.getTime() <= Date.now()) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date }
  });
}

export async function schedulePlanReminders(plan: TrainingPlan, workouts: Workout[]) {
  const granted = await requestNotificationPermission();
  if (!granted) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  let count = 0;
  for (const workout of workouts) {
    if (workout.status !== 'PLANNED') continue;
    const [y,m,d] = workout.date.split('-').map(Number);
    const reminder = new Date(y, m - 1, d, plan.reminderHour, plan.reminderMinute, 0, 0);
    if (reminder.getTime() <= Date.now()) continue;
    const pace = workout.targetPaceMinSec ? ` · pace ${formatPace(workout.targetPaceMinSec)}–${formatPace(workout.targetPaceMaxSec ?? workout.targetPaceMinSec)}` : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏃 ${workout.type.replace('_',' ')} · ${workout.distanceKm} km`,
        body: `${workout.date}${pace}`,
        data: { workoutId: workout.id }
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder }
    });
    count++;
  }
  return count;
}

export async function cancelAllWorkoutReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function formatPace(sec: number) {
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}

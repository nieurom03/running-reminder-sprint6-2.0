import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Workout, WorkoutStatus } from '@/types/models';
import { useI18n } from '@/i18n';
import { RunnerIcon } from '@/components/RunnerIcon';
import { WalkerIcon } from '@/components/WalkerIcon';
import { useTheme } from '@/context/ThemeContext';

export const pace = (sec: number | null) => sec == null ? '-' : `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
export const statusTheme: Record<WorkoutStatus, { bg:string; border:string; text:string; badge:string; label:string; icon:string }> = {
  PLANNED:{bg:'rgba(255,255,255,.38)',border:'rgba(255,255,255,.62)',text:'#263A31',badge:'rgba(239,245,241,.48)',label:'Planned',icon:'○'},
  COMPLETED:{bg:'rgba(232,251,240,.40)',border:'rgba(90,204,139,.34)',text:'#067647',badge:'rgba(207,246,223,.48)',label:'Completed',icon:'✓'},
  SKIPPED:{bg:'rgba(255,247,226,.42)',border:'rgba(247,144,9,.28)',text:'#B54708',badge:'rgba(255,240,194,.50)',label:'Skipped',icon:'↷'},
  MISSED:{bg:'rgba(255,238,236,.42)',border:'rgba(240,68,56,.26)',text:'#B42318',badge:'rgba(255,218,214,.50)',label:'Missed',icon:'!'},
};
function iconFor(type:string){return type==='INTERVAL'?'pulse-outline':type==='REST'?'bed-outline':type==='TEMPO'?'speedometer-outline':null}
export function WorkoutCard({workout}:{workout:Workout}){
  const {t}=useI18n(); const {colors,isDark}=useTheme(); const theme=statusTheme[workout.status]??statusTheme.PLANNED;
  const ionIcon = iconFor(workout.type);
  const typeLabel = workout.type==='EASY'?t('easy'):workout.type==='TEMPO'?t('tempo'):workout.type==='INTERVAL'?t('interval'):workout.type==='LONG_RUN'?t('longRun'):workout.type==='RECOVERY'?t('recovery'):workout.type==='WALK'?t('walk'):t('rest');
  const cardBackground = workout.isExtra
    ? isDark ? 'rgba(18,88,52,.44)' : 'rgba(222,248,234,.42)'
    : isDark ? colors.bgCard : theme.bg;
  const cardBorder = workout.isExtra
    ? isDark ? 'rgba(45,181,38,.58)' : 'rgba(45,181,38,.38)'
    : isDark ? colors.bgCardBorder : theme.border;
  const workoutColor = workout.isExtra ? colors.accent : isDark ? colors.textPrimary : theme.text;
  return <Pressable style={[s.card,{backgroundColor:cardBackground,borderColor:cardBorder}]} onPress={()=>router.push(`/workout/${workout.id}`)}>
    <View style={[s.icon,{backgroundColor:workout.isExtra?colors.rowIconBg:theme.badge}]}>
      {workout.type === 'WALK'
        ? <WalkerIcon size={25} color={workoutColor}/>
        : ionIcon
        ? <Ionicons name={ionIcon as any} size={20} color={workoutColor}/>
        : <RunnerIcon size={22} color={workoutColor}/>
      }
    </View>
    <View style={{flex:1}}><View style={s.titleRow}><Text style={[s.type,{color:workoutColor}]}>{typeLabel}</Text>{workout.isExtra&&<View style={[s.extraBadge,{backgroundColor:colors.rowIconBg}]}><Text style={[s.extraText,{color:colors.accent}]}>{t('extraWorkout')}</Text></View>}</View><Text style={[s.meta,{color:workout.isExtra?colors.textLabel:colors.textSecondary}]}>{workout.date} · {workout.distanceKm} km{workout.targetPaceMinSec!=null?` · ${pace(workout.targetPaceMinSec)}–${pace(workout.targetPaceMaxSec)} /km`:''}</Text></View>
    <View style={s.right}><View style={[s.badge,{backgroundColor:theme.badge}]}><Text style={[s.badgeText,{color:theme.text}]}>{workout.status==='COMPLETED'?t('completed'):workout.status==='SKIPPED'?t('skipped'):workout.status==='MISSED'?t('missed'):t('planned')}</Text></View><Ionicons name="chevron-forward" size={17} color="#82948B"/></View>
  </Pressable>
}
const s=StyleSheet.create({card:{borderRadius:22,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,shadowColor:'#315B47',shadowOpacity:.07,shadowRadius:15,shadowOffset:{width:0,height:7},elevation:2},icon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},titleRow:{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'},type:{fontSize:16,fontWeight:'900'},extraBadge:{borderRadius:999,paddingHorizontal:7,paddingVertical:3},extraText:{fontSize:8,fontWeight:'900',textTransform:'uppercase'},meta:{marginTop:4,color:'#647A70',fontSize:12,fontWeight:'600'},right:{alignItems:'flex-end',gap:8},badge:{borderRadius:999,paddingHorizontal:8,paddingVertical:4},badgeText:{fontSize:9,fontWeight:'900'}});

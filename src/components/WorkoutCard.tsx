import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Workout, WorkoutStatus } from '@/types/models';
import { useI18n } from '@/i18n';
import { RunnerIcon } from '@/components/RunnerIcon';
import { useTheme } from '@/context/ThemeContext';

const labels: Record<string,string> = { EASY:'Easy', TEMPO:'Tempo', INTERVAL:'Interval', LONG_RUN:'Long Run', RECOVERY:'Recovery', REST:'Rest' };
export const pace = (sec: number | null) => sec == null ? '-' : `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
export const statusTheme: Record<WorkoutStatus, { bg:string; border:string; text:string; badge:string; label:string; icon:string }> = {
  PLANNED:{bg:'rgba(255,255,255,.62)',border:'rgba(255,255,255,.95)',text:'#263A31',badge:'#EFF5F1',label:'Planned',icon:'○'},
  COMPLETED:{bg:'rgba(232,251,240,.78)',border:'rgba(90,204,139,.45)',text:'#067647',badge:'#CFF6DF',label:'Completed',icon:'✓'},
  SKIPPED:{bg:'rgba(255,247,226,.84)',border:'rgba(247,144,9,.34)',text:'#B54708',badge:'#FFF0C2',label:'Skipped',icon:'↷'},
  MISSED:{bg:'rgba(255,238,236,.84)',border:'rgba(240,68,56,.30)',text:'#B42318',badge:'#FFDAD6',label:'Missed',icon:'!'},
};
function isRunType(type:string){ return type==='LONG_RUN'||type==='EASY'||type==='RECOVERY'; }
function iconFor(type:string){return type==='INTERVAL'?'pulse-outline':type==='REST'?'bed-outline':type==='TEMPO'?'speedometer-outline':null}
export function WorkoutCard({workout}:{workout:Workout}){
  const {t}=useI18n(); const {colors,isDark}=useTheme(); const theme=statusTheme[workout.status]??statusTheme.PLANNED;
  const ionIcon = iconFor(workout.type);
  return <Pressable style={[s.card,{backgroundColor:isDark?colors.bgCard:theme.bg,borderColor:isDark?colors.bgCardBorder:theme.border}]} onPress={()=>router.push(`/workout/${workout.id}`)}>
    <View style={[s.icon,{backgroundColor:theme.badge}]}>
      {ionIcon
        ? <Ionicons name={ionIcon as any} size={20} color={theme.text}/>
        : <RunnerIcon size={22} color={theme.text}/>
      }
    </View>
    <View style={{flex:1}}><Text style={[s.type,{color:isDark?colors.textPrimary:theme.text}]}>{labels[workout.type]}</Text><Text style={[s.meta,{color:colors.textSecondary}]}>{workout.date} · {workout.distanceKm} km{workout.targetPaceMinSec!=null?` · ${pace(workout.targetPaceMinSec)}–${pace(workout.targetPaceMaxSec)} /km`:''}</Text></View>
    <View style={s.right}><View style={[s.badge,{backgroundColor:theme.badge}]}><Text style={[s.badgeText,{color:theme.text}]}>{workout.status==='COMPLETED'?t('completed'):workout.status==='SKIPPED'?t('skipped'):workout.status==='MISSED'?t('missed'):t('planned')}</Text></View><Ionicons name="chevron-forward" size={17} color="#82948B"/></View>
  </Pressable>
}
const s=StyleSheet.create({card:{borderRadius:22,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,shadowColor:'#315B47',shadowOpacity:.07,shadowRadius:15,shadowOffset:{width:0,height:7},elevation:2},icon:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},type:{fontSize:16,fontWeight:'900'},meta:{marginTop:4,color:'#647A70',fontSize:12,fontWeight:'600'},right:{alignItems:'flex-end',gap:8},badge:{borderRadius:999,paddingHorizontal:8,paddingVertical:4},badgeText:{fontSize:9,fontWeight:'900'}});

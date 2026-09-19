import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { LiquidGlassModal } from '@/components/LiquidGlassModal';

export const goalSecToText = (value:number|null|undefined) => {
  const total = Math.max(0, Math.floor(value ?? 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

export function GoalTimePicker({value,onChange}:{value:number;onChange:(sec:number)=>void}){
  const {t}=useI18n();
  const {colors}=useTheme();
  const [open,setOpen]=useState(false);
  const initial=Math.max(0,Math.floor(value||9900));
  const [h,setH]=useState(Math.floor(initial/3600));
  const [m,setM]=useState(Math.floor((initial%3600)/60));
  const [sec,setSec]=useState(initial%60);
  const hours=useMemo(()=>Array.from({length:13},(_,i)=>i),[]);
  const sixty=useMemo(()=>Array.from({length:60},(_,i)=>i),[]);
  const choose=()=>{onChange(h*3600+m*60+sec);setOpen(false)};
  const openPicker=()=>{const v=Math.max(0,Math.floor(value||9900));setH(Math.floor(v/3600));setM(Math.floor((v%3600)/60));setSec(v%60);setOpen(true)};
  return <>
    <Pressable style={[s.field,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}]} onPress={openPicker}><View><Text style={[s.value,{color:colors.textPrimary}]}>{goalSecToText(value)}</Text><Text style={[s.help,{color:colors.textSecondary}]}>{t('goalTimeHelp')}</Text></View><View style={[s.iconCircle,{backgroundColor:colors.rowIconBg}]}><Ionicons name="time-outline" size={20} color={colors.accent} /></View></Pressable>
    <LiquidGlassModal visible={open} onRequestClose={()=>setOpen(false)}>
        <View style={s.modalHeader}><Text style={[s.title,{color:colors.textPrimary}]}>{t('chooseGoalTime')}</Text><View style={[s.modalIcon,{backgroundColor:colors.rowIconBg}]}><Ionicons name="time-outline" size={18} color={colors.accent}/></View></View>
        <View style={s.pickers}>
          <Wheel values={hours} value={h} onChange={setH} suffix="h" />
          <Text style={[s.colon,{color:colors.textPrimary}]}>:</Text>
          <Wheel values={sixty} value={m} onChange={setM} suffix="m" />
          <Text style={[s.colon,{color:colors.textPrimary}]}>:</Text>
          <Wheel values={sixty} value={sec} onChange={setSec} suffix="s" />
        </View>
        <Text style={[s.preview,{color:colors.textPrimary}]}>{goalSecToText(h*3600+m*60+sec)}</Text>
        <View style={s.actions}><Pressable style={[s.cancel,{borderColor:colors.modalBorder,backgroundColor:colors.rowIconBg}]} onPress={()=>setOpen(false)}><Text style={[s.cancelText,{color:colors.textPrimary}]}>{t('cancel')}</Text></Pressable><Pressable style={[s.done,{backgroundColor:colors.accent}]} onPress={choose}><Text style={s.doneText}>{t('done')}</Text></Pressable></View>
    </LiquidGlassModal>
  </>;
}
function Wheel({values,value,onChange,suffix}:{values:number[];value:number;onChange:(n:number)=>void;suffix:string}){const {colors}=useTheme();return <ScrollView style={s.wheel} contentContainerStyle={s.wheelContent} showsVerticalScrollIndicator={false}>{values.map(v=><Pressable key={v} onPress={()=>onChange(v)} style={[s.option,v===value&&[s.optionOn,{backgroundColor:colors.rowIconBg}]]}><Text style={[s.optionText,{color:colors.textSecondary},v===value&&[s.optionTextOn,{color:colors.accent}]]}>{String(v).padStart(2,'0')}{suffix}</Text></Pressable>)}</ScrollView>}
const s=StyleSheet.create({field:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D0D5DD',borderRadius:18,paddingHorizontal:16,paddingVertical:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},value:{fontSize:24,color:'#101828',fontWeight:'900'},help:{fontSize:12,color:'#667085',marginTop:6,maxWidth:250,lineHeight:18},iconCircle:{width:36,height:36,borderRadius:18,backgroundColor:'#ECFDF3',alignItems:'center',justifyContent:'center'},overlay:{flex:1,backgroundColor:'rgba(16,24,40,.42)',justifyContent:'center',padding:20},modal:{backgroundColor:'#fff',borderRadius:24,padding:20,maxHeight:'80%'},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},modalIcon:{width:34,height:34,borderRadius:17,backgroundColor:'#ECFDF3',alignItems:'center',justifyContent:'center'},title:{fontSize:24,fontWeight:'900',color:'#101828'},pickers:{height:250,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,marginTop:12},wheel:{width:76},wheelContent:{paddingVertical:92},option:{paddingVertical:9,borderRadius:12,alignItems:'center'},optionOn:{backgroundColor:'#ECFDF3'},optionText:{fontSize:16,fontWeight:'700',color:'#667085'},optionTextOn:{fontSize:21,color:'#027A48'},colon:{fontSize:28,fontWeight:'900',color:'#101828'},preview:{textAlign:'center',fontSize:28,fontWeight:'900',color:'#101828',marginTop:8},actions:{flexDirection:'row',gap:10,marginTop:20},cancel:{flex:1,padding:14,borderRadius:14,borderWidth:1,borderColor:'#D0D5DD',alignItems:'center'},done:{flex:1,padding:14,borderRadius:14,backgroundColor:'#111827',alignItems:'center'},cancelText:{fontWeight:'800',color:'#344054'},doneText:{fontWeight:'900',color:'#fff'}});

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '@/i18n';

export const paceSecToText=(v:number|null|undefined)=>v==null?'--:--':`${Math.floor(v/60)}:${String(Math.floor(v%60)).padStart(2,'0')}`;

type Props={value:number;onChange:(sec:number)=>void;minMinute?:number;maxMinute?:number;compact?:boolean};
export function PacePicker({value,onChange,minMinute=3,maxMinute=15,compact=false}:Props){
 const {t}=useI18n(); const [open,setOpen]=useState(false); const initial=Math.max(0,Math.floor(value||450)); const [m,setM]=useState(Math.floor(initial/60)); const [sec,setSec]=useState(initial%60);
 const minutes=useMemo(()=>Array.from({length:maxMinute-minMinute+1},(_,i)=>i+minMinute),[minMinute,maxMinute]); const seconds=useMemo(()=>Array.from({length:60},(_,i)=>i),[]);
 const choose=()=>{onChange(m*60+sec);setOpen(false)};
 const openPicker=()=>{setM(Math.floor((value||450)/60)); setSec((value||450)%60); setOpen(true);};
 return <>
  <Pressable style={[s.field,compact&&s.fieldCompact]} onPress={openPicker}>
    <View style={s.left}>
      <Text style={[s.value,compact&&s.valueCompact]}>{paceSecToText(value)} <Text style={[s.per,compact&&s.perCompact]}>/ km</Text></Text>
      {!compact&&<Text style={s.help}>{t('currentPaceHelp')}</Text>}
    </View>
    <View style={[s.iconCircle,compact&&s.iconCompact]}><Ionicons name="speedometer-outline" size={compact?17:20} color="#155EEF" /></View>
  </Pressable>
  <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}><View style={s.overlay}><View style={s.modal}><View style={s.modalHeader}><Text style={s.title}>{t('choosePace')}</Text><View style={s.modalIcon}><Ionicons name="speedometer-outline" size={18} color="#155EEF"/></View></View><View style={s.pickers}><Wheel values={minutes} value={m} onChange={setM} suffix="m"/><Text style={s.colon}>:</Text><Wheel values={seconds} value={sec} onChange={setSec} suffix="s"/></View><Text style={s.preview}>{m}:{String(sec).padStart(2,'0')} /km</Text><View style={s.actions}><Pressable style={s.cancel} onPress={()=>setOpen(false)}><Text style={s.cancelText}>{t('cancel')}</Text></Pressable><Pressable style={s.done} onPress={choose}><Text style={s.doneText}>{t('done')}</Text></Pressable></View></View></View></Modal>
 </>;
}
function Wheel({values,value,onChange,suffix}:{values:number[];value:number;onChange:(n:number)=>void;suffix:string}){return <ScrollView style={s.wheel} contentContainerStyle={s.wheelContent} showsVerticalScrollIndicator={false}>{values.map(v=><Pressable key={v} onPress={()=>onChange(v)} style={[s.option,v===value&&s.optionOn]}><Text style={[s.optionText,v===value&&s.optionTextOn]}>{String(v).padStart(2,'0')}{suffix}</Text></Pressable>)}</ScrollView>}
const s=StyleSheet.create({field:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D0D5DD',borderRadius:18,paddingHorizontal:16,paddingVertical:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center',overflow:'hidden'},fieldCompact:{paddingHorizontal:12,paddingVertical:14,borderRadius:16},left:{flex:1,minWidth:0,paddingRight:8},value:{fontSize:24,color:'#101828',fontWeight:'900'},valueCompact:{fontSize:22},per:{fontSize:18,fontWeight:'700',color:'#667085'},perCompact:{fontSize:15},help:{fontSize:12,color:'#667085',marginTop:6,lineHeight:18},iconCircle:{width:36,height:36,borderRadius:18,backgroundColor:'#EFF8FF',alignItems:'center',justifyContent:'center',flexShrink:0},iconCompact:{width:30,height:30,borderRadius:15},overlay:{flex:1,backgroundColor:'rgba(16,24,40,.42)',justifyContent:'center',padding:24},modal:{backgroundColor:'#fff',borderRadius:24,padding:20,maxHeight:'78%'},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},modalIcon:{width:34,height:34,borderRadius:17,backgroundColor:'#EFF8FF',alignItems:'center',justifyContent:'center'},title:{fontSize:24,fontWeight:'900',color:'#101828'},pickers:{height:250,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12,marginTop:12},wheel:{width:92},wheelContent:{paddingVertical:92},option:{paddingVertical:9,borderRadius:12,alignItems:'center'},optionOn:{backgroundColor:'#ECFDF3'},optionText:{fontSize:18,fontWeight:'700',color:'#667085'},optionTextOn:{fontSize:23,color:'#027A48'},colon:{fontSize:30,fontWeight:'900',color:'#101828'},preview:{textAlign:'center',fontSize:28,fontWeight:'900',color:'#101828',marginTop:8},actions:{flexDirection:'row',gap:10,marginTop:20},cancel:{flex:1,padding:14,borderRadius:14,borderWidth:1,borderColor:'#D0D5DD',alignItems:'center'},done:{flex:1,padding:14,borderRadius:14,backgroundColor:'#111827',alignItems:'center'},cancelText:{fontWeight:'800',color:'#344054'},doneText:{fontWeight:'900',color:'#fff'}});

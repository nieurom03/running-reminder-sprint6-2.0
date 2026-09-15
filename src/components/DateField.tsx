import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';

const fromIso=(iso:string)=>{
  const d=new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const toIso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export function DateField({value,onChange,minimumDate}:{value:string;onChange:(value:string)=>void;minimumDate?:Date}){
  const {t}=useI18n();
  const {colors,isDark}=useTheme();
  const [show,setShow]=useState(false);
  const date=fromIso(value);

  const handleValueChange=(_:unknown, selectedDate?:Date)=>{
    if (selectedDate instanceof Date && Number.isFinite(selectedDate.getTime())) {
      onChange(toIso(selectedDate));
    }
    if (Platform.OS !== 'ios') setShow(false);
  };

  return <View>
    <Pressable style={[s.field,{backgroundColor:colors.bgCard,borderColor:colors.bgCardBorder}]} onPress={()=>setShow(true)}>
      <Text style={[s.value,{color:colors.textPrimary}]}>{value}</Text>
      <Ionicons name="calendar-outline" size={21} color={colors.textSecondary}/>
    </Pressable>
    {show && <View style={Platform.OS==='ios'?[s.iosPicker,{backgroundColor:colors.bgRoot,borderColor:colors.bgCardBorder}]:undefined}>
      <DateTimePicker
        value={date}
        mode="date"
        display={Platform.OS==='ios'?'inline':'default'}
        themeVariant={Platform.OS==='ios'?(isDark?'dark':'light'):undefined}
        accentColor={colors.accent}
        minimumDate={minimumDate}
        onValueChange={handleValueChange}
        onDismiss={()=>setShow(false)}
      />
      {Platform.OS==='ios' && <Pressable style={s.done} onPress={()=>setShow(false)}><Text style={[s.doneText,{color:colors.accent}]}>{t('done')}</Text></Pressable>}
    </View>}
  </View>;
}

const s=StyleSheet.create({
  field:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D0D5DD',borderRadius:14,paddingHorizontal:14,paddingVertical:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  value:{fontSize:17,color:'#101828',fontWeight:'600'},
  iosPicker:{backgroundColor:'#fff',borderRadius:16,marginTop:8,overflow:'hidden',borderWidth:1,borderColor:'#EAECF0'},
  done:{alignSelf:'flex-end',paddingHorizontal:16,paddingVertical:12},
  doneText:{fontWeight:'900',color:'#027A48'}
});

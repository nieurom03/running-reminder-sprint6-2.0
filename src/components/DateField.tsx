import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { LiquidGlassModal } from '@/components/LiquidGlassModal';

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
    {show && Platform.OS === 'ios' && (
      <LiquidGlassModal visible={show} onRequestClose={()=>setShow(false)}>
        <Text style={[s.title,{color:colors.textPrimary}]}>{t('chooseDate')}</Text>
        <View style={[s.iosPicker,{backgroundColor:colors.rowIconBg,borderColor:colors.modalBorder}]}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            themeVariant={isDark?'dark':'light'}
            accentColor={colors.accent}
            minimumDate={minimumDate}
            onValueChange={handleValueChange}
          />
        </View>
        <Pressable style={[s.done,{backgroundColor:colors.accent}]} onPress={()=>setShow(false)}><Text style={s.doneText}>{t('done')}</Text></Pressable>
      </LiquidGlassModal>
    )}
    {show && Platform.OS !== 'ios' && (
      <DateTimePicker
        value={date}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        onValueChange={handleValueChange}
        onDismiss={()=>setShow(false)}
      />
    )}
  </View>;
}

const s=StyleSheet.create({
  field:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D0D5DD',borderRadius:14,paddingHorizontal:14,paddingVertical:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  value:{fontSize:17,color:'#101828',fontWeight:'600'},
  title:{fontSize:24,fontWeight:'900'},
  iosPicker:{borderRadius:20,marginTop:16,overflow:'hidden',borderWidth:1},
  done:{marginTop:16,paddingHorizontal:16,paddingVertical:14,borderRadius:15,alignItems:'center'},
  doneText:{fontWeight:'900',color:'#fff'}
});

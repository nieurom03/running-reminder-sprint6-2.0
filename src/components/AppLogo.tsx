import { Image, StyleSheet, View } from 'react-native';

export function AppLogo({size=88, withBackground=true}:{size?:number;withBackground?:boolean}){
  return <View style={[styles.wrap,{width:size,height:size},withBackground&&styles.bg]}>
    <Image source={require('../../assets/images/icon.png')} style={{width:size,height:size,borderRadius:Math.round(size*0.22)}} resizeMode="contain" />
  </View>;
}

const styles=StyleSheet.create({
  wrap:{alignItems:'center',justifyContent:'center'},
  bg:{backgroundColor:'#fff',borderRadius:24}
});

import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { AuroraCurtain } from './aurora-curtain';

export function AuroraCurtainScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <AuroraCurtain />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Matches the backdrop the shader paints, so there is no seam anywhere the
    // canvas does not cover.
    backgroundColor: '#0A0A0A',
  },
});

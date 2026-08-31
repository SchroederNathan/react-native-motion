import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants';

/**
 * What a sheet shows when it has no content to show — the grid while the
 * library loads or stays denied, the camera while it waits for permission.
 * One centred line of quiet text, shared so the two sheets read as the same
 * surface in the same state.
 */
export function SheetPlaceholder({ children }: { children: ReactNode }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  placeholderText: {
    color: COLORS.placeholder,
    fontSize: 15,
    textAlign: 'center',
  },
});

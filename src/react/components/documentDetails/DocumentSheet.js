import React from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';
import { resolveDocumentDetailsTheme } from './DocumentDetailsShell.styles';

/**
 * Bottom sheet (centered panel on wide screens) for secondary document data,
 * such as products and signers, so they don't take space from the document.
 */
const DocumentSheet = ({ visible, onClose, title, subtitle, theme, children }) => {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 768;
  const colors = resolveDocumentDetailsTheme(theme);

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            maxHeight: Math.round(height * (isWide ? 0.8 : 0.86)),
          },
          isWide ? styles.sheetWide : null,
        ]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}
            style={[styles.close, { backgroundColor: colors.background }]}>
            <Icon name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  sheetWide: {
    maxWidth: 760,
    alignSelf: 'center',
    borderRadius: 18,
    marginBottom: 32,
  },
  handleWrap: { alignItems: 'center', paddingTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, marginTop: 2 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  body: { flexShrink: 1 },
});

export default DocumentSheet;

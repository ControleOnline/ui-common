import { Platform, StyleSheet } from 'react-native';

const DEFAULT_THEME = {
  primary: '#1f6feb',
  onPrimary: '#ffffff',
  background: '#f3f5f8',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e5e9f0',
};

export const resolveDocumentDetailsTheme = theme => ({ ...DEFAULT_THEME, ...(theme || {}) });

const softShadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)' },
  default: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

const MAX_CONTENT_WIDTH = 920;

export const createDocumentDetailsStyles = (colors, isWide) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: isWide ? 24 : 12,
      paddingVertical: isWide ? 12 : 10,
    },
    headerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: 'center',
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      marginRight: 12,
    },
    headerText: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    title: {
      flexShrink: 1,
      fontSize: isWide ? 17 : 15,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    subtitle: { marginTop: 2, fontSize: 12.5, color: colors.muted },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText: { fontSize: 11.5, fontWeight: '700' },
    totalBox: { marginLeft: 12, alignItems: 'flex-end' },
    totalCaption: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    totalValue: { fontSize: isWide ? 18 : 15, fontWeight: '800', color: colors.text },

    body: { flex: 1 },
    bodyContent: {
      paddingHorizontal: isWide ? 24 : 0,
      paddingVertical: isWide ? 24 : 0,
      paddingBottom: isWide ? 32 : 16,
    },
    paper: {
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderRadius: isWide ? 14 : 0,
      paddingHorizontal: isWide ? 40 : 16,
      paddingVertical: isWide ? 36 : 16,
      minHeight: 240,
      ...(isWide ? softShadow : {}),
    },
    loading: { paddingVertical: 48, alignItems: 'center' },

    footer: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: isWide ? 24 : 12,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    },
    footerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      maxWidth: MAX_CONTENT_WIDTH,
      alignSelf: 'center',
    },
    secondaryActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 42,
      paddingHorizontal: isWide ? 14 : 12,
      marginRight: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    secondaryLabel: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: colors.text },
    countBadge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      marginLeft: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    countText: { fontSize: 11.5, fontWeight: '700', color: colors.text },
    primaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      paddingHorizontal: 18,
      borderRadius: 10,
      backgroundColor: colors.primary,
      ...(isWide ? { flex: 0, minWidth: 220, marginLeft: 'auto' } : {}),
    },
    primaryButtonDisabled: { opacity: 0.5 },
    primaryLabel: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: colors.onPrimary },
    footerNote: {
      marginTop: 6,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
  });

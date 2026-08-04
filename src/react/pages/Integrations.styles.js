import { Platform, StyleSheet } from 'react-native';
import { colors } from '@controleonline/../../src/styles/colors';
import { withOpacity } from '@controleonline/../../src/styles/branding';

const buildCardShadow = palette =>
  Platform.select({
    ios: {
      shadowColor: palette.text,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 3 },
    web: { boxShadow: `0 10px 24px ${withOpacity(palette.text, 0.08)}` },
  });

export const createStyles = (palette = colors) => {
  const cardShadow = buildCardShadow(palette);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
      gap: 18,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 10,
    },
    centerStateTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.text,
      textAlign: 'center',
    },
    centerStateText: {
      fontSize: 14,
      color: palette.mutedText,
      textAlign: 'center',
      lineHeight: 20,
    },
    pageHeader: {
      gap: 6,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.text,
      letterSpacing: -0.6,
    },
    pageSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.mutedText,
      maxWidth: 760,
    },
    integrationGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    integrationCard: {
      flexGrow: 1,
      flexBasis: '48%',
      minWidth: 220,
      borderRadius: 18,
      padding: 14,
      backgroundColor: palette.cardBackground,
      borderColor: palette.cardBorder,
      borderWidth: 1,
      ...cardShadow,
    },
    integrationTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 0,
    },
    integrationHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    integrationIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.cardIconBackground,
    },
    integrationLogo: {
      width: 24,
      height: 24,
    },
    integrationStatus: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: palette.badgeBackground,
      borderWidth: 1,
      borderColor: palette.badgeBorder,
    },
    integrationStatusText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.badgeText,
    },
    integrationTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.cardText,
      flexShrink: 1,
    },
  });
};

const styles = createStyles(colors);
export default styles;

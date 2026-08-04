import { StyleSheet } from 'react-native';
import {colors} from '@controleonline/../../src/styles/colors';
import {withOpacity} from '@controleonline/../../src/styles/branding';

const createStyles = (palette = colors) =>
  StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    paddingRight: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: withOpacity(palette.actionText || palette.white, 0.72),
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '800',
    color: palette.actionText || palette.white,
    letterSpacing: -0.6,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: withOpacity(palette.actionText || palette.white, 0.86),
  },
  badge: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: palette.cardIconBackground || palette.iconBackground || palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
});

export default createStyles;

import {Platform} from 'react-native';

// Only the homepage opts into this chrome; preserve all default navigation styles.
export default (styles, colors, appearance) => appearance !== 'soft' ? styles : {
  ...styles,
  dock: [styles.dock, {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: colors.navigationBorder,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
    ...(Platform.OS === 'web' ? {boxShadow: 'none'} : {}),
  }],
  itemsRow: [styles.itemsRow, {minHeight: 64, paddingHorizontal: 12, paddingVertical: 5}],
  item: [styles.item, {minHeight: 54, borderRadius: 12}],
  itemLabel: [styles.itemLabel, {fontSize: 11, fontWeight: '400'}],
  footerSlot: [styles.footerSlot, {
    borderTopWidth: 1,
    borderColor: colors.navigationBorder,
    paddingHorizontal: 0,
    minHeight: 28,
  }],
};

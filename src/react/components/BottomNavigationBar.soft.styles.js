import {Platform} from 'react-native';

// Shared compact chrome on every route; explicit legacy consumers can opt out.
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
  itemsRow: [styles.itemsRow, {minHeight: 56, paddingHorizontal: 8, paddingVertical: 4}],
  item: [styles.item, {minHeight: 46, paddingVertical: 3, borderRadius: 10}],
  iconWrap: [styles.iconWrap, {width: 22, height: 22, marginBottom: 2}],
  itemLabel: [styles.itemLabel, {fontSize: 11, lineHeight: 14, fontWeight: '400'}],
  footerSlot: [styles.footerSlot, {
    borderTopWidth: 1,
    borderColor: colors.navigationBorder,
    paddingHorizontal: 0,
    minHeight: 28,
  }],
};

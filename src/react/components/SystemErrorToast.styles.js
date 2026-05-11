import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  text: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});

export default styles;

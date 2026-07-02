import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  shell: {
    width: '100%',
  },
  container: {
    minHeight: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  containerExpanded: {
    paddingVertical: 6,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotWrap: {
    minWidth: 22,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    minWidth: 22,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  primaryText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 2,
  },
})

export default styles

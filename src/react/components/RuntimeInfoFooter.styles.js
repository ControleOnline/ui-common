import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
  },
  container: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  containerExpanded: {
    paddingVertical: 8,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 18,
  },
  statusDotWrap: {
    width: 18,
    minHeight: 18,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadingWrap: {
    width: 18,
    minHeight: 18,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  primaryText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 14,
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

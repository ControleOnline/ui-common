import {StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  content: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
});

export default styles;

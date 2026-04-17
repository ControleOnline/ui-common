import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});

export default styles;

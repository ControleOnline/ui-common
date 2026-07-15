import {StyleSheet} from 'react-native';
import {useStore} from '@store';

const css = () => {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors} = getters;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f4f4f4',
      paddingTop: 20,
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    button: {
      padding: 11,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 5,
      flex: 1,
      color: '#fff',
      backgroundColor: colors['primary'],
      flexDirection: 'row',
    },
    btnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    primary: {
      backgroundColor: colors['primary'],
      color: '#000000',
    },
    state: {
      container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      },
      displayContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
      },
      compactContainer: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
      },
      content: {
        width: '100%',
        maxWidth: 520,
        gap: 8,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 5,
      },
      displayContent: {
        width: '100%',
        maxWidth: 640,
        gap: 10,
        paddingVertical: 24,
        paddingHorizontal: 22,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 8,
      },
      compactContent: {
        width: '100%',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
      },
      loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
      },
      errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        elevation: 5,
      },
      messageText: {
        color: '#475569',
        textAlign: 'center',
      },
      errorText: {
        color: '#000',
        textAlign: 'center',
        fontWeight: '700',
      },
    },
  });
};

export default css;

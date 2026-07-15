import {StyleSheet} from 'react-native';
import {useStore} from '@store';
import globalStyles from '../styles/global';

const css = () => {
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors} = getters;

  const styles = StyleSheet.create({
    Settings: {
      container: {
        flex: 1,
        backgroundColor: '#fff',
      },
      scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
      },
      mainContainer: {
        flex: 1,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        paddingVertical: 5,
      },
      label: {
        flex: 0.5,
        fontSize: 14,
        color: '#333',
      },
      value: {
        flex: 0.5,
        fontSize: 14,
        color: '#000',
      },
      walletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        paddingVertical: 5,
      },
      walletValueContainer: {
        flex: 0.5,
        flexDirection: 'row',
        alignItems: 'center',
      },
      walletValue: {
        fontSize: 14,
        color: '#000',
        marginRight: 5,
      },
      picker: {
        height: 50,
        fontSize: 14,
        color: '#000',
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        marginTop: 5,
      },
    },
    primary: {
      color: colors.primary,
    },
  });

  return {styles, globalStyles: globalStyles()};
};

export default css;

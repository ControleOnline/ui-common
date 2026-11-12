import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '@store';

import createStyles from './SystemErrorToast.styles';
import {resolveSystemErrorMessage} from '@controleonline/ui-common/src/react/utils/systemErrorMessage';

const SystemErrorToast = ({error}) => {
  const themeStore = useStore('theme');
  const themeColors = themeStore?.getters?.colors || {};

  const palette = useMemo(
    () => ({
      // Theme `negative` is the fallback when the toastDanger* tokens are not defined.
      toastDangerBackground: themeColors.toastDangerBackground,
      toastDangerBorder: themeColors.toastDangerBorder || themeColors.negative,
      toastDangerIcon: themeColors.toastDangerIcon || themeColors.negative,
      toastDangerText: themeColors.toastDangerText || themeColors.negative,
    }),
    [
      themeColors.toastDangerBackground,
      themeColors.toastDangerBorder,
      themeColors.toastDangerIcon,
      themeColors.toastDangerText,
      themeColors.negative,
    ],
  );

  const styles = useMemo(() => createStyles(palette), [palette]);
  const message = useMemo(() => resolveSystemErrorMessage(error), [error]);

  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon name="error-outline" size={16} color={palette.toastDangerIcon} />
        </View>
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
};

export default SystemErrorToast;

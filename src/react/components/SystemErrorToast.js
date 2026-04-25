import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import styles from './SystemErrorToast.styles';

const resolveErrorMessage = error => {
  if (error === undefined || error === null) {
    return '';
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item || ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return String(
    error?.message ||
      error?.description ||
      error?.errmsg ||
      error?.error ||
      '',
  ).trim();
};

const SystemErrorToast = ({error}) => {
  const message = useMemo(() => resolveErrorMessage(error), [error]);

  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name="error-outline" size={15} color="#DC2626" />
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
};

export default SystemErrorToast;

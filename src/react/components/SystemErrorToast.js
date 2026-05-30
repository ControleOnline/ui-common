import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import styles from './SystemErrorToast.styles';
import {resolveSystemErrorMessage} from '@controleonline/ui-common/src/react/utils/systemErrorMessage';

const SystemErrorToast = ({error}) => {
  const message = useMemo(() => resolveSystemErrorMessage(error), [error]);

  if (!message) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Icon name="error-outline" size={16} color="#DC2626" />
        </View>
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
};

export default SystemErrorToast;

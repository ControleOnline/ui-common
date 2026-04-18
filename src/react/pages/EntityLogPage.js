import React, {useEffect, useMemo} from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import EntityLogContent from '@controleonline/ui-common/src/react/components/EntityLogContent';
import {extractEntityId} from '@controleonline/ui-common/src/react/utils/entityLog';
import {resolveStoreConfigByName} from '@controleonline/ui-common/src/react/utils/storeColumns';
import createStyles from './EntityLogPage.styles';

const buildEntityIri = (resourceEndpoint, entityId) => {
  const normalizedEndpoint = String(resourceEndpoint || '').replace(/^\/+|\/+$/g, '');
  if (!normalizedEndpoint || !entityId) {
    return '';
  }

  return `/${normalizedEndpoint}/${entityId}`;
};

export default function EntityLogPage({navigation, route}) {
  const entityId = useMemo(
    () => extractEntityId(route.params?.id),
    [route.params?.id],
  );
  const storeName = useMemo(
    () => String(route.params?.store || '').trim(),
    [route.params?.store],
  );
  const targetStore = useStore(storeName);
  const targetStoreConfig = useMemo(
    () => resolveStoreConfigByName(storeName),
    [storeName],
  );
  const styles = useMemo(() => createStyles(), []);
  const entityIri = useMemo(
    () => buildEntityIri(targetStoreConfig?.resourceEndpoint, entityId),
    [entityId, targetStoreConfig?.resourceEndpoint],
  );
  const loadEntity = targetStore?.actions?.get;
  const storeItem = targetStore?.getters?.item;
  const seedEntity = useMemo(() => {
    if (extractEntityId(storeItem) === entityId) {
      return storeItem;
    }

    return entityId
      ? {
          '@id': entityIri,
          id: entityId,
        }
      : null;
  }, [entityId, entityIri, storeItem]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Historico',
    });
  }, [navigation]);

  useEffect(() => {
    if (
      entityId &&
      typeof loadEntity === 'function' &&
      extractEntityId(storeItem) !== entityId
    ) {
      loadEntity(entityId);
    }
  }, [entityId, loadEntity, storeItem]);

  if (!entityId || !storeName) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.container} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <EntityLogContent
          entity={seedEntity}
          entityId={entityId}
          entityIri={entityIri}
        />
      </View>
    </SafeAreaView>
  );
}

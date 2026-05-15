import React, {useEffect, useMemo} from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import EntityLogContent from '@controleonline/ui-common/src/react/components/EntityLogContent';
import {
  extractEntityId,
  resolveEntityClassFromType,
} from '@controleonline/ui-common/src/react/utils/entityLog';
import {
  resolveStoreConfigByClassName,
  resolveStoreConfigByName,
} from '@controleonline/ui-common/src/react/utils/storeColumns';
import createStyles from './EntityLogPage.styles';

const buildEntityIri = (resourceEndpoint, entityId) => {
  const normalizedEndpoint = String(resourceEndpoint || '').replace(/^\/+|\/+$/g, '');
  if (!normalizedEndpoint || !entityId) {
    return '';
  }

  return `/${normalizedEndpoint}/${entityId}`;
};

const buildEntityTypeFromEndpoint = resourceEndpoint =>
  String(resourceEndpoint || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/ies$/i, 'y')
    .replace(/sses$/i, 'ss')
    .replace(/ses$/i, 'se')
    .replace(/s$/i, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join('');

export default function EntityLogPage({navigation, route}) {
  const entityId = useMemo(
    () => extractEntityId(route.params?.id),
    [route.params?.id],
  );
  const storeName = useMemo(
    () => String(route.params?.store || '').trim(),
    [route.params?.store],
  );
  const routeEntityClass = useMemo(
    () => String(route.params?.entityClass || '').trim(),
    [route.params?.entityClass],
  );
  const targetStoreConfig = useMemo(
    () =>
      storeName
        ? resolveStoreConfigByName(storeName)
        : resolveStoreConfigByClassName(routeEntityClass),
    [routeEntityClass, storeName],
  );
  const resolvedStoreName = targetStoreConfig?.storeName || storeName;
  const targetStore = useStore(resolvedStoreName || 'entity_log');
  const styles = useMemo(() => createStyles(), []);
  const resolvedEntityClass = useMemo(
    () =>
      routeEntityClass ||
      resolveEntityClassFromType(
        buildEntityTypeFromEndpoint(targetStoreConfig?.resourceEndpoint),
      ),
    [routeEntityClass, targetStoreConfig?.resourceEndpoint],
  );
  const entityIri = useMemo(
    () => buildEntityIri(targetStoreConfig?.resourceEndpoint, entityId),
    [entityId, targetStoreConfig?.resourceEndpoint],
  );
  const loadEntity = resolvedStoreName ? targetStore?.actions?.get : null;
  const storeItem = resolvedStoreName ? targetStore?.getters?.item : null;
  const seedEntity = useMemo(() => {
    if (extractEntityId(storeItem) === entityId) {
      return storeItem;
    }

    return entityId
      ? {
          ...(entityIri ? {'@id': entityIri} : {}),
          id: entityId,
        }
      : null;
  }, [entityId, entityIri, storeItem]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Histórico',
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

  if (!entityId || (!resolvedStoreName && !resolvedEntityClass)) {
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
          entityClass={resolvedEntityClass}
          entityId={entityId}
          entityIri={entityIri}
          entityLabel={String(route.params?.entityLabel || '').trim()}
        />
      </View>
    </SafeAreaView>
  );
}

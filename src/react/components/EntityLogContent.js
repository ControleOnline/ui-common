import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  buildEntityChildren,
  buildEntityKey,
  buildEntityLabel,
  buildEntitySummaryFields,
  formatLogFieldLabel,
  formatLogValue,
  resolveEntityImageUrl,
} from '@controleonline/ui-common/src/react/utils/entityLog';
import { resolveStoreConfigByEntity } from '@controleonline/ui-common/src/react/utils/storeColumns';
import createStyles, {
  buildEntityLogPalette,
} from './EntityLogContent.styles';
import {
  EntityLogBranch,
} from './EntityLogBranch';

const EntityLogContent = ({
  entity = null,
  entityClass = '',
  entityId = null,
  entityIri = '',
  entityLabel = '',
  relationConfig = {},
  theme,
}) => {
  const palette = useMemo(() => buildEntityLogPalette(theme), [theme]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const entityLogStore = useStore('entity_log');
  const entityLogActions = entityLogStore?.actions || {};
  const logCacheRef = useRef(new Map());
  const entityCacheRef = useRef(new Map());
  const [, setCacheVersion] = useState(0);

  const rootKey = useMemo(
    () => buildEntityKey(entityClass, entityId),
    [entityClass, entityId],
  );

  useEffect(() => {
    logCacheRef.current = new Map();
    entityCacheRef.current = new Map();
    setCacheVersion(version => version + 1);
  }, [rootKey]);

  const getLogsState = useCallback((className, rowId, targetEntityIri = '') => {
    const key = buildEntityKey(className, rowId, targetEntityIri);
    return logCacheRef.current.get(key) || {
      error: '',
      items: [],
      status: 'idle',
      totalItems: 0,
    };
  }, []);

  const getEntityState = useCallback((className, rowId, seedEntity = null, targetEntityIri = '') => {
    const key = buildEntityKey(
      className,
      rowId,
      targetEntityIri || seedEntity?.['@id'] || '',
    );
    return entityCacheRef.current.get(key) || {
      error: '',
      item: seedEntity,
      status: seedEntity ? 'seed' : 'idle',
    };
  }, []);

  const fetchLogs = useCallback(async ({ className, rowId, entityIri: targetEntityIri = '' }) => {
    const key = buildEntityKey(className, rowId, targetEntityIri);
    if (!key) {
      return;
    }

    const current = logCacheRef.current.get(key);
    if (current?.status === 'loading' || current?.status === 'success') {
      return;
    }

    logCacheRef.current.set(key, {
      error: '',
      items: current?.items || [],
      status: 'loading',
      totalItems: current?.totalItems || 0,
    });
    setCacheVersion(version => version + 1);

    try {
      const response = await entityLogActions.getTimeline({
        ...(className ? { class: className } : {}),
        ...(targetEntityIri ? { entity: targetEntityIri } : {}),
        row: rowId,
      });
      const items = Array.isArray(response?.items) ? response.items : [];
      const totalItems = Number(response?.totalItems || items.length || 0);

      logCacheRef.current.set(key, {
        error: '',
        items,
        status: 'success',
        totalItems,
      });
      setCacheVersion(version => version + 1);
    } catch (error) {
      logCacheRef.current.set(key, {
        error: error?.message || 'Erro ao buscar logs.',
        items: [],
        status: 'error',
        totalItems: 0,
      });
      setCacheVersion(version => version + 1);
    }
  }, [entityLogActions]);

  const fetchEntityDetails = useCallback(async ({
    className,
    rowId,
    entity: seedEntity,
    entityIri: explicitEntityIri = '',
  }) => {
    const key = buildEntityKey(
      className,
      rowId,
      explicitEntityIri || seedEntity?.['@id'] || '',
    );
    if (!key) {
      return;
    }

    const current = entityCacheRef.current.get(key);
    if (current?.status === 'loading' || current?.status === 'success') {
      return;
    }

    const resolvedEntityIri =
      (typeof seedEntity?.['@id'] === 'string' && seedEntity['@id'].trim()) ||
      (typeof explicitEntityIri === 'string' ? explicitEntityIri.trim() : '');

    if (!resolvedEntityIri) {
      entityCacheRef.current.set(key, {
        error: 'Entidade sem identificador para consulta.',
        item: seedEntity,
        status: 'error',
      });
      setCacheVersion(version => version + 1);
      return;
    }

    // O cache evita recarregar o mesmo detalhe toda vez que o usuario expande o ramo.
    entityCacheRef.current.set(key, {
      error: '',
      item: current?.item || seedEntity,
      status: 'loading',
    });
    setCacheVersion(version => version + 1);

    try {
      const item = await entityLogActions.getEntityDetail(resolvedEntityIri);

      entityCacheRef.current.set(key, {
        error: '',
        item,
        status: 'success',
      });
      setCacheVersion(version => version + 1);
    } catch (error) {
      entityCacheRef.current.set(key, {
        error: error?.message || 'Erro ao buscar detalhes.',
        item: current?.item || seedEntity,
        status: 'error',
      });
      setCacheVersion(version => version + 1);
    }
  }, [entityLogActions]);

  const resolvedEntityLabel = useMemo(
    () =>
      entityLabel ||
      buildEntityLabel({
        entity,
        className: entityClass,
        id: entityId,
      }),
    [entity, entityClass, entityId, entityLabel],
  );

  if (!entityId || (!entityClass && !entityIri)) {
    return null;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}>
      <EntityLogBranch
        autoLoad
        entity={entity}
        entityClass={entityClass}
        entityId={entityId}
        entityIri={entityIri}
        entityLabel={resolvedEntityLabel}
        fetchEntityDetails={fetchEntityDetails}
        fetchLogs={fetchLogs}
        getEntityState={getEntityState}
        getLogsState={getLogsState}
        relationConfig={relationConfig}
        styles={styles}
        trailKeys={[]}
      />
    </ScrollView>
  );
};

export default EntityLogContent;

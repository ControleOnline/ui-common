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

const ACTION_META = {
  insert: {
    color: '#16A34A',
    icon: 'add-circle',
    label: 'Criado',
  },
  update: {
    color: '#2563EB',
    icon: 'edit-note',
    label: 'Alterado',
  },
  delete: {
    color: '#DC2626',
    icon: 'delete-outline',
    label: 'Removido',
  },
  info: {
    color: '#0F766E',
    icon: 'info-outline',
    label: 'Info',
  },
  notice: {
    color: '#0369A1',
    icon: 'notifications-none',
    label: 'Aviso',
  },
  warning: {
    color: '#D97706',
    icon: 'warning-amber',
    label: 'Alerta',
  },
  error: {
    color: '#DC2626',
    icon: 'error-outline',
    label: 'Erro',
  },
  critical: {
    color: '#991B1B',
    icon: 'report-gmailerrorred',
    label: 'Critico',
  },
  debug: {
    color: '#475569',
    icon: 'bug-report',
    label: 'Debug',
  },
};

const GENERIC_PAYLOAD_META_FIELDS = new Set(['channel', 'context', 'level', 'message']);

const buildContextEntries = context => {
  if (!context) {
    return [];
  }

  if (Array.isArray(context)) {
    return context.map((value, index) => [`item_${index + 1}`, value]);
  }

  if (typeof context === 'object') {
    return Object.entries(context);
  }

  return [['context', context]];
};

const formatContextValue = value => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Nao';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const resolvePayload = log => {
  if (log?.payload && typeof log.payload === 'object' && !Array.isArray(log.payload)) {
    return log.payload;
  }

  if (typeof log?.object === 'string') {
    try {
      const parsed = JSON.parse(log.object);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

// O card de resumo mostra os dados essenciais da entidade expandida.

import {
  EntitySummaryCard,
  renderChangeValue,
  LogCard,
} from './EntityLogCards';

export const EntityLogBranch = ({
  autoLoad = true,
  entity,
  entityClass,
  entityId,
  entityIri = '',
  entityLabel,
  fetchEntityDetails,
  getEntityState,
  fetchLogs,
  getLogsState,
  onFocusBranch,
  parentOffset = 0,
  relationConfig,
  styles,
  trailKeys,
}) => {
  const branchKey = useMemo(
    () => buildEntityKey(entityClass, entityId),
    [entityClass, entityId],
  );
  const [expandedRelations, setExpandedRelations] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [branchOffset, setBranchOffset] = useState(parentOffset);
  const [nestedOffsets, setNestedOffsets] = useState({});
  const logsState = getLogsState(entityClass, entityId);
  const detailState = getEntityState(entityClass, entityId, entity);
  const resolvedEntity = useMemo(() => {
    if (!detailState?.item || typeof detailState.item !== 'object') {
      return entity;
    }

    if (!entity || typeof entity !== 'object') {
      return detailState.item;
    }

    // Mantem o seed local, mas o detalhe remoto prevalece quando trouxer mais dados.
    return {
      ...entity,
      ...detailState.item,
    };
  }, [detailState?.item, entity]);
  const isNestedBranch = trailKeys.length > 0;
  const storeConfig = useMemo(
    () =>
      resolveStoreConfigByEntity({
        entity: resolvedEntity,
        entityIri,
      }),
    [entityIri, resolvedEntity],
  );
  const storeColumns = storeConfig?.columns || [];
  const storeName = storeConfig?.storeName || '';

  const branchTitle = useMemo(
    () =>
      entityLabel ||
      buildEntityLabel({
        entity: resolvedEntity,
        className: entityClass,
        id: entityId,
      }),
    [resolvedEntity, entityClass, entityId, entityLabel],
  );

  const children = useMemo(
    () =>
      buildEntityChildren(resolvedEntity, {
        relationConfig,
        ancestryKeys: [...trailKeys, branchKey],
      }),
    [branchKey, resolvedEntity, relationConfig, trailKeys],
  );

  useEffect(() => {
    if (!autoLoad || !entityClass || !entityId) {
      return;
    }

    void fetchLogs({
      className: entityClass,
      rowId: entityId,
    });
    void fetchEntityDetails({
      className: entityClass,
      rowId: entityId,
      entity,
      entityIri,
    });
  }, [
    autoLoad,
    entityClass,
    entityId,
    entity,
    entityIri,
    fetchEntityDetails,
    fetchLogs,
  ]);

  useEffect(() => {
    if (!isNestedBranch || !branchOffset || typeof onFocusBranch !== 'function') {
      return;
    }

    // Depois de montar um ramo novo, trazemos o topo dele para a viewport.
    const timeoutId = setTimeout(() => {
      onFocusBranch(Math.max(0, branchOffset - 18));
    }, 120);

    return () => clearTimeout(timeoutId);
  }, [branchOffset, isNestedBranch, onFocusBranch]);

  const toggleRelation = useCallback(key => {
    setExpandedRelations(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    if (typeof onFocusBranch === 'function') {
      setTimeout(() => {
        onFocusBranch(Math.max(0, branchOffset - 18));
      }, 60);
    }
  }, [branchOffset, onFocusBranch]);

  const toggleItem = useCallback(key => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    if (typeof onFocusBranch === 'function') {
      setTimeout(() => {
        onFocusBranch(Math.max(0, branchOffset - 18));
      }, 60);
    }
  }, [branchOffset, onFocusBranch]);

  const registerNestedOffset = useCallback((key, layoutY) => {
    setNestedOffsets(prev => {
      const nextOffset = branchOffset + layoutY;
      if (prev[key] === nextOffset) {
        return prev;
      }

      return {
        ...prev,
        [key]: nextOffset,
      };
    });
  }, [branchOffset]);

  return (
    <View
      style={styles.branchCard}
      onLayout={event => {
        setBranchOffset(parentOffset + event.nativeEvent.layout.y);
      }}>
      <View style={styles.branchHeader}>
        <View style={styles.branchHeaderRow}>
          <View style={styles.branchTitleWrap}>
            <Text style={styles.branchTitle}>{branchTitle}</Text>
            <Text style={styles.branchMeta}>
              {entityClass?.split('\\').pop()} #{entityId || '--'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.branchBody}>
        <EntitySummaryCard
          columns={storeColumns}
          detailState={detailState}
          entity={resolvedEntity}
          entityClass={entityClass}
          storeName={storeName}
          styles={styles}
        />

        {!!children.length && (
          <View style={styles.relationSection}>
            <Text style={styles.sectionTitle}>Relacionamentos</Text>

            {children.map(candidate => (
              <View key={`${branchKey}-${candidate.key}`} style={styles.relationCollectionWrap}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => toggleRelation(candidate.key)}
                  style={styles.relationButton}>
                  <View style={styles.relationButtonHeader}>
                    <Text style={styles.relationButtonLabel}>
                      {candidate.label}
                    </Text>
                    <Icon
                      name={expandedRelations[candidate.key] ? 'expand-less' : 'expand-more'}
                      size={20}
                      color="#64748B"
                    />
                  </View>
                  <Text style={styles.relationButtonMeta}>
                    {candidate.isCollection
                      ? `${candidate.items.length} item(ns)`
                      : candidate.items[0]?.label || 'Ver histórico'}
                  </Text>
                </TouchableOpacity>

                {expandedRelations[candidate.key] && (
                  <View
                    style={styles.nestedWrap}
                    onLayout={event =>
                      registerNestedOffset(candidate.key, event.nativeEvent.layout.y)
                    }>
                    {candidate.items.map(item => (
                      <View key={item.key} style={styles.relationCollectionWrap}>
                        {candidate.isCollection ? (
                          <>
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => toggleItem(item.key)}
                              style={styles.relationButton}>
                              <View style={styles.relationButtonHeader}>
                                <Text style={styles.relationButtonLabel}>
                                  {item.label}
                                </Text>
                                <Icon
                                  name={expandedItems[item.key] ? 'expand-less' : 'expand-more'}
                                  size={20}
                                  color="#64748B"
                                />
                              </View>
                              <Text style={styles.relationButtonMeta}>
                                {item.className?.split('\\').pop()} #{item.id}
                              </Text>
                            </TouchableOpacity>

                            {expandedItems[item.key] && (
                              <View
                                style={styles.nestedWrap}
                                onLayout={event =>
                                  registerNestedOffset(item.key, event.nativeEvent.layout.y)
                                }>
                                <EntityLogBranch
                                  autoLoad
                                  entity={item.entity}
                                  entityClass={item.className}
                                  entityId={item.id}
                                  entityIri={item.iri}
                                  entityLabel={item.label}
                                  fetchEntityDetails={fetchEntityDetails}
                                  fetchLogs={fetchLogs}
                                  getEntityState={getEntityState}
                                  getLogsState={getLogsState}
                                  onFocusBranch={onFocusBranch}
                                  parentOffset={nestedOffsets[item.key] || branchOffset}
                                  relationConfig={relationConfig}
                                  styles={styles}
                                  trailKeys={[...trailKeys, branchKey]}
                                />
                              </View>
                            )}
                          </>
                        ) : (
                          <View
                            style={styles.nestedWrap}
                            onLayout={event =>
                              registerNestedOffset(item.key, event.nativeEvent.layout.y)
                            }>
                            <EntityLogBranch
                              autoLoad
                              entity={item.entity}
                              entityClass={item.className}
                              entityId={item.id}
                              entityIri={item.iri}
                              entityLabel={item.label}
                              fetchEntityDetails={fetchEntityDetails}
                              fetchLogs={fetchLogs}
                              getEntityState={getEntityState}
                              getLogsState={getLogsState}
                              onFocusBranch={onFocusBranch}
                              parentOffset={nestedOffsets[item.key] || branchOffset}
                              relationConfig={relationConfig}
                              styles={styles}
                              trailKeys={[...trailKeys, branchKey]}
                            />
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.relationSection}>
          <Text style={styles.sectionTitle}>Timeline</Text>

          {logsState.status === 'loading' ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.stateText}>Carregando historico...</Text>
            </View>
          ) : null}

          {logsState.status === 'error' ? (
            <View style={styles.stateBox}>
              <Icon name="error-outline" size={20} color="#DC2626" />
              <Text style={styles.stateTitle}>Nao foi possivel carregar</Text>
              <Text style={styles.stateText}>{logsState.error || 'Erro desconhecido'}</Text>
            </View>
          ) : null}

          {logsState.status === 'success' && !logsState.items.length ? (
            <View style={styles.stateBox}>
              <Icon name="history-toggle-off" size={22} color="#94A3B8" />
              <Text style={styles.stateTitle}>Nenhum log encontrado</Text>
              <Text style={styles.stateText}>
                Ainda nao existem registros para esta entidade.
              </Text>
            </View>
          ) : null}

          {logsState.status === 'success' && !!logsState.items.length ? (
            <View style={styles.logList}>
              {logsState.items.map(log => (
                <LogCard
                  key={log?.id || `${branchKey}-${log?.createdAt}`}
                  columns={storeColumns}
                  log={log}
                  rowContext={resolvedEntity}
                  storeName={storeName}
                  styles={styles}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};


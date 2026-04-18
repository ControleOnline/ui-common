import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import createStyles, {
  buildEntityLogPalette,
} from './EntityLogModal.styles';

const DEFAULT_ITEMS_PER_PAGE = 100;

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
const EntitySummaryCard = ({ detailState, entity, entityClass, styles }) => {
  const summaryFields = useMemo(
    () => buildEntitySummaryFields({ entity, className: entityClass }),
    [entity, entityClass],
  );
  const imageUrl = useMemo(() => resolveEntityImageUrl(entity), [entity]);

  if (detailState?.status === 'loading' && !imageUrl && !summaryFields.length) {
    return (
      <View style={styles.entityStateCard}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.entityStateText}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (
    detailState?.status !== 'loading' &&
    detailState?.status !== 'success' &&
    !imageUrl &&
    !summaryFields.length
  ) {
    return null;
  }

  return (
    <View style={styles.entitySummaryCard}>
      <View style={styles.entitySummaryHeader}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        {detailState?.status === 'loading' ? (
          <Text style={styles.entityStateText}>Atualizando...</Text>
        ) : null}
      </View>

      <View style={styles.entitySummaryBody}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.entityPreviewImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.entitySummaryGrid}>
          {summaryFields.length ? (
            summaryFields.map(field => (
              <View key={field.key} style={styles.entitySummaryField}>
                <Text style={styles.entitySummaryLabel}>{field.label}</Text>
                <Text style={styles.entitySummaryValue}>{field.value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInlineText}>Sem dados resumidos.</Text>
          )}
        </View>
      </View>

      {detailState?.status === 'error' ? (
        <Text style={styles.entityStateErrorText}>
          {detailState?.error || 'Nao foi possivel carregar os detalhes.'}
        </Text>
      ) : null}
    </View>
  );
};

const getActionMeta = action => ACTION_META[String(action || '').toLowerCase()] || {
  color: '#64748B',
  icon: 'history',
  label: 'Evento',
};

const renderChangeValue = (styles, title, value) => (
  <View style={styles.changeValueBox}>
    <Text style={styles.changeValueTitle}>{title}</Text>
    <Text style={styles.changeValueText}>{formatLogValue(value)}</Text>
  </View>
);

const LogCard = ({ log, styles }) => {
  const payload = useMemo(() => resolvePayload(log), [log]);
  const actionMeta = useMemo(() => getActionMeta(log?.action), [log?.action]);
  const entries = useMemo(() => Object.entries(payload || {}), [payload]);
  const logDate = useMemo(
    () => Formatter.formatDateYmdTodmY(log?.createdAt, true),
    [log?.createdAt],
  );

  return (
    <View style={styles.logCard}>
      <View style={styles.logMetaRow}>
        <View style={styles.logMetaLeft}>
          <View
            style={[
              styles.actionBadge,
              {
                borderColor: `${actionMeta.color}44`,
                backgroundColor: `${actionMeta.color}14`,
              },
            ]}>
            <Icon name={actionMeta.icon} size={14} color={actionMeta.color} />
            <Text style={[styles.actionText, { color: actionMeta.color }]}>
              {actionMeta.label}
            </Text>
          </View>

          <Text style={styles.logDate}>{logDate || 'Sem data'}</Text>
        </View>

        {!!log?.userDisplayName && (
          <Text style={styles.logUser}>{log.userDisplayName}</Text>
        )}
      </View>

      {entries.length ? (
        entries.map(([field, value]) => {
          const isDiffValue =
            Array.isArray(value) &&
            value.length === 2 &&
            Object.prototype.hasOwnProperty.call(value, 0) &&
            Object.prototype.hasOwnProperty.call(value, 1);

          return (
            <View key={`${log?.id || 'log'}-${field}`} style={styles.changeRow}>
              <Text style={styles.changeLabel}>{formatLogFieldLabel(field)}</Text>

              {isDiffValue ? (
                <View style={styles.changeValuesRow}>
                  {renderChangeValue(styles, 'Antes', value[0])}
                  <View style={styles.arrowWrap}>
                    <Icon name="east" size={16} color="#94A3B8" />
                  </View>
                  {renderChangeValue(styles, 'Depois', value[1])}
                </View>
              ) : (
                renderChangeValue(
                  styles,
                  log?.action === 'delete' ? 'Valor removido' : 'Valor',
                  value,
                )
              )}
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyInlineText}>Sem detalhes adicionais.</Text>
      )}
    </View>
  );
};

const EntityLogBranch = ({
  autoLoad = true,
  classMap,
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

    // Mantem campos locais do objeto atual, mas completa com o detalhe remoto.
    return {
      ...detailState.item,
      ...entity,
    };
  }, [detailState?.item, entity]);
  const isNestedBranch = trailKeys.length > 0;

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
        classMap,
        ancestryKeys: [...trailKeys, branchKey],
      }),
    [branchKey, classMap, resolvedEntity, relationConfig, trailKeys],
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
          detailState={detailState}
          entity={resolvedEntity}
          entityClass={entityClass}
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
                      : candidate.items[0]?.label || 'Ver historico'}
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
                                  classMap={classMap}
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
                              classMap={classMap}
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
                <LogCard key={log?.id || `${branchKey}-${log?.createdAt}`} log={log} styles={styles} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const EntityLogModal = ({
  classMap = {},
  entity = null,
  entityClass = '',
  entityId = null,
  entityIri = '',
  entityLabel = '',
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  onClose,
  relationConfig = {},
  theme,
  title = 'Historico',
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => buildEntityLogPalette(theme), [theme]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const modalBottomInset = Math.max(insets?.bottom || 0, 8);
  const entityLogStore = useStore('entity_log');
  const entityLogActions = entityLogStore?.actions || {};
  const logCacheRef = useRef(new Map());
  const entityCacheRef = useRef(new Map());
  const scrollRef = useRef(null);
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

  const getLogsState = useCallback((className, rowId) => {
    const key = buildEntityKey(className, rowId);
    return logCacheRef.current.get(key) || {
      error: '',
      items: [],
      status: 'idle',
      totalItems: 0,
    };
  }, []);

  const getEntityState = useCallback((className, rowId, seedEntity = null) => {
    const key = buildEntityKey(className, rowId);
    return entityCacheRef.current.get(key) || {
      error: '',
      item: seedEntity,
      status: seedEntity ? 'seed' : 'idle',
    };
  }, []);

  const fetchLogs = useCallback(async ({ className, rowId }) => {
    const key = buildEntityKey(className, rowId);
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
        itemsPerPage,
        class: className,
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
  }, [entityLogActions, itemsPerPage]);

  const fetchEntityDetails = useCallback(async ({
    className,
    rowId,
    entity: seedEntity,
    entityIri: explicitEntityIri = '',
  }) => {
    const key = buildEntityKey(className, rowId);
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

  const focusBranch = useCallback(offset => {
    if (!scrollRef.current || typeof scrollRef.current.scrollTo !== 'function') {
      return;
    }

    scrollRef.current.scrollTo({
      y: Math.max(0, Number(offset || 0)),
      animated: true,
    });
  }, []);

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

  if (!visible || !entityClass || !entityId) {
    return null;
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen">
      <View style={styles.modalSheetRoot}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalSheetBackdrop}
          onPress={onClose}
        />

        <View style={styles.modalSheetWrap}>
          <View style={[styles.modalCard, { paddingBottom: 14 + modalBottomInset }]}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>{title}</Text>
                <Text style={styles.title}>{resolvedEntityLabel}</Text>
                <Text style={styles.subtitle}>
                  {entityClass?.split('\\').pop()} #{entityId}
                </Text>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 20 + modalBottomInset },
              ]}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              <EntityLogBranch
                autoLoad={visible}
                classMap={classMap}
                entity={entity}
                entityClass={entityClass}
                entityId={entityId}
                entityIri={entityIri}
                entityLabel={resolvedEntityLabel}
                fetchEntityDetails={fetchEntityDetails}
                fetchLogs={fetchLogs}
                getEntityState={getEntityState}
                getLogsState={getLogsState}
                onFocusBranch={focusBranch}
                parentOffset={0}
                relationConfig={relationConfig}
                styles={styles}
                trailKeys={[]}
              />
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EntityLogModal;

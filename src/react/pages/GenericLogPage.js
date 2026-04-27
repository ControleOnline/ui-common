import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '@store';
import CompactFilterSelector from '@controleonline/ui-common/src/react/components/filters/CompactFilterSelector';
import DateShortcutFilter from '@controleonline/ui-common/src/react/components/filters/DateShortcutFilter';
import EntityLogContent from '@controleonline/ui-common/src/react/components/EntityLogContent';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {resolveStoreConfigByClassName} from '@controleonline/ui-common/src/react/utils/storeColumns';
import {
  getDateRange,
  resolveDateRangeSummary,
} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';
import createStyles from './GenericLogPage.styles';

const TYPE_META = {
  entity: {
    color: '#2563EB',
    icon: 'account-tree',
    label: 'Entidade',
  },
  operation_patterns: {
    color: '#D97706',
    icon: 'schema',
    label: 'Padrao operacional',
  },
  generic: {
    color: '#0F766E',
    icon: 'notes',
    label: 'Generico',
  },
};

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

const KNOWN_LOG_TYPES = ['entity', 'operation_patterns', 'generic'];

const buildEntityIri = (resourceEndpoint, entityId) => {
  const normalizedEndpoint = String(resourceEndpoint || '').replace(/^\/+|\/+$/g, '');
  if (!normalizedEndpoint || !entityId) {
    return '';
  }

  return `/${normalizedEndpoint}/${entityId}`;
};

const normalizeText = value => String(value || '').trim();
const normalizeFilterKey = value => normalizeText(value).toLowerCase();

const formatHumanLabel = value =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getShortClassName = className => {
  const parts = normalizeText(className).split('\\').filter(Boolean);
  return parts[parts.length - 1] || normalizeText(className);
};

const formatClassLabel = className => {
  const shortClassName = getShortClassName(className);
  return formatHumanLabel(shortClassName) || shortClassName || 'Sem classe';
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

const formatValue = value => {
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

const getTypeMeta = type => TYPE_META[normalizeFilterKey(type)] || {
  color: '#64748B',
  icon: 'history',
  label: formatHumanLabel(type) || 'Outro',
};

const getActionMeta = action => ACTION_META[normalizeFilterKey(action)] || {
  color: '#64748B',
  icon: 'history',
  label: 'Evento',
};

const buildLogKey = log =>
  String(log?.id || `${log?.type || 'log'}-${log?.class || 'no-class'}-${log?.row || 'no-row'}-${log?.createdAt || 'no-date'}`);

const buildTypeOptions = items => {
  const typeKeys = new Set(KNOWN_LOG_TYPES);
  items.forEach(log => {
    const key = normalizeFilterKey(log?.type);
    if (key) {
      typeKeys.add(key);
    }
  });

  return [
    {key: 'all', label: 'Todos'},
    ...Array.from(typeKeys).map(key => ({
      key,
      label: getTypeMeta(key).label,
    })),
  ];
};

const buildQuickClassOptions = items => {
  const counts = new Map();

  items.forEach(log => {
    if (normalizeFilterKey(log?.type) !== 'entity' || !normalizeText(log?.class)) {
      return;
    }

    const key = getShortClassName(log.class);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], 'pt-BR');
    })
    .slice(0, 12)
    .map(([value]) => ({
      label: formatClassLabel(value),
      value,
    }));
};

function MetaBadge({meta, styles}) {
  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: `${meta.color}44`,
          backgroundColor: `${meta.color}14`,
        },
      ]}>
      <Icon name={meta.icon} size={14} color={meta.color} />
      <Text style={[styles.badgeText, {color: meta.color}]}>
        {meta.label}
      </Text>
    </View>
  );
}

function PayloadFieldList({entries, styles}) {
  if (!entries.length) {
    return null;
  }

  return (
    <View style={styles.payloadList}>
      {entries.map(([field, value]) => (
        <View key={field} style={styles.payloadRow}>
          <Text style={styles.payloadLabel}>{formatHumanLabel(field) || field}</Text>
          <View style={styles.payloadValueBox}>
            <Text style={styles.payloadValue}>{formatValue(value)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function EntityLogCard({
  log,
  isExpanded,
  onOpenFullHistory,
  onToggleExpand,
  styles,
}) {
  const payload = useMemo(() => resolvePayload(log), [log]);
  const payloadEntries = useMemo(() => Object.entries(payload || {}), [payload]);
  const typeMeta = useMemo(() => getTypeMeta(log?.type), [log?.type]);
  const actionMeta = useMemo(() => getActionMeta(log?.action), [log?.action]);
  const logDate = useMemo(
    () => Formatter.formatDateYmdTodmY(log?.createdAt, true),
    [log?.createdAt],
  );
  const entityTitle = useMemo(
    () => `${formatClassLabel(log?.class)} #${log?.row || '--'}`,
    [log?.class, log?.row],
  );
  const previewFields = useMemo(
    () => payloadEntries.slice(0, 4).map(([field]) => formatHumanLabel(field) || field),
    [payloadEntries],
  );
  const storeConfig = useMemo(
    () => resolveStoreConfigByClassName(log?.class),
    [log?.class],
  );
  const entityIri = useMemo(
    () => buildEntityIri(storeConfig?.resourceEndpoint, log?.row),
    [log?.row, storeConfig?.resourceEndpoint],
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgesRow}>
          <MetaBadge meta={typeMeta} styles={styles} />
          <MetaBadge meta={actionMeta} styles={styles} />
        </View>

        <Text style={styles.date}>{logDate || 'Sem data'}</Text>
      </View>

      <Text style={styles.entityTitle}>{entityTitle}</Text>

      {!!log?.userDisplayName && (
        <Text style={styles.metaText}>Usuario: {log.userDisplayName}</Text>
      )}

      {!!previewFields.length ? (
        <Text style={styles.previewText}>
          Campos afetados: {previewFields.join(', ')}
        </Text>
      ) : (
        <Text style={styles.previewText}>Sem diff detalhado registrado neste evento.</Text>
      )}

      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onToggleExpand}
          style={styles.secondaryActionButton}>
          <Icon
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={18}
            color="#0F172A"
          />
          <Text style={styles.secondaryActionButtonText}>
            {isExpanded ? 'Recolher timeline' : 'Expandir timeline'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onOpenFullHistory}
          style={styles.primaryActionButton}>
          <Icon name="open-in-new" size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionButtonText}>Abrir historico</Text>
        </TouchableOpacity>
      </View>

      {isExpanded ? (
        <View style={styles.expandedEntityWrap}>
          <EntityLogContent
            entity={entityIri ? {'@id': entityIri, id: log?.row} : {id: log?.row}}
            entityClass={normalizeText(log?.class)}
            entityId={Number(log?.row) || null}
            entityIri={entityIri}
            entityLabel={entityTitle}
            itemsPerPage={40}
          />
        </View>
      ) : null}
    </View>
  );
}

function OtherLogCard({log, styles}) {
  const payload = useMemo(() => resolvePayload(log), [log]);
  const typeMeta = useMemo(() => getTypeMeta(log?.type), [log?.type]);
  const actionMeta = useMemo(() => getActionMeta(log?.action), [log?.action]);
  const logDate = useMemo(
    () => Formatter.formatDateYmdTodmY(log?.createdAt, true),
    [log?.createdAt],
  );
  const payloadEntries = useMemo(
    () => Object.entries(payload || {}).filter(([field]) => field !== 'message'),
    [payload],
  );
  const primaryMessage = useMemo(() => {
    const payloadMessage =
      typeof payload?.message === 'string' ? payload.message.trim() : '';

    if (payloadMessage) {
      return payloadMessage;
    }

    return normalizeText(log?.action) || 'Sem descricao registrada.';
  }, [log?.action, payload?.message]);
  const rawAction = normalizeText(log?.action);
  const showRawAction = rawAction && rawAction !== actionMeta.label && rawAction !== primaryMessage;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgesRow}>
          <MetaBadge meta={typeMeta} styles={styles} />
          <MetaBadge meta={actionMeta} styles={styles} />
        </View>

        <Text style={styles.date}>{logDate || 'Sem data'}</Text>
      </View>

      {!!normalizeText(log?.class) && (
        <Text style={styles.classTitle}>{formatClassLabel(log.class)}</Text>
      )}

      {!!log?.userDisplayName && (
        <Text style={styles.metaText}>Usuario: {log.userDisplayName}</Text>
      )}

      <View style={styles.messageBox}>
        <Text style={styles.message}>{primaryMessage}</Text>
      </View>

      {showRawAction ? (
        <Text style={styles.metaText}>Acao registrada: {rawAction}</Text>
      ) : null}

      <PayloadFieldList entries={payloadEntries} styles={styles} />
    </View>
  );
}

export default function GenericLogPage({navigation}) {
  const styles = useMemo(() => createStyles(), []);
  const entityLogStore = useStore('entity_log');
  const entityLogActions = entityLogStore?.actions || {};
  const [logsState, setLogsState] = useState({
    error: '',
    items: [],
    status: 'idle',
    totalItems: 0,
  });
  const [selectedType, setSelectedType] = useState('all');
  const [dateFilterKey, setDateFilterKey] = useState('all');
  const [customRange, setCustomRange] = useState({
    from: '',
    to: '',
  });
  const [classFilterInput, setClassFilterInput] = useState('');
  const [appliedClassFilter, setAppliedClassFilter] = useState('');
  const [expandedEntityKey, setExpandedEntityKey] = useState('');

  const loadLogs = useCallback(async () => {
    const {after, before} = getDateRange(dateFilterKey, customRange, {
      useCurrentMoment: true,
    });

    setLogsState(current => ({
      ...current,
      error: '',
      status: 'loading',
    }));

    try {
      const response = await entityLogActions.getTimeline({
        itemsPerPage: 200,
        ...(selectedType !== 'all' ? {type: selectedType} : {}),
        ...(after ? {'createdAt[after]': after} : {}),
        ...(before ? {'createdAt[before]': before} : {}),
        ...(appliedClassFilter ? {class: appliedClassFilter} : {}),
      });

      const items = Array.isArray(response?.items) ? response.items : [];
      setLogsState({
        error: '',
        items,
        status: 'success',
        totalItems: Number(response?.totalItems || items.length || 0),
      });
    } catch (error) {
      setLogsState({
        error: error?.message || 'Erro ao carregar logs.',
        items: [],
        status: 'error',
        totalItems: 0,
      });
    }
  }, [appliedClassFilter, customRange, dateFilterKey, entityLogActions, selectedType]);

  const typeOptions = useMemo(
    () => buildTypeOptions(logsState.items),
    [logsState.items],
  );

  const quickClassOptions = useMemo(
    () => buildQuickClassOptions(logsState.items),
    [logsState.items],
  );

  const activeDateSummary = useMemo(
    () => resolveDateRangeSummary(dateFilterKey, customRange, {useCurrentMoment: true}),
    [customRange, dateFilterKey],
  );

  const hasActiveFilters = useMemo(
    () =>
      selectedType !== 'all' ||
      Boolean(appliedClassFilter) ||
      Boolean(activeDateSummary),
    [activeDateSummary, appliedClassFilter, selectedType],
  );

  const resultsSummary = useMemo(() => {
    const loadedCount = logsState.items.length;
    const totalCount = logsState.totalItems || loadedCount;
    const countLabel =
      loadedCount === totalCount
        ? `${loadedCount} logs`
        : `${loadedCount} de ${totalCount} logs`;

    if (!activeDateSummary) {
      return countLabel;
    }

    return `${countLabel} no periodo ${activeDateSummary}`;
  }, [activeDateSummary, logsState.items.length, logsState.totalItems]);
  const selectedTypeLabel = useMemo(
    () => typeOptions.find(option => option.key === selectedType)?.label || 'Todos',
    [selectedType, typeOptions],
  );
  const selectedQuickClassLabel = useMemo(() => {
    if (!appliedClassFilter) {
      return 'Sugestoes';
    }

    return quickClassOptions.find(
      option => normalizeFilterKey(option.value) === normalizeFilterKey(appliedClassFilter),
    )?.label || formatClassLabel(appliedClassFilter);
  }, [appliedClassFilter, quickClassOptions]);

  const applyClassFilter = useCallback(() => {
    setAppliedClassFilter(normalizeText(classFilterInput));
  }, [classFilterInput]);

  const clearAllFilters = useCallback(() => {
    setSelectedType('all');
    setDateFilterKey('all');
    setCustomRange({from: '', to: ''});
    setClassFilterInput('');
    setAppliedClassFilter('');
    setExpandedEntityKey('');
  }, []);

  const openEntityHistory = useCallback((log) => {
    const storeConfig = resolveStoreConfigByClassName(log?.class);
    navigation.navigate('EntityLogPage', {
      id: log?.row,
      store: storeConfig?.storeName || '',
      entityClass: normalizeText(log?.class),
      entityLabel: `${formatClassLabel(log?.class)} #${log?.row || '--'}`,
    });
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Logs',
    });
  }, [navigation]);

  useEffect(() => {
    setExpandedEntityKey('');
  }, [appliedClassFilter, dateFilterKey, logsState.items, selectedType]);

  useFocusEffect(
    useCallback(() => {
      void loadLogs();
    }, [loadLogs]),
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Logs</Text>
              <Text style={styles.heroSubtitle}>
                Timeline global com todos os tipos de log. Para registros de entidade, a expansao reutiliza o historico da propria entidade.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void loadLogs()}
              style={styles.refreshButton}>
              <Icon name="refresh" size={18} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroSummary}>{resultsSummary}</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.filtersCard}>
            <View style={styles.filterHeaderRow}>
              <View style={styles.filterHeaderCopy}>
                <Text style={styles.filterTitle}>Filtros</Text>
                <Text style={styles.filterSubtitle}>
                  Filtre por periodo, tipo real do log e classe da entidade. Para integracao, use `entity` e pesquise `Integration`.
                </Text>
              </View>

              {hasActiveFilters ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={clearAllFilters}
                  style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Limpar</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Periodo</Text>
              <DateShortcutFilter
                value={dateFilterKey}
                onChange={setDateFilterKey}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                colors={{
                  accent: '#2563EB',
                  appBg: 'transparent',
                  border: '#CBD5E1',
                  borderSoft: '#E2E8F0',
                  cardBg: '#FFFFFF',
                  cardBgSoft: '#F8FAFC',
                  danger: '#DC2626',
                  isLight: true,
                  panelBg: '#EFF6FF',
                  pillTextDark: '#FFFFFF',
                  textPrimary: '#0F172A',
                  textSecondary: '#64748B',
                }}
              />

              {!!activeDateSummary && (
                <Text style={styles.filterHint}>Periodo atual: {activeDateSummary}</Text>
              )}
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Tipo de log</Text>
              <CompactFilterSelector
                icon="filter"
                label={selectedTypeLabel}
                title="Tipo de log"
                accentColor="#2563EB"
                active={selectedType !== 'all'}
                options={typeOptions}
                selectedKey={selectedType}
                onSelect={optionKey => {
                  setSelectedType(optionKey);
                  return true;
                }}
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Classe / origem</Text>
              <View style={styles.textFilterRow}>
                <TextInput
                  value={classFilterInput}
                  onChangeText={setClassFilterInput}
                  placeholder="Ex.: Integration, Device, execute_operation"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textFilterInput}
                />

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={applyClassFilter}
                  style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Aplicar</Text>
                </TouchableOpacity>
              </View>

              {!!appliedClassFilter && (
                <Text style={styles.filterHint}>Classe aplicada: {appliedClassFilter}</Text>
              )}

              {!!quickClassOptions.length && (
                <CompactFilterSelector
                  icon="layers"
                  label={selectedQuickClassLabel}
                  title="Sugestoes de classe"
                  accentColor="#2563EB"
                  active={Boolean(appliedClassFilter)}
                  options={quickClassOptions.map(option => ({
                    key: option.value,
                    label: option.label,
                  }))}
                  selectedKey={appliedClassFilter}
                  onSelect={optionKey => {
                    setClassFilterInput(optionKey);
                    setAppliedClassFilter(optionKey);
                    return true;
                  }}
                />
              )}
            </View>
          </View>

          {logsState.status === 'loading' ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.stateText}>Carregando logs...</Text>
            </View>
          ) : null}

          {logsState.status === 'error' ? (
            <View style={styles.stateBox}>
              <Icon name="error-outline" size={22} color="#DC2626" />
              <Text style={styles.stateTitle}>Nao foi possivel carregar</Text>
              <Text style={styles.stateText}>{logsState.error}</Text>
            </View>
          ) : null}

          {logsState.status === 'success' && !logsState.items.length ? (
            <View style={styles.stateBox}>
              <Icon name="history-toggle-off" size={22} color="#94A3B8" />
              <Text style={styles.stateTitle}>Nenhum log encontrado</Text>
              <Text style={styles.stateText}>
                Nenhum registro corresponde aos filtros aplicados.
              </Text>
            </View>
          ) : null}

          {logsState.status === 'success' && !!logsState.items.length ? (
            <View style={styles.list}>
              {logsState.items.map(log => {
                const logKey = buildLogKey(log);
                const isEntityLog =
                  normalizeFilterKey(log?.type) === 'entity' &&
                  normalizeText(log?.class) &&
                  Number(log?.row) > 0;

                if (isEntityLog) {
                  return (
                    <EntityLogCard
                      key={logKey}
                      isExpanded={expandedEntityKey === logKey}
                      log={log}
                      onOpenFullHistory={() => openEntityHistory(log)}
                      onToggleExpand={() =>
                        setExpandedEntityKey(current => current === logKey ? '' : logKey)
                      }
                      styles={styles}
                    />
                  );
                }

                return (
                  <OtherLogCard
                    key={logKey}
                    log={log}
                    styles={styles}
                  />
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

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
export const EntitySummaryCard = ({
  columns = [],
  detailState,
  entity,
  entityClass,
  storeName = '',
  styles,
}) => {
  const summaryFields = useMemo(
    () => buildEntitySummaryFields({
      entity,
      className: entityClass,
      columns,
      storeName,
    }),
    [columns, entity, entityClass, storeName],
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

export const renderChangeValue = (styles, title, value) => (
  <View style={styles.changeValueBox}>
    {title ? <Text style={styles.changeValueTitle}>{title}</Text> : null}
    <Text style={styles.changeValueText}>{value}</Text>
  </View>
);

export const LogCard = ({
  columns = [],
  log,
  rowContext = null,
  storeName = '',
  styles,
}) => {
  const payload = useMemo(() => resolvePayload(log), [log]);
  const actionMeta = useMemo(() => getActionMeta(log?.action), [log?.action]);
  const entries = useMemo(() => Object.entries(payload || {}), [payload]);
  const detailEntries = useMemo(
    () => entries.filter(([field]) => !GENERIC_PAYLOAD_META_FIELDS.has(field)),
    [entries],
  );
  const genericMessage = useMemo(
    () => (typeof payload?.message === 'string' ? payload.message.trim() : ''),
    [payload?.message],
  );
  const genericChannel = useMemo(
    () => (typeof payload?.channel === 'string' ? payload.channel.trim() : ''),
    [payload?.channel],
  );
  const contextEntries = useMemo(
    () => buildContextEntries(payload?.context),
    [payload?.context],
  );
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

      {!!genericChannel && (
        <Text style={styles.logChannel}>{genericChannel}</Text>
      )}

      {!!genericMessage && (
        <View style={styles.genericMessageBox}>
          <Text style={styles.genericMessage}>{genericMessage}</Text>
        </View>
      )}

      {!!contextEntries.length && (
        <View style={styles.contextSection}>
          {contextEntries.map(([field, value]) => (
            <View key={`${log?.id || 'log'}-context-${field}`} style={styles.changeRow}>
              <Text style={styles.changeLabel}>
                {formatLogFieldLabel(field, {
                  columns,
                  storeName,
                })}
              </Text>

              {renderChangeValue(styles, '', formatContextValue(value))}
            </View>
          ))}
        </View>
      )}

      {detailEntries.length ? (
        detailEntries.map(([field, value]) => {
          const isDiffValue =
            Array.isArray(value) &&
            value.length === 2 &&
            Object.prototype.hasOwnProperty.call(value, 0) &&
            Object.prototype.hasOwnProperty.call(value, 1);

          return (
            <View key={`${log?.id || 'log'}-${field}`} style={styles.changeRow}>
              <Text style={styles.changeLabel}>
                {formatLogFieldLabel(field, {
                  columns,
                  storeName,
                })}
              </Text>

              {isDiffValue ? (
                <View style={styles.changeValuesRow}>
                  {renderChangeValue(styles, 'Antes', formatLogValue(value[0], {
                    columns,
                    fieldName: field,
                    row: rowContext,
                    storeName,
                  }))}
                  <View style={styles.arrowWrap}>
                    <Icon name="east" size={16} color="#94A3B8" />
                  </View>
                  {renderChangeValue(styles, 'Depois', formatLogValue(value[1], {
                    columns,
                    fieldName: field,
                    row: rowContext,
                    storeName,
                  }))}
                </View>
              ) : (
                renderChangeValue(
                  styles,
                  '',
                  formatLogValue(value, {
                    columns,
                    fieldName: field,
                    row: rowContext,
                    storeName,
                  }),
                )
              )}
            </View>
          );
        })
      ) : (
        !genericMessage &&
        !contextEntries.length && (
          <Text style={styles.emptyInlineText}>Sem detalhes adicionais.</Text>
        )
      )}
    </View>
  );
};


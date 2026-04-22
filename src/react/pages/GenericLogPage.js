import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import createStyles from './GenericLogPage.styles';

const LEVEL_META = {
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

const getLevelMeta = level => LEVEL_META[String(level || '').toLowerCase()] || {
  color: '#64748B',
  icon: 'history',
  label: 'Evento',
};

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

const formatContextLabel = value =>
  String(value || '')
    .replace(/_/g, ' ')
    .trim() || 'Contexto';

function GenericLogCard({log, styles}) {
  const payload = useMemo(() => resolvePayload(log), [log]);
  const meta = useMemo(() => getLevelMeta(log?.action || payload?.level), [log?.action, payload?.level]);
  const contextEntries = useMemo(() => buildContextEntries(payload?.context), [payload?.context]);
  const message = useMemo(
    () => (typeof payload?.message === 'string' ? payload.message.trim() : ''),
    [payload?.message],
  );
  const channel = useMemo(
    () => (typeof payload?.channel === 'string' ? payload.channel.trim() : ''),
    [payload?.channel],
  );
  const logDate = useMemo(
    () => Formatter.formatDateYmdTodmY(log?.createdAt, true),
    [log?.createdAt],
  );

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
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

          <Text style={styles.date}>{logDate || 'Sem data'}</Text>
        </View>

        {!!log?.userDisplayName && (
          <Text style={styles.user}>{log.userDisplayName}</Text>
        )}
      </View>

      {!!channel && <Text style={styles.channel}>{channel}</Text>}

      <View style={styles.messageBox}>
        <Text style={styles.message}>{message || 'Sem mensagem registrada.'}</Text>
      </View>

      {!!contextEntries.length && (
        <View style={styles.contextList}>
          {contextEntries.map(([field, value]) => (
            <View key={`${log?.id || 'log'}-${field}`} style={styles.contextRow}>
              <Text style={styles.contextLabel}>{formatContextLabel(field)}</Text>
              <View style={styles.contextValueBox}>
                <Text style={styles.contextValue}>{formatContextValue(value)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
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
  });

  const loadLogs = useCallback(async () => {
    setLogsState(current => ({
      ...current,
      error: '',
      status: 'loading',
    }));

    try {
      const response = await entityLogActions.getTimeline({
        itemsPerPage: 100,
        type: 'generic',
      });

      setLogsState({
        error: '',
        items: Array.isArray(response?.items) ? response.items : [],
        status: 'success',
      });
    } catch (error) {
      setLogsState({
        error: error?.message || 'Erro ao carregar logs.',
        items: [],
        status: 'error',
      });
    }
  }, [entityLogActions]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Logs gerais',
    });
  }, [navigation]);

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
            <View style={{flex: 1}}>
              <Text style={styles.heroTitle}>Logs gerais</Text>
              <Text style={styles.heroSubtitle}>
                Eventos operacionais que nao puderam ser vinculados a uma entidade especifica.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => void loadLogs()}
              style={styles.refreshButton}>
              <Icon name="refresh" size={18} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
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
                Ainda nao existem logs genericos sem entidade para esta base.
              </Text>
            </View>
          ) : null}

          {logsState.status === 'success' && !!logsState.items.length ? (
            <View style={styles.list}>
              {logsState.items.map(log => (
                <GenericLogCard
                  key={log?.id || `${log?.createdAt}-${log?.message || 'generic-log'}`}
                  log={log}
                  styles={styles}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

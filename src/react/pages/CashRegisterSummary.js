import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {buildCashSummaryParams} from '@controleonline/ui-common/src/react/utils/cashRegisterSummary';

const PERIOD_OPTIONS = [
  {key: 'today', label: 'Hoje'},
  {key: 'yesterday', label: 'Ontem'},
  {key: 'week', label: 'Semana'},
  {key: 'month', label: 'Mês'},
  {key: 'custom', label: 'Período'},
];

const ERROR_MESSAGES = {
  range: 'Informe datas válidas (AAAA-MM-DD) e a data final não pode ser anterior à inicial.',
};

/**
 * Caixa consolidado por forma de pagamento.
 * Visibility (menu + user type) is enforced by the API; the "scope" returned
 * tells whether the totals are for the whole company or only the current user.
 * Refs: ControleOnline/ui-common#128
 */
export default function CashRegisterSummary() {
  const peopleStore = useStore('people');
  const {currentCompany} = peopleStore.getters || {};
  const [period, setPeriod] = useState('today');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const {params, error: paramsError} = buildCashSummaryParams({
      companyId: currentCompany?.id,
      period,
      from,
      to,
    });
    if (paramsError) {
      setError(ERROR_MESSAGES[paramsError] || null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.fetch('/cash-register/summary', {method: 'GET', params});
      if (response?.error) throw new Error(response.error);
      setData(response);
    } catch (e) {
      setData(null);
      setError(e?.message || 'Não foi possível carregar o caixa.');
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, period, from, to]);

  useFocusEffect(
    useCallback(() => {
      if (period !== 'custom') load();
    }, [load, period]),
  );

  const payments = data?.payments || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <View style={styles.chips}>
        {PERIOD_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.key}
            testID={`cash-period-${option.key}`}
            style={[styles.chip, period === option.key && styles.chipActive]}
            onPress={() => setPeriod(option.key)}>
            <Text style={[styles.chipText, period === option.key && styles.chipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'custom' && (
        <View style={styles.customRow}>
          <TextInput
            style={styles.input}
            placeholder="De (AAAA-MM-DD)"
            value={from}
            onChangeText={setFrom}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Até (AAAA-MM-DD)"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.apply} onPress={load}>
            <Text style={styles.applyText}>Filtrar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.loading} />}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {data && (
        <>
          <Text style={styles.scope}>
            {data.scope === 'user' ? 'Somente o seu caixa' : 'Caixa da empresa'} · {data.from}
            {data.to !== data.from ? ` a ${data.to}` : ''}
          </Text>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total geral</Text>
            <Text style={styles.totalValue}>{Formatter.formatMoney(data.total?.balance || 0)}</Text>
            <Text style={styles.totalSub}>
              Entradas {Formatter.formatMoney(data.total?.inflow || 0)} · Saídas{' '}
              {Formatter.formatMoney(data.total?.withdrawal || 0)} · {data.total?.quantity || 0} lançamentos
            </Text>
          </View>

          {payments.length === 0 && !loading && (
            <Text style={styles.empty}>Nenhuma movimentação no período.</Text>
          )}

          {payments.map(item => (
            <View key={`${item.paymentTypeId}-${item.paymentType}`} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.paymentType}</Text>
                <Text style={styles.rowSub}>{item.quantity} lançamentos</Text>
              </View>
              <Text style={styles.rowValue}>{Formatter.formatMoney(item.balance)}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F8FAFC'},
  content: {padding: 16, gap: 12},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#E2E8F0'},
  chipActive: {backgroundColor: '#0891B2'},
  chipText: {color: '#334155', fontWeight: '600'},
  chipTextActive: {color: '#FFFFFF'},
  customRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center'},
  input: {flex: 1, minWidth: 130, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', padding: 10},
  apply: {backgroundColor: '#0891B2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11},
  applyText: {color: '#FFFFFF', fontWeight: '700'},
  loading: {marginVertical: 8},
  error: {color: '#B91C1C'},
  scope: {color: '#64748B', fontSize: 12},
  totalCard: {backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0'},
  totalLabel: {color: '#64748B', fontSize: 12},
  totalValue: {fontSize: 26, fontWeight: '800', color: '#0F766E'},
  totalSub: {color: '#64748B', fontSize: 12, marginTop: 4},
  empty: {textAlign: 'center', color: '#64748B', marginTop: 16},
  row: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0'},
  rowInfo: {flex: 1},
  rowTitle: {fontWeight: '700', color: '#0F172A'},
  rowSub: {color: '#64748B', fontSize: 12},
  rowValue: {fontWeight: '700', color: '#0F172A'},
});

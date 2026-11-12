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
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import {
  buildCashDrilldownNavigation,
  buildCashSummaryParams,
  resolveDeviceLabel,
  sumDeviceBalances,
} from '@controleonline/ui-common/src/react/utils/cashRegisterSummary';

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
  const navigation = useNavigation();
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
  const devices = data?.devices || [];
  const devicesTotal = sumDeviceBalances(devices);

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

          <Text style={styles.sectionTitle}>Por meio de pagamento</Text>

          {payments.length === 0 && !loading && (
            <Text style={styles.empty}>Nenhuma movimentação no período.</Text>
          )}

          {payments.map(item => {
            const target = buildCashDrilldownNavigation(item, data);

            return (
              <View
                key={`${item.paymentTypeId}-${item.paymentType}`}
                testID={`cash-payment-${item.paymentTypeId}`}
                style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  disabled={!target}
                  activeOpacity={0.8}
                  onPress={() => target && navigation.navigate(target.routeName, target.params)}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{item.paymentType}</Text>
                    <Text style={styles.rowSub}>{item.quantity} lançamentos</Text>
                  </View>
                  <Text style={styles.rowValue}>{Formatter.formatMoney(item.balance)}</Text>
                  {!!target && <Text style={styles.rowChevron}>›</Text>}
                </TouchableOpacity>
                {(item.devices || []).map(sub => (
                  <View
                    key={`pd-${item.paymentTypeId}-${sub.deviceId ?? 'none'}`}
                    testID={`cash-payment-${item.paymentTypeId}-device-${sub.deviceId ?? 'none'}`}
                    style={styles.subCard}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.subTitle}>{resolveDeviceLabel(sub)}</Text>
                      <Text style={styles.rowSub}>{sub.quantity} lançamentos</Text>
                    </View>
                    <Text style={styles.subValue}>{Formatter.formatMoney(sub.balance)}</Text>
                  </View>
                ))}
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>Por dispositivo</Text>

          {devices.length === 0 && !loading && (
            <Text style={styles.empty}>Nenhuma movimentação por dispositivo no período.</Text>
          )}

          {devices.map(item => (
            <View
              key={`device-${item.deviceId ?? 'none'}`}
              testID={`cash-device-${item.deviceId ?? 'none'}`}
              style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{resolveDeviceLabel(item)}</Text>
                  <Text style={styles.rowSub}>{item.quantity} lançamentos</Text>
                </View>
                <Text style={styles.rowValue}>{Formatter.formatMoney(item.balance)}</Text>
              </View>
              {(item.payments || []).map(sub => (
                <View
                  key={`dp-${item.deviceId ?? 'none'}-${sub.paymentTypeId ?? 'none'}`}
                  testID={`cash-device-${item.deviceId ?? 'none'}-payment-${sub.paymentTypeId ?? 'none'}`}
                  style={styles.subCard}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.subTitle}>{sub.paymentType}</Text>
                    <Text style={styles.rowSub}>{sub.quantity} lançamentos</Text>
                  </View>
                  <Text style={styles.subValue}>{Formatter.formatMoney(sub.balance)}</Text>
                </View>
              ))}
            </View>
          ))}

          {devices.length > 0 && (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>Total por dispositivo</Text>
              </View>
              <Text style={styles.rowValue}>{Formatter.formatMoney(devicesTotal)}</Text>
            </View>
          )}
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
  sectionTitle: {marginTop: 8, fontSize: 15, fontWeight: '800', color: '#0F172A'},
  empty: {textAlign: 'center', color: '#64748B', marginTop: 16},
  row: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0'},
  rowInfo: {flex: 1},
  rowTitle: {fontWeight: '700', color: '#0F172A'},
  rowSub: {color: '#64748B', fontSize: 12},
  rowValue: {fontWeight: '700', color: '#0F172A'},
  card: {backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8},
  cardHeader: {flexDirection: 'row', alignItems: 'center'},
  subCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12},
  subTitle: {fontWeight: '600', color: '#334155'},
  subValue: {fontWeight: '600', color: '#334155'},
  rowChevron: {marginLeft: 8, fontSize: 22, color: '#94A3B8'},
});

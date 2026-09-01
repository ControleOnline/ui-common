import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { api } from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { getIntegrationConfig, getIntegrationByKey } from './integrationsCatalog';
import { fetchPeopleConfigs } from './fetchPeopleConfigs';
import IntegrationConfigFields from './IntegrationConfigFields';
import {
  ROUTE_PROVIDER_MAP,
  extractAuthorizationUrl,
  formatApiError,
  formatUberOAuthError,
  getConfigFields,
  isConnectedValue,
  isMethodNotAllowed,
  mergeTabValues,
  normalizeTextValue,
  openAuthorizationUrl,
  resolveProviderId,
  routeNameToPath,
  toConfigRequestValue,
} from './IntegrationConfigPage.utils';
import styles from './IntegrationConfigPage.styles';

const shadowStyle = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
  android: { elevation: 3 },
  web: { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});

const CenterState = ({ icon, iconColor, title, text, backgroundColor, spinnerColor }) => (
  <SafeAreaView style={[styles.container, backgroundColor ? { backgroundColor } : null]} edges={['bottom']}>
    <View style={styles.centerState}>
      {spinnerColor ? <ActivityIndicator size="large" color={spinnerColor} /> : <Icon name={icon} size={32} color={iconColor} />}
      <Text style={styles.centerStateTitle}>{title}</Text>
      <Text style={styles.centerStateText}>{text}</Text>
    </View>
  </SafeAreaView>
);

export default function IntegrationConfigPage({ route, embedded = false, fiscalTab = '', onlyFiscalTab = false }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const configsStore = useStore('configs');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const configActions = configsStore.actions || {};
  const { isSaving } = configsStore.getters;
  const { showError, showSuccess } = useToastMessage();
  const oauthNoticeRef = useRef('');

  const providerKey = useMemo(
    () => route?.params?.providerKey || ROUTE_PROVIDER_MAP[route?.name] || '',
    [route?.name, route?.params?.providerKey],
  );
  const providerConfig = useMemo(() => getIntegrationConfig(providerKey), [providerKey]);
  const configFields = useMemo(() => getConfigFields(providerConfig), [providerConfig]);
  const fiscalTabs = providerConfig?.tabs || [];
  const requestedFiscalTab = fiscalTab || route?.params?.fiscalTab || '';
  const [activeFiscalTab, setActiveFiscalTab] = useState(() => requestedFiscalTab || fiscalTabs[0]?.key || 'general');
  const activeTabDef = useMemo(
    () => fiscalTabs.find(tab => tab.key === activeFiscalTab) || fiscalTabs[0] || null,
    [activeFiscalTab, fiscalTabs],
  );
  const visibleFields = useMemo(
    () => (activeTabDef?.fields?.length ? activeTabDef.fields : configFields),
    [activeTabDef, configFields],
  );
  useEffect(() => {
    if (requestedFiscalTab && fiscalTabs.some(tab => tab.key === requestedFiscalTab)) {
      if (activeFiscalTab !== requestedFiscalTab) setActiveFiscalTab(requestedFiscalTab);
      return;
    }
    if (fiscalTabs.length && !fiscalTabs.some(tab => tab.key === activeFiscalTab)) setActiveFiscalTab(fiscalTabs[0].key);
  }, [activeFiscalTab, fiscalTabs, requestedFiscalTab]);

  const returnPath = useMemo(() => {
    const routePath = normalizeTextValue(route?.params?.return_path || route?.params?.returnPath || '');
    if (routePath) return routePath.startsWith('/') ? routePath : `/${routePath}`;
    const normalized = routeNameToPath(route?.name);
    return normalized ? `/${normalized}` : '/uber-integration-page';
  }, [route?.name, route?.params?.returnPath, route?.params?.return_path]);

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [configValues, setConfigValues] = useState({});
  const [integrationSummary, setIntegrationSummary] = useState(null);

  const providerId = useMemo(
    () => resolveProviderId({ route, currentCompany, embedded }),
    [embedded, route?.params?.companyId, route?.params?.clientId, currentCompany?.id],
  );
  const providerIri = useMemo(() => (providerId ? `/people/${providerId}` : ''), [providerId]);
  const allConfigFields = useMemo(() => getConfigFields(providerConfig), [providerConfig]);
  const allFieldKeys = useMemo(
    () => allConfigFields.map(field => field.key).filter(Boolean),
    [allConfigFields],
  );
  const allFieldKeysSig = useMemo(() => allFieldKeys.join('|'), [allFieldKeys]);
  // Pure config providers (e.g. receita-federal) do not use marketplace/integrations.
  const needsMarketplaceIntegration = Boolean(providerConfig?.oauthConnect);

  useEffect(() => {
    setConfigValues({});
  }, [providerIri]);

  useEffect(() => {
    const oauthStatus = normalizeTextValue(route?.params?.oauth_status).toLowerCase();
    const oauthError = normalizeTextValue(route?.params?.oauth_error);
    const oauthKey = `${oauthStatus}|${oauthError}`;
    if (!oauthStatus || oauthNoticeRef.current === oauthKey) return;
    oauthNoticeRef.current = oauthKey;
    if (oauthStatus === 'success') showSuccess('Uber conectado com sucesso.');
    if (oauthStatus === 'error') showError(formatUberOAuthError(oauthError));
  }, [route?.params?.oauth_error, route?.params?.oauth_status, showError, showSuccess]);

  const loadPageData = useCallback(async ({ showLoading = true } = {}) => {
    if (!providerIri || !providerConfig) {
      setIntegrationSummary(null);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const keys = allFieldKeys.length
        ? allFieldKeys
        : visibleFields.map(field => field.key).filter(Boolean);

      if (keys.length) {
        const configItems = await fetchPeopleConfigs({ peopleIri: providerIri, configKeys: keys });
        const mergeFields = allConfigFields.length ? allConfigFields : visibleFields;
        setConfigValues(current => mergeTabValues(mergeFields, configItems, current));
      }

      if (needsMarketplaceIntegration) {
        try {
          const integrationResponse = await api.fetch('/marketplace/integrations', {
            params: { provider_id: providerId },
          });
          setIntegrationSummary(getIntegrationByKey(integrationResponse, providerConfig.key));
        } catch (integrationError) {
          // OAuth / marketplace providers still surface the error; pure config never hits this branch.
          showError(formatApiError(integrationError));
          setIntegrationSummary(null);
        }
      } else {
        setIntegrationSummary(null);
      }
    } catch (error) {
      showError(formatApiError(error));
      setIntegrationSummary(null);
    } finally {
      setLoading(false);
      setTabLoading(false);
    }
  }, [
    allConfigFields,
    allFieldKeys,
    allFieldKeysSig,
    needsMarketplaceIntegration,
    providerConfig,
    providerIri,
    providerId,
    showError,
  ]);

  // Reload only when the company/provider identity or full key set changes — not on fiscal sub-tab switch.
  useFocusEffect(useCallback(() => { loadPageData(); }, [loadPageData]));
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadPageData({ showLoading: false }); } finally { setRefreshing(false); }
  }, [loadPageData]);
  const updateField = useCallback((fieldKey, value) => {
    setConfigValues(current => ({ ...current, [fieldKey]: value }));
  }, []);

  const persistConfigs = useCallback(async payload => {
    if (typeof configActions.addManyConfigs === 'function') {
      try {
        return await configActions.addManyConfigs(payload);
      } catch (error) {
        if (!isMethodNotAllowed(error)) throw error;
      }
    }
    if (typeof configActions.addConfigs !== 'function') {
      throw new Error('Nao foi possivel salvar: acao de configs indisponivel.');
    }
    for (const item of payload.configs) {
      await configActions.addConfigs({
        configKey: item.configKey,
        configValue: item.configValue,
        people: payload.people,
        module: payload.module,
        visibility: payload.visibility,
      });
    }
    return true;
  }, [configActions]);

  const handleOAuthConnect = useCallback(async () => {
    if (!providerIri || !providerConfig?.oauthConnect) {
      showError('Nao foi possivel identificar a integracao selecionada.');
      return;
    }
    setAuthLoading(true);
    try {
      const response = await api.fetch(providerConfig.authorizationEndpoint, {
        method: 'POST', body: { provider_id: providerId, return_path: returnPath },
      });
      const authUrl = extractAuthorizationUrl(response);
      if (!authUrl) return showError('Nao foi possivel iniciar o login do Uber.');
      await openAuthorizationUrl(authUrl);
      showSuccess('Abrindo login do Uber.');
    } catch (error) {
      showError(error?.message || 'Nao foi possivel iniciar o login do Uber.');
    } finally { setAuthLoading(false); }
  }, [providerConfig, providerId, providerIri, returnPath, showError, showSuccess]);

  const requiredKeys = providerConfig?.requiredKeys || [];
  const connected = integrationSummary && typeof integrationSummary.connected !== 'undefined'
    ? isConnectedValue(integrationSummary.connected)
    : requiredKeys.length > 0 && requiredKeys.every(key => normalizeTextValue(configValues[key]) !== '');
  const statusTone = connected ? '#16A34A' : '#e67e22';
  const editable = Boolean(providerIri && providerConfig && !providerConfig.oauthConnect);
  const actionLoading = providerConfig?.oauthConnect ? authLoading : Boolean(isSaving || tabLoading);
  const actionDisabled = providerConfig?.oauthConnect ? authLoading || loading : !editable || actionLoading;
  const saveLabel = fiscalTabs.length
    ? `Salvar ${activeTabDef?.label || 'aba'}`
    : providerConfig?.saveLabel;

  const saveIntegration = useCallback(async () => {
    if (!providerIri || !providerConfig || providerConfig.oauthConnect) {
      showError('Nao foi possivel identificar a integracao selecionada.');
      return;
    }
    const configs = visibleFields.map(field => ({
      configKey: field.key,
      configValue: toConfigRequestValue(normalizeTextValue(configValues[field.key])),
    }));
    try {
      await persistConfigs({ configs, people: providerIri, module: 4, visibility: 'public' });
      showSuccess(`${activeTabDef?.label || providerConfig.label} salvo com sucesso.`);
      await loadPageData({ showLoading: false });
    } catch (error) { showError(error?.message || 'Nao foi possivel salvar a integracao.'); }
  }, [activeTabDef, configValues, loadPageData, persistConfigs, providerConfig, providerIri, showError, showSuccess, visibleFields]);

  if (!providerConfig) return <CenterState icon="alert-triangle" iconColor="#e67e22" title="Integracao indisponivel" text="A tela solicitada nao possui configuracao cadastrada." />;
  if (!providerId) return <CenterState icon="building" iconColor="#94A3B8" title="Empresa nao identificada" text="Abra a ficha da empresa para gravar as configuracoes fiscais nela." />;
  if (loading) return <CenterState backgroundColor={brandColors.background} spinnerColor={providerConfig.accent} title="Carregando integracao" text="Buscando as credenciais desta aba." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={providerConfig.accent} />}>
        {!embedded ? (
          <View style={[styles.heroCard, shadowStyle, { backgroundColor: providerConfig.accent }]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>INTEGRACAO</Text>
              <Text style={styles.heroTitle}>{providerConfig.label}</Text>
              <Text style={styles.heroText}>{providerConfig.description}</Text>
            </View>
            <View style={styles.heroBadge}><Icon name={providerConfig.icon} size={22} color={providerConfig.accent} /></View>
          </View>
        ) : <View style={[styles.embeddedHeader, shadowStyle]}><Text style={styles.embeddedTitle}>Configuracoes fiscais</Text></View>}

        {!embedded ? (
          <View style={[styles.statusCard, shadowStyle]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusCopy}>
                <Text style={styles.sectionTitle}>Status</Text>
                <Text style={styles.sectionSubtitle}>{providerConfig.oauthConnect
                  ? 'A integracao fica conectada quando o login do Uber termina e o store e salvo automaticamente.'
                  : 'A integracao so aparece como conectada quando todos os campos obrigatorios foram salvos nesta empresa.'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: withOpacity(statusTone, 0.12) }]}>
                <Text style={[styles.statusBadgeText, { color: statusTone }]}>{connected ? 'Conectado' : 'Pendente'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>{providerConfig.oauthConnect ? 'Conexao' : fiscalTabs.length ? activeTabDef?.label || 'Configuracoes' : 'Credenciais'}</Text>
          {!embedded ? <Text style={styles.cardSubtitle}>{providerConfig.oauthConnect
            ? 'Use o login oficial do Uber. A store sera localizada e gravada automaticamente na empresa ativa.'
            : 'Troca de aba e local; as configuracoes sao carregadas uma vez e cada aba grava so as chaves dela.'}</Text> : null}

          {providerConfig.oauthConnect ? (
            <View style={styles.fieldList}><View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Uber OAuth</Text>
              <Text style={styles.fieldKey}>Nao ha campos manuais. O login autoriza o app e salva o store automaticamente.</Text>
            </View></View>
          ) : (
            <View style={styles.fieldList}>
              {fiscalTabs.length && !onlyFiscalTab ? <View style={styles.subTabRow}>{fiscalTabs.map(tab => {
                const selected = tab.key === (activeTabDef?.key || activeFiscalTab);
                return <TouchableOpacity key={tab.key} style={[styles.subTabButton, selected && styles.subTabButtonActive]}
                  activeOpacity={0.85} onPress={() => setActiveFiscalTab(tab.key)}>
                  <Text style={[styles.subTabLabel, selected && styles.subTabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>;
              })}</View> : null}
              {activeTabDef?.description ? <Text style={styles.tabDescription}>{activeTabDef.description}</Text> : null}
              {tabLoading ? <ActivityIndicator color={providerConfig.accent} /> : null}
              <IntegrationConfigFields fields={visibleFields} configValues={configValues} editable={editable}
                embedded={embedded} providerId={providerId} updateField={updateField} />
            </View>
          )}

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: providerConfig.accent }, actionDisabled && styles.saveButtonDisabled]}
            disabled={actionDisabled} activeOpacity={0.9} onPress={providerConfig.oauthConnect ? handleOAuthConnect : saveIntegration}>
            {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Icon name={providerConfig.oauthConnect ? 'log-in' : 'save'} size={16} color="#FFFFFF" />}
            <Text style={styles.saveButtonText}>{providerConfig.oauthConnect ? providerConfig.connectLabel || 'Conectar' : saveLabel}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

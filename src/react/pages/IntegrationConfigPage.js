import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { api } from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

import {
  getIntegrationConfig,
  getIntegrationByKey,
} from './integrationsCatalog';
import { fetchPeopleConfigs } from './fetchPeopleConfigs';
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload';
import { extractFileId, toFileIri, uploadFileToApi } from '@controleonline/ui-default/src/react/components/upload/fileUpload';
import styles from './IntegrationConfigPage.styles';

const ROUTE_PROVIDER_MAP = {
  UberIntegrationPage: 'uber',
  AsaasIntegrationPage: 'asaas',
  ClickSignIntegrationPage: 'clicksign',
};

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});

const routeNameToPath = routeName =>
  String(routeName || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar a configuracao da integracao.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar a configuracao da integracao.';
};

const normalizeSourceConfigs = source => {
  if (Array.isArray(source)) {
    return source.reduce((accumulator, item) => {
      const key = String(item?.configKey || '').trim();
      if (key) {
        accumulator[key] = item?.configValue;
      }
      return accumulator;
    }, {});
  }

  if (source && typeof source === 'object') {
    return source;
  }

  return {};
};

const normalizeTextValue = value => {
  let text = String(value ?? '').trim();
  if (
    (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
    (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
  ) {
    text = text.slice(1, -1).trim();
  }
  return text;
};

const isConnectedValue = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value).trim().toLowerCase() === 'true';

const toConfigRequestValue = value => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return normalizeTextValue(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const getConfigFields = providerConfig => {
  if (!providerConfig) return [];
  if (Array.isArray(providerConfig.tabs) && providerConfig.tabs.length > 0) {
    return providerConfig.tabs.flatMap(tab => tab.fields || []);
  }
  return providerConfig.fields || [];
};

const buildFieldValues = (providerConfig, source) => {
  const sourceMap = normalizeSourceConfigs(source);

  return getConfigFields(providerConfig).reduce((accumulator, field) => {
    accumulator[field.key] = normalizeTextValue(sourceMap[field.key]);
    return accumulator;
  }, {});
};

const extractAuthorizationUrl = response => {
  const candidate =
    response?.member?.[0]?.authorization_url ||
    response?.member?.[0]?.auth_url ||
    response?.member?.[0]?.url ||
    response?.authorization_url ||
    response?.auth_url ||
    response?.url ||
    response?.data?.authorization_url ||
    response?.data?.auth_url ||
    response?.data?.url;

  return normalizeTextValue(candidate);
};

const formatUberOAuthError = error => {
  const normalized = normalizeTextValue(error).toLowerCase();

  if (normalized === 'invalid_scope') {
    return 'O Uber nao liberou o scope pos_provisioning para este app. Esse app precisa estar aprovado/whitelisted no dashboard do Uber.';
  }

  if (normalized === 'access_denied') {
    return 'O login do Uber foi cancelado.';
  }

  return normalizeTextValue(error) || 'Nao foi possivel concluir a conexao com o Uber.';
};

const openAuthorizationUrl = async authUrl => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.location?.assign === 'function') {
    window.location.assign(authUrl);
    return;
  }

  await Linking.openURL(authUrl);
};

const isMethodNotAllowed = error => {
  const status = Number(error?.status || error?.code || error?.body?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return status === 404 || status === 405 || message.includes('method not allowed');
};

export default function IntegrationConfigPage({ route, embedded = false }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const configsStore = useStore('configs');
  const { currentCompany } = peopleStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};
  const configActions = configsStore.actions || {};
  const { isSaving } = configsStore.getters || {};
  const { showError, showSuccess } = useToastMessage();
  const oauthNoticeRef = useRef('');

  const providerKey = useMemo(
    () => route?.params?.providerKey || ROUTE_PROVIDER_MAP[route?.name] || '',
    [route?.name, route?.params?.providerKey],
  );
  const providerConfig = useMemo(() => getIntegrationConfig(providerKey), [providerKey]);
  const configFields = useMemo(() => getConfigFields(providerConfig), [providerConfig]);
  const fiscalTabs = providerConfig?.tabs || [];
  const [activeFiscalTab, setActiveFiscalTab] = useState(() => fiscalTabs[0]?.key || 'general');
  const activeTabDef = useMemo(
    () => fiscalTabs.find(tab => tab.key === activeFiscalTab) || fiscalTabs[0] || null,
    [activeFiscalTab, fiscalTabs],
  );
  const visibleFields = useMemo(
    () => (activeTabDef?.fields?.length ? activeTabDef.fields : configFields),
    [activeTabDef, configFields],
  );

  useEffect(() => {
    if (fiscalTabs.length && !fiscalTabs.some(tab => tab.key === activeFiscalTab)) {
      setActiveFiscalTab(fiscalTabs[0].key);
    }
  }, [activeFiscalTab, fiscalTabs]);

  const returnPath = useMemo(() => {
    const routePath = normalizeTextValue(route?.params?.return_path || route?.params?.returnPath || '');
    if (routePath) return routePath.startsWith('/') ? routePath : `/${routePath}`;
    const normalizedRoutePath = routeNameToPath(route?.name);
    return normalizedRoutePath ? `/${normalizedRoutePath}` : '/uber-integration-page';
  }, [route?.name, route?.params?.returnPath, route?.params?.return_path]);

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [configValues, setConfigValues] = useState({});
  const [integrationSummary, setIntegrationSummary] = useState(null);
  const [saveNotice, setSaveNotice] = useState('');

  const providerId = useMemo(() => {
    const fromRoute = String(route?.params?.companyId || route?.params?.clientId || '').replace(/\D/g, '');
    if (fromRoute) return fromRoute;
    if (embedded) return '';
    return String(currentCompany?.id || '').replace(/\D/g, '');
  }, [embedded, route?.params?.clientId, route?.params?.companyId, currentCompany?.id]);

  const providerIri = providerId ? `/people/${providerId}` : '';

  const syncConfigValues = useCallback(source => {
    if (!providerConfig) {
      setConfigValues({});
      return;
    }
    setConfigValues(buildFieldValues(providerConfig, source));
  }, [providerConfig]);

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
      const integrationPromise = api.fetch('/marketplace/integrations', {
        params: { provider_id: providerId },
      });
      if (configFields.length > 0) {
        const [configItems, integrationResponse] = await Promise.all([
          fetchPeopleConfigs({
            peopleIri: providerIri,
            configKeys: configFields.map(field => field.key),
          }),
          integrationPromise,
        ]);
        syncConfigValues(configItems);
        setIntegrationSummary(getIntegrationByKey(integrationResponse, providerConfig.key));
        return;
      }
      setIntegrationSummary(getIntegrationByKey(await integrationPromise, providerConfig.key));
    } catch (error) {
      showError(formatApiError(error));
      setIntegrationSummary(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [configFields, providerConfig, providerIri, providerId, showError, syncConfigValues]);

  useFocusEffect(useCallback(() => { loadPageData(); }, [loadPageData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadPageData({ showLoading: false }); } finally { setRefreshing(false); }
  }, [loadPageData]);

  const updateField = useCallback((fieldKey, value) => {
    setConfigValues(currentValues => ({ ...currentValues, [fieldKey]: value }));
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
        method: 'POST',
        body: { provider_id: providerId, return_path: returnPath },
      });
      const authUrl = extractAuthorizationUrl(response);
      if (!authUrl) {
        showError('Nao foi possivel iniciar o login do Uber.');
        return;
      }
      await openAuthorizationUrl(authUrl);
      showSuccess('Abrindo login do Uber.');
    } catch (error) {
      showError(error?.message || 'Nao foi possivel iniciar o login do Uber.');
    } finally {
      setAuthLoading(false);
    }
  }, [providerConfig, providerId, providerIri, returnPath, showError, showSuccess]);

  const requiredKeys = providerConfig?.requiredKeys || [];
  const connected = integrationSummary && typeof integrationSummary.connected !== 'undefined'
    ? isConnectedValue(integrationSummary.connected)
    : requiredKeys.length > 0
      ? requiredKeys.every(fieldKey => normalizeTextValue(configValues[fieldKey]) !== '')
      : false;
  const statusTone = connected ? '#16A34A' : '#e67e22';
  const editable = Boolean(providerIri && providerConfig && !providerConfig.oauthConnect);
  const actionLoading = providerConfig?.oauthConnect ? authLoading : Boolean(isSaving);
  const actionDisabled = providerConfig?.oauthConnect ? authLoading || loading : !editable || actionLoading;

  const saveIntegration = useCallback(async () => {
    if (!providerIri || !providerConfig || providerConfig.oauthConnect) {
      showError('Nao foi possivel identificar a integracao selecionada.');
      return;
    }
    const configs = configFields.map(field => ({
      configKey: field.key,
      configValue: toConfigRequestValue(normalizeTextValue(configValues[field.key])),
    }));
    setSaveNotice('');
    try {
      await persistConfigs({
        configs,
        people: providerIri,
        module: 4,
        visibility: 'public',
      });
      setSaveNotice('Configuracoes fiscais salvas nesta empresa.');
      showSuccess(`${providerConfig.label} salvo com sucesso.`);
      await loadPageData({ showLoading: false });
    } catch (error) {
      const message = error?.message || 'Nao foi possivel salvar a integracao.';
      setSaveNotice(message);
      showError(message);
    }
  }, [configFields, configValues, loadPageData, persistConfigs, providerConfig, providerIri, showError, showSuccess]);

  if (!providerConfig) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="alert-triangle" size={32} color="#e67e22" />
          <Text style={styles.centerStateTitle}>Integracao indisponivel</Text>
          <Text style={styles.centerStateText}>A tela solicitada nao possui configuracao cadastrada.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Empresa nao identificada</Text>
          <Text style={styles.centerStateText}>Abra a ficha da empresa para gravar as configuracoes fiscais nela.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={providerConfig.accent} />
          <Text style={styles.centerStateTitle}>Carregando integracao</Text>
          <Text style={styles.centerStateText}>Buscando as credenciais salvas desta empresa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={providerConfig.accent} />}>
        {!embedded ? (
          <View style={[styles.heroCard, shadowStyle, { backgroundColor: providerConfig.accent }]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>INTEGRACAO</Text>
              <Text style={styles.heroTitle}>{providerConfig.label}</Text>
              <Text style={styles.heroText}>{providerConfig.description}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Icon name={providerConfig.icon} size={22} color={providerConfig.accent} />
            </View>
          </View>
        ) : (
          <View style={[styles.embeddedHeader, shadowStyle]}>
            <Text style={styles.embeddedTitle}>Configuracoes fiscais</Text>
          </View>
        )}

        {!embedded ? (
          <View style={[styles.statusCard, shadowStyle]}>
            <View style={styles.statusHeader}>
              <View style={styles.statusCopy}>
                <Text style={styles.sectionTitle}>Status</Text>
                <Text style={styles.sectionSubtitle}>
                  {providerConfig.oauthConnect
                    ? 'A integracao fica conectada quando o login do Uber termina e o store e salvo automaticamente.'
                    : 'A integracao so aparece como conectada quando todos os campos obrigatorios foram salvos nesta empresa.'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: withOpacity(statusTone, 0.12) }]}>
                <Text style={[styles.statusBadgeText, { color: statusTone }]}>{connected ? 'Conectado' : 'Pendente'}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {providerConfig.oauthConnect ? 'Conexao' : fiscalTabs.length ? (activeTabDef?.label || 'Configuracoes') : 'Credenciais'}
          </Text>

          {providerConfig.oauthConnect ? (
            <View style={styles.fieldList}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Uber OAuth</Text>
                <Text style={styles.fieldKey}>Nao ha campos manuais. O login autoriza o app e salva o store automaticamente.</Text>
              </View>
            </View>
          ) : (
            <View style={styles.fieldList}>
              {fiscalTabs.length > 0 ? (
                <View style={styles.subTabRow}>
                  {fiscalTabs.map(tab => {
                    const selected = tab.key === (activeTabDef?.key || activeFiscalTab);
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.subTabButton, selected && styles.subTabButtonActive]}
                        activeOpacity={0.85}
                        onPress={() => setActiveFiscalTab(tab.key)}>
                        <Text style={[styles.subTabLabel, selected && styles.subTabLabelActive]}>{tab.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {activeTabDef?.description ? <Text style={styles.tabDescription}>{activeTabDef.description}</Text> : null}
              {visibleFields.map(field => (
                <View key={field.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {!embedded ? <Text style={styles.fieldKey}>{field.key}</Text> : null}
                  {field.type === 'select' ? (
                    <View style={styles.selectList}>
                      {(field.options || []).map(option => {
                        const selected = String(configValues[field.key] || '') === String(option.value);
                        return (
                          <TouchableOpacity
                            key={String(option.value)}
                            style={[styles.selectOption, selected && styles.selectOptionActive, !editable && styles.inputDisabled]}
                            disabled={!editable}
                            activeOpacity={0.85}
                            onPress={() => updateField(field.key, String(option.value))}>
                            <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>{option.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : field.type === 'file' ? (
                    <View style={styles.fileFieldWrap}>
                      <Text style={styles.fieldHint}>
                        {configValues[field.key]
                          ? `Arquivo vinculado (id: ${String(configValues[field.key]).replace(/\D/g, '') || configValues[field.key]})`
                          : 'Nenhum certificado vinculado.'}
                      </Text>
                      <DefaultUpload
                        relationStoreName="people"
                        relationField="people"
                        relationResource="people"
                        entityId={providerId}
                        companyId={providerId}
                        context={field.fileContext || 'company_certificate'}
                        libraryContexts={[field.fileContext || 'company_certificate']}
                        acceptedTypes={field.accept || '.pfx,.p12,application/x-pkcs12'}
                        fileType=""
                        fileTypeLabel="certificado"
                        title={field.label}
                        triggerLabel="Gerenciar certificado"
                        managerTitle="Gerenciador de arquivos"
                        searchPlaceholder="Buscar certificado"
                        uploadButtonLabel="Enviar certificado"
                        emptyAttachmentLabel="Nenhum certificado anexado."
                        emptyLibraryLabel="Nenhum arquivo encontrado."
                        uploadSuccessMessage="Certificado enviado."
                        attachSuccessMessage="Certificado vinculado."
                        removeSuccessMessage="Certificado removido."
                        showInlineContent={false}
                        uploadResultAlreadyAttached
                        requireEntity={false}
                        onUploadFile={async ({ file, companyId, context, entityId }) => {
                          const uploaded = await uploadFileToApi({
                            file,
                            context: context || field.fileContext || 'company_certificate',
                            peopleId: companyId || providerId,
                            entityId: entityId || providerId,
                          });
                          const id = extractFileId(uploaded);
                          const value = id ? String(id) : toFileIri(uploaded) || '';
                          if (!value) throw new Error('Upload sem identificador de arquivo.');
                          updateField(field.key, value);
                          return uploaded;
                        }}
                        onAttachFile={async fileObj => {
                          const id = extractFileId(fileObj);
                          const value = id ? String(id) : toFileIri(fileObj) || '';
                          if (!value) throw new Error('Arquivo sem identificador.');
                          updateField(field.key, value);
                          return fileObj;
                        }}
                        onRemoveAttachment={async () => {
                          updateField(field.key, '');
                          return true;
                        }}
                        renderTrigger={({ openManager, uploading }) => (
                          <TouchableOpacity
                            style={[styles.filePickerButton, !editable && styles.inputDisabled]}
                            disabled={!editable || uploading}
                            activeOpacity={0.85}
                            onPress={openManager}>
                            {uploading ? <ActivityIndicator color="#166534" /> : <Icon name="folder" size={16} color="#166534" />}
                            <Text style={styles.filePickerButtonText}>
                              {configValues[field.key] ? 'Trocar certificado (gerenciador)' : 'Selecionar / enviar certificado'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.input, !editable && styles.inputDisabled]}
                      value={configValues[field.key] || ''}
                      onChangeText={value => updateField(field.key, value)}
                      editable={editable}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={Boolean(field.secureTextEntry)}
                      placeholder={field.placeholder}
                    />
                  )}
                </View>
              ))}
            </View>
          )}

          {saveNotice ? <Text style={styles.fieldHint}>{saveNotice}</Text> : null}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: providerConfig.accent }, actionDisabled && styles.saveButtonDisabled]}
            disabled={actionDisabled}
            activeOpacity={0.9}
            onPress={providerConfig.oauthConnect ? handleOAuthConnect : saveIntegration}>
            {actionLoading ? <ActivityIndicator color="#FFFFFF" /> : <Icon name={providerConfig.oauthConnect ? 'log-in' : 'save'} size={16} color="#FFFFFF" />}
            <Text style={styles.saveButtonText}>
              {actionLoading ? 'Salvando...' : (providerConfig.oauthConnect ? providerConfig.connectLabel || 'Conectar' : providerConfig.saveLabel)}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

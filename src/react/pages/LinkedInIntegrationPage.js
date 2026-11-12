import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import {api} from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import {useStore} from '@store';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

import styles from './IntegrationConfigPage.styles';
import {
  isConnected,
  formatApiError,
  resolveFrontOAuthRedirectUri,
  replaceFrontOAuthStatus,
  formatOAuthStatusError,
} from './linkedinIntegrationHelpers';

const PROVIDER = {
  key: 'linkedin',
  label: 'LinkedIn',
  accent: '#0A66C2',
  button: '#0A66C2',
  icon: 'link',
};

const tt = (type, key) => global.t?.t('configs', type, key);

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: {elevation: 3},
  web: {boxShadow: '0 10px 24px rgba(15,23,42,0.08)'},
});

export default function LinkedInIntegrationPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {showError, showSuccess} = useToastMessage();

  const providerId = currentCompany?.id;
  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState(null);

  const loadPageData = useCallback(
    async ({showLoading = true} = {}) => {
      if (!providerId) {
        setStatus(null);
        setLoading(false);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await api.fetch('/integrations/linkedin/status', {
          method: 'POST',
          body: {
            provider_id: providerId,
          },
        });
        setStatus(response || null);
      } catch (error) {
        setStatus(null);
        showError(formatApiError(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [providerId, showError],
  );

  useFocusEffect(
    useCallback(() => {
      loadPageData();
    }, [loadPageData]),
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search || '');
    const alreadyConnected = params.get('linkedin_connected') === '1';
    const oauthStatusError = params.get('linkedin_error');
    const oauthStatusMessage = params.get('linkedin_message');

    if (alreadyConnected) {
      showSuccess(
        tt('marketplace_message', 'linkedinConnected') ||
          'LinkedIn conectado com sucesso.',
      );
      replaceFrontOAuthStatus({});
      loadPageData({showLoading: false});
      return;
    }

    if (oauthStatusError) {
      showError(formatOAuthStatusError(oauthStatusError, oauthStatusMessage));
      replaceFrontOAuthStatus({});
    }
  }, [loadPageData, showError, showSuccess]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPageData({showLoading: false});
  }, [loadPageData]);

  const connectLinkedIn = useCallback(async () => {
    if (!providerId) {
      return;
    }

    if (status?.client_configured === false) {
      showError(
        tt('marketplace_message', 'linkedinClientConfigRequired') ||
          'Configure o Client ID e Secret do app LinkedIn nesta empresa para habilitar o login.',
      );
      return;
    }

    setAuthorizing(true);
    try {
      const returnUrl =
        resolveFrontOAuthRedirectUri() ||
        (typeof window !== 'undefined' ? window.location.href : undefined);

      const response = await api.fetch('/integrations/linkedin/authorization-page', {
        method: 'POST',
        body: {
          provider_id: providerId,
          return_url: returnUrl,
          app_domain:
            typeof window !== 'undefined' ? window.location.hostname : undefined,
        },
      });

      const authorizationUrl =
        response?.authorization_url || response?.url || response?.auth_url || '';
      if (!authorizationUrl) {
        throw new Error(
          response?.message ||
            tt('marketplace_error', 'linkedinAuthorizationUrl') ||
            'URL de autorizacao LinkedIn indisponivel.',
        );
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(authorizationUrl);
      } else {
        await Linking.openURL(authorizationUrl);
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setAuthorizing(false);
    }
  }, [providerId, showError, status?.client_configured]);

  const disconnectLinkedIn = useCallback(async () => {
    if (!providerId) {
      return;
    }

    setDisconnecting(true);
    try {
      await api.fetch('/integrations/linkedin/disconnect', {
        method: 'POST',
        body: {
          provider_id: providerId,
        },
      });
      showSuccess(
        tt('marketplace_message', 'linkedinDisconnected') ||
          'LinkedIn desconectado.',
      );
      await loadPageData({showLoading: false});
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setDisconnecting(false);
    }
  }, [loadPageData, providerId, showError, showSuccess]);

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color={PROVIDER.accent} />
          <Text style={styles.centerStateTitle}>
            {tt('integrations_title', 'selectCompany') || 'Selecione uma empresa'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: brandColors.background}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={brandColors.primary} />
          <Text style={styles.centerStateTitle}>
            {tt('marketplace_title', 'loadingLinkedIn') || 'Carregando LinkedIn'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const connected = isConnected(status?.connected);
  const oauthClientConfigured = status?.client_configured !== false;
  const statusTone = connected ? '#16A34A' : '#e67e22';
  const memberLabel = status?.member_name || status?.member_id || null;

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background}]}
      edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColors.primary}
          />
        }>
        <View style={[styles.statusCard, shadowStyle]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusCopy}>
              <Text style={styles.cardTitle}>
                {tt('marketplace_title', 'status') || 'Status'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {memberLabel
                  ? `Conta: ${memberLabel}`
                  : tt('marketplace_message', 'connectLinkedInAccount') ||
                    'Conecte a conta LinkedIn da empresa ativa.'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: withOpacity(statusTone, 0.12)},
              ]}>
              <Text style={[styles.statusBadgeText, {color: statusTone}]}>
                {connected
                  ? tt('marketplace_status', 'connected') || 'Conectado'
                  : tt('marketplace_status', 'pending') || 'Pendente'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.formCard, shadowStyle]}>
          <Text style={styles.cardTitle}>
            {tt('marketplace_title', 'linkedinAccount') || 'Conta LinkedIn'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {oauthClientConfigured
              ? tt('marketplace_message', 'linkedinOauthFlow') ||
                'O login abre o LinkedIn, autoriza o perfil e retorna para esta tela.'
              : tt('marketplace_message', 'linkedinClientConfigRequired') ||
                'Configure o Client ID e Secret do app LinkedIn nesta empresa para habilitar o login.'}
          </Text>

          <TouchableOpacity
            style={[
              styles.saveButton,
              {backgroundColor: PROVIDER.button},
              (!oauthClientConfigured || authorizing) && styles.saveButtonDisabled,
            ]}
            disabled={!oauthClientConfigured || authorizing}
            activeOpacity={0.9}
            onPress={connectLinkedIn}
            testID="linkedin-connect-button">
            {authorizing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Icon name="external-link" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {connected
                ? tt('marketplace_button', 'reconnectLinkedIn') ||
                  'Reconectar LinkedIn'
                : tt('marketplace_button', 'connectLinkedIn') ||
                  'Conectar com LinkedIn'}
            </Text>
          </TouchableOpacity>

          {connected ? (
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#DC2626',
                  marginTop: 12,
                },
                disconnecting && styles.saveButtonDisabled,
              ]}
              disabled={disconnecting}
              activeOpacity={0.9}
              onPress={disconnectLinkedIn}
              testID="linkedin-disconnect-button">
              {disconnecting ? (
                <ActivityIndicator color="#DC2626" />
              ) : (
                <Icon name="log-out" size={16} color="#DC2626" />
              )}
              <Text style={[styles.saveButtonText, {color: '#DC2626'}]}>
                {tt('marketplace_button', 'disconnectLinkedIn') ||
                  'Desconectar LinkedIn'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

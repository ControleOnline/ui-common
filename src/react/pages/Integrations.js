import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
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

import {
  INTEGRATION_LIST,
  parseIntegrationCollection,
} from './integrationsCatalog';
import { createStyles } from './Integrations.styles';

const tt = (type, key) => global.t?.t('configs', type, key);

const resolveIntegrationColors = brandColors => ({
  ...brandColors,
  background: brandColors.background || '#F8FAFC',
  cardBackground: brandColors.cardBackground || brandColors.surface || '#FFFFFF',
  cardBorder: brandColors.cardBorder || brandColors.border || '#E2E8F0',
  cardIconBackground: brandColors.cardIconBackground || brandColors.iconBackground || '#EEF2FF',
  cardIconColor: brandColors.cardIconColor || brandColors.iconColor || '#0F172A',
  cardText: brandColors.cardText || brandColors.textPrimary || brandColors.text || '#0F172A',
  text: brandColors.textPrimary || brandColors.text || '#0F172A',
  mutedText: brandColors.textMuted || brandColors.textSecondary || '#64748B',
  badgeBackground: brandColors.badgeBackground || brandColors.buttonBackgroundSecondary || '#F8FAFC',
  badgeBorder: brandColors.badgeBorder || brandColors.buttonBorderSecondary || '#E2E8F0',
  badgeText: brandColors.badgeText || brandColors.textSecondary || '#64748B',
  badgeSelectedBackground: brandColors.badgeSelectedBackground || brandColors.buttonBackground || '#EFF6FF',
  badgeSelectedBorder: brandColors.badgeSelectedBorder || brandColors.buttonBorder || '#BFDBFE',
  badgeSelectedText: brandColors.badgeSelectedText || brandColors.buttonText || '#0F172A',
  textSuccess: brandColors.textSuccess || '#16A34A',
  textWarning: brandColors.textWarning || '#B45309',
  iconColor: brandColors.iconColor || brandColors.text || '#0F172A',
});

const formatApiError = error => {
  if (!error) return tt('integrations_error', 'load') || 'Nao foi possivel carregar as integracoes.';
  if (typeof error === 'string') return error;
  return (
    error?.message ||
    error?.description ||
    error?.errmsg ||
    tt('integrations_error', 'load') ||
    'Nao foi possivel carregar as integracoes.'
  );
};

const isConnectedValue = value =>
  value === true ||
  value === 1 ||
  value === '1' ||
  String(value).trim().toLowerCase() === 'true';

const renderIntegrationIcon = (integration, resolvedStyles, iconColor) => {
  if (integration.logo) {
    return (
      <Image
        source={integration.logo}
        style={resolvedStyles.integrationLogo}
        resizeMode="contain"
      />
    );
  }

  return (
    <Icon
      name={integration.icon || 'box'}
      size={20}
      color={iconColor}
    />
  );
};

export default function IntegrationsPage({navigation}) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {showError, showInfo} = useToastMessage();

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
  const integrationColors = useMemo(
    () => resolveIntegrationColors(brandColors),
    [brandColors],
  );
  const styles = useMemo(
    () => createStyles(integrationColors),
    [integrationColors],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [integrationItems, setIntegrationItems] = useState([]);

  const providerId = currentCompany?.id;

  const integrationCards = useMemo(() => {
    const responseMap = new Map(
      (integrationItems || []).map(item => [item?.key, item]),
    );

    return INTEGRATION_LIST.map(item => {
      const responseItem = responseMap.get(item.key);

      return {
        ...item,
        connected: isConnectedValue(responseItem?.connected),
      };
    });
  }, [integrationItems]);

  const loadIntegrations = useCallback(async () => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.fetch('/marketplace/integrations', {
        params: {provider_id: providerId},
      });

      setIntegrationItems(parseIntegrationCollection(response));
    } catch (error) {
      showError(formatApiError(error));
      setIntegrationItems([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, showError]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadIntegrations();
    }, [loadIntegrations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadIntegrations();
    } finally {
      setRefreshing(false);
    }
  }, [loadIntegrations]);

  const handleOpenIntegration = useCallback(
    integration => {
      if (!integration.route) {
        showInfo(tt('integrations_text', 'unavailable') || 'Essa integracao ainda nao esta disponivel.');
        return;
      }

      navigation.navigate(integration.route, {
        providerKey: integration.routeParams?.providerKey || integration.key,
      });
    },
    [navigation, showInfo],
  );

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color={integrationColors.iconColor} />
          <Text style={styles.centerStateTitle}>{tt('integrations_title', 'selectCompany') || 'Selecione uma empresa'}</Text>
          <Text style={styles.centerStateText}>
            {tt('integrations_text', 'selectCompany') || 'O hub de integracoes depende da empresa ativa.'}
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
          <Text style={styles.centerStateTitle}>{tt('integrations_title', 'loading') || 'Carregando integracoes'}</Text>
          <Text style={styles.centerStateText}>
            {tt('integrations_text', 'loading') || 'Buscando o status de conexao da empresa ativa.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{tt('integrations_title', 'integrations') || 'Integracoes'}</Text>
          <Text style={styles.pageSubtitle}>
            {tt('integrations_text', 'pageSubtitle') ||
              'Toque em uma integracao para abrir a configuracao. O status mostra se a empresa ativa ja tem as credenciais necessarias.'}
          </Text>
        </View>

        <View style={styles.integrationGrid}>
          {integrationCards.map(integration => {
            const connected = Boolean(integration.connected);
            const statusTone = connected
              ? (integrationColors.textSuccess || integrationColors.badgeSelectedText)
              : (integrationColors.textWarning || integrationColors.badgeText);
            const statusText = connected
              ? tt('integrations_status', 'connected') || 'Conectado'
              : tt('integrations_status', 'pending') || 'Pendente';
            const statusBackgroundColor = connected
              ? (integrationColors.badgeSelectedBackground || withOpacity(statusTone, 0.12))
              : (integrationColors.badgeBackground || withOpacity(statusTone, 0.12));
            const statusBorderColor = connected
              ? (integrationColors.badgeSelectedBorder || withOpacity(statusTone, 0.22))
              : (integrationColors.badgeBorder || withOpacity(statusTone, 0.22));

            return (
              <TouchableOpacity
                key={integration.key}
                style={styles.integrationCard}
                activeOpacity={0.9}
                onPress={() => handleOpenIntegration(integration)}>
                <View style={styles.integrationTopRow}>
                  <View style={styles.integrationHeaderLeft}>
                    <View style={styles.integrationIconWrap}>
                      {renderIntegrationIcon(integration, styles, integrationColors.cardIconColor)}
                    </View>
                    <Text style={styles.integrationTitle} numberOfLines={1}>
                      {integration.label}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.integrationStatus,
                      {
                        backgroundColor: statusBackgroundColor,
                        borderColor: statusBorderColor,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.integrationStatusText,
                        {color: statusTone},
                      ]}>
                      {statusText}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.

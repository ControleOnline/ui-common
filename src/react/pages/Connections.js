import React, { useCallback, useMemo } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import { createStyles } from './Connections.styles';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';

const tt = (type, key) => global.t?.t('configs', type, key);

const resolveShadowStyle = textColor =>
  Platform.select({
    ios: {
      shadowColor: textColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 3 },
    web: { boxShadow: `0 10px 24px ${withOpacity(textColor, 0.08)}` },
  });

const formatPhoneLabel = phone => {
  if (!phone) return tt('connections_label', 'notProvided') || 'Nao informado';
  if (typeof phone === 'string') return phone;
  const ddd = String(phone?.ddd || '').trim();
  const digits = String(phone?.phone || '').replace(/\D/g, '');
  if (!ddd && !digits) return tt('connections_label', 'notProvided') || 'Nao informado';
  if (!digits) return `(${ddd})`;
  const lastFour = digits.slice(-4);
  const firstPart = digits.slice(0, -4);
  if (!firstPart) return ddd ? `(${ddd}) ${lastFour}` : lastFour;
  return ddd ? `(${ddd}) ${firstPart}-${lastFour}` : `${firstPart}-${lastFour}`;
};

const formatStatusLabel = status => {
  if (!status) return tt('connections_status', 'unknown') || '—';
  if (typeof status === 'string') return status;
  return status?.status || status?.name || '—';
};

export default function Connections() {
  const navigation = useNavigation();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const connectionsStore = useStore('connections');

  const { currentCompany } = peopleStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};
  const items = connectionsStore.getters?.items;
  const totalItems = connectionsStore.getters?.totalItems;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const styles = useMemo(() => createStyles(brandColors), [brandColors]);
  const shadowStyle = useMemo(
    () => resolveShadowStyle(brandColors.text),
    [brandColors.text],
  );

  const providerId = currentCompany?.id;
  const peopleIri = useMemo(
    () => (providerId ? `/people/${String(providerId).replace(/\D/g, '')}` : ''),
    [providerId],
  );

  const requestParams = useMemo(
    () => (peopleIri ? { people: peopleIri } : {}),
    [peopleIri],
  );

  const connectionCount = useMemo(() => {
    if (typeof totalItems === 'number' && totalItems > 0) return totalItems;
    return Array.isArray(items) ? items.length : 0;
  }, [items, totalItems]);

  useFocusEffect(
    useCallback(() => {
      if (!peopleIri || typeof connectionsStore.actions?.getItems !== 'function') {
        return;
      }
      connectionsStore.actions.getItems({ people: peopleIri });
    }, [peopleIri]),
  );

  const openWhatsAppChannel = useCallback(() => {
    navigation.navigate('WhatsAppConnectionPage');
  }, [navigation]);

  const renderConnectionCard = useCallback(
    ({ item }) => {
      if (!item) return null;
      return (
        <View>
          <Text style={styles.previewName}>
            {item.name || tt('connections_label', 'unnamed') || 'Sem nome'}
          </Text>
          <Text style={styles.previewPhone}>{formatPhoneLabel(item.phone)}</Text>
          <Text style={styles.previewStatus}>{formatStatusLabel(item.status)}</Text>
        </View>
      );
    },
    [styles.previewName, styles.previewPhone, styles.previewStatus],
  );

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color={brandColors.textSecondary} />
          <Text style={styles.centerStateTitle}>
            {tt('connections_title', 'selectCompany') || 'Selecione uma empresa'}
          </Text>
          <Text style={styles.centerStateText}>
            {tt('connections_text', 'selectCompany') ||
              'As conexoes disponiveis dependem da empresa ativa.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: brandColors.background }]}
      edges={['bottom']}>
      <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>
            {tt('connections_eyebrow', 'communication') || 'COMUNICACAO'}
          </Text>
          <Text style={styles.heroTitle}>
            {tt('connections_title', 'connections') || 'Conexoes'}
          </Text>
          <Text style={styles.heroText}>
            {tt('connections_text', 'hero') ||
              'Gerencie os canais de comunicacao conectados com a sua operacao.'}
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <Icon name="radio" size={22} color={brandColors.primary} />
        </View>
      </View>

      <View style={styles.companyRow}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyBadgeText}>
            {`${connectionCount} ${tt('connections_label', 'connections') || 'conexoes'}`}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={openWhatsAppChannel}
        style={[styles.channelCard, shadowStyle]}>
        <View style={styles.channelTopRow}>
          <View
            style={[
              styles.channelIconWrap,
              { backgroundColor: withOpacity(brandColors.success, 0.12) },
            ]}>
            <Icon name="message-circle" size={20} color={brandColors.success} />
          </View>
          <View style={styles.channelStatusPill}>
            <Text style={styles.channelStatusText}>
              {connectionCount > 0
                ? `${connectionCount} ${tt('connections_status', 'configured') || 'configurada(s)'}`
                : tt('connections_status', 'readyToConfigure') || 'Pronta para configurar'}
            </Text>
          </View>
        </View>
        <Text style={styles.channelTitle}>
          {tt('connections_label', 'whatsApp') || 'WhatsApp'}
        </Text>
        <Text style={styles.channelDescription}>
          {tt('connections_text', 'whatsApp') ||
            'Conecte numeros, acompanhe status e gere o QR Code de autenticacao.'}
        </Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>
            {tt('connections_button', 'openChannel') || 'Abrir canal'}
          </Text>
          <Icon name="arrow-right" size={18} color={brandColors.primary} />
        </View>
      </TouchableOpacity>

      <View style={{ flex: 1, marginTop: 12 }}>
        <DefaultTable
          storeName="connections"
          requestParams={requestParams}
          initialViewMode="cards"
          forceCardsOnCompact
          showToolbar
          showRowActions={false}
          showColumnFiltersButton
          onRowPress={openWhatsAppChannel}
          renderCard={renderConnectionCard}
          searchProps={{
            compact: true,
            placeholder:
              tt('connections_label', 'search') || 'Buscar conexao, telefone ou status',
            searchKey: 'search',
            storeName: 'connections',
          }}
          totalItemsLabel="connections"
          visibleColumnsPreferenceKey="connections"
          accentColor={brandColors.primary}
          onAdd={openWhatsAppChannel}
          add
          addLabel={tt('connections_button', 'openChannel') || 'Abrir canal'}
        />
      </View>
    </SafeAreaView>
  );
}

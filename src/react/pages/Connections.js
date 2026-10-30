import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { useStore } from '@store';
import { colors } from '@controleonline/ui-layout/src/styles/colors';
import { createStyles } from './Connections.styles';
import { resolveThemePalette } from '@controleonline/ui-layout/src/styles/branding';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';

const tt = (type, key) => global.t?.t('configs', type, key);

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
  if (!status) return '—';
  if (typeof status === 'string') return status;
  return status?.status || status?.name || '—';
};

const formatChannelLabel = channel => {
  if (channel === 'whatsapp_official') return 'WhatsApp Oficial';
  if (channel === 'whatsapp') return 'WhatsApp';
  return channel || '—';
};

export default function Connections() {
  const navigation = useNavigation();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const connectionsStore = useStore('connections');

  const { currentCompany } = peopleStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany],
  );

  const styles = useMemo(() => createStyles(brandColors), [brandColors]);

  const providerId = currentCompany?.id;
  const peopleIri = useMemo(
    () => (providerId ? `/people/${String(providerId).replace(/\D/g, '')}` : ''),
    [providerId],
  );

  const requestParams = useMemo(
    () => (peopleIri ? { people: peopleIri } : {}),
    [peopleIri],
  );

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
          <Text style={styles.previewStatus}>
            {formatChannelLabel(item.channel)} · {formatStatusLabel(item.status)}
          </Text>
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
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
        <DefaultTable
          storeName="connections"
          requestParams={requestParams}
          initialViewMode="table"
          forceCardsOnCompact
          showToolbar
          showRowActions={false}
          showColumnFiltersButton
          onRowPress={openWhatsAppChannel}
          renderCard={renderConnectionCard}
          showSearch
          searchPlaceholder={
            tt('connections_label', 'search') || 'Buscar conexao, telefone ou status'
          }
          searchKey="search"
          totalItemsLabel="connections"
          visibleColumnsPreferenceKey="connections"
          accentColor={brandColors.primary}
          onAdd={openWhatsAppChannel}
          add
          addLabel={tt('connections_button', 'openChannel') || 'Configurar WhatsApp'}
        />
      </View>
    </SafeAreaView>
  );
}

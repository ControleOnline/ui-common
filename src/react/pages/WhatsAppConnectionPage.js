import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import QRCode from 'react-native-qrcode-svg';

import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import { createStyles } from './WhatsAppConnectionPage.styles';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import WhatsAppProviderForm from './WhatsAppProviderForm';
import {
  CHANNEL_WHATSAPP_OFFICIAL,
  PROVIDER_OFFICIAL,
  PROVIDER_UNOFFICIAL,
  extractDigits,
  formatApiError,
  formatPhoneLabel,
  normalizeConnection,
  toArray,
} from './whatsAppConnectionHelpers';

export default function WhatsAppConnectionPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const connectionsStore = useStore('connections');
  const connectionsActions = connectionsStore.actions || {};

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

  const [providerMode, setProviderMode] = useState(PROVIDER_UNOFFICIAL);
  const [ddi, setDdi] = useState('55');
  const [ddd, setDdd] = useState('');
  const [phone, setPhone] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [apiVersion, setApiVersion] = useState('v22.0');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStatusIri, setSelectedStatusIri] = useState(null);
  const [qrValue, setQrValue] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const pollingRef = useRef(null);

  const completePhone = useMemo(
    () => `${extractDigits(ddi)}${extractDigits(ddd)}${extractDigits(phone)}`,
    [ddi, ddd, phone],
  );

  const showError = useCallback(message => {
    setFeedback({ type: 'error', message: String(message || 'Erro') });
  }, []);
  const showSuccess = useCallback(message => {
    setFeedback({ type: 'success', message: String(message || 'OK') });
  }, []);
  const showInfo = useCallback(message => {
    setFeedback({ type: 'info', message: String(message || '') });
  }, []);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const resolveStatusIri = useCallback(
    item => {
      const status = item?.status;
      if (!status) return selectedStatusIri;
      if (typeof status === 'string' && status.startsWith('/')) return status;
      if (typeof status === 'object') {
        return status['@id'] || status.id || selectedStatusIri;
      }
      return selectedStatusIri;
    },
    [selectedStatusIri],
  );

  const requestQrCode = useCallback(
    async phoneNumber => {
      const targetPhone = extractDigits(phoneNumber);
      if (!targetPhone) {
        showError('Informe DDI, DDD e telefone para gerar o QR Code.');
        return null;
      }
      try {
        setSubmitting(true);
        const response = await connectionsActions.createWhatsappConnection({
          phone: targetPhone,
        });
        const nextStatus = String(response?.status || '').trim();
        const nextQr = String(response?.qr || '').trim();
        setConnectionStatus(nextStatus || 'Aguardando autenticacao');
        if (nextQr) setQrValue(nextQr);
        if (nextStatus === 'CONNECTED') {
          clearPolling();
          setQrValue('');
          showSuccess('WhatsApp conectado com sucesso.');
          connectionsStore.actions?.getItems?.({ people: peopleIri });
        }
        return response;
      } catch (error) {
        clearPolling();
        showError(formatApiError(error));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [
      clearPolling,
      connectionsActions,
      connectionsStore.actions,
      peopleIri,
      showError,
      showSuccess,
    ],
  );

  const startPolling = useCallback(
    async selectedPhone => {
      const targetPhone = extractDigits(selectedPhone || completePhone);
      if (!targetPhone) {
        showError('Informe DDI, DDD e telefone para gerar o QR Code.');
        return;
      }
      clearPolling();
      const response = await requestQrCode(targetPhone);
      if (response?.status === 'CONNECTED') return;
      showInfo('Aguardando autenticacao do WhatsApp pelo QR Code.');
      pollingRef.current = setInterval(() => {
        requestQrCode(targetPhone);
      }, 5000);
    },
    [clearPolling, completePhone, requestQrCode, showError, showInfo],
  );

  const saveOfficialConnection = useCallback(async () => {
    const token = String(accessToken || '').trim();
    const pnid = String(phoneNumberId || '').trim();
    if (!token || !pnid) {
      showError('Informe access token e phone_number_id da Cloud API.');
      return null;
    }
    if (!peopleIri) {
      showError('Selecione uma empresa.');
      return null;
    }

    const items = toArray(connectionsStore.getters?.items).map(normalizeConnection);
    const statusIri =
      selectedStatusIri ||
      items.map(i => i.statusIri).find(Boolean) ||
      null;

    if (!selectedId && !statusIri) {
      showError(
        'Nao foi possivel resolver o status. Selecione uma conexao existente na lista ou crie uma nao oficial antes.',
      );
      return null;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: selectedId || undefined,
        accessToken: token,
        phoneNumberId: pnid,
        apiVersion: apiVersion || 'v22.0',
        people: peopleIri,
        name: `WA Oficial ${pnid}`.slice(0, 50),
        type: 'relationship',
        status: statusIri || undefined,
      };
      const response = await connectionsActions.saveOfficialWhatsappConnection(payload);
      showSuccess(
        selectedId
          ? 'Conexao atualizada para canal oficial (Cloud API).'
          : 'Conexao oficial salva. Envios usarao a Cloud API.',
      );
      setConnectionStatus('CONNECTED');
      setQrValue('');
      setProviderMode(PROVIDER_OFFICIAL);
      connectionsStore.actions?.getItems?.({ people: peopleIri });
      return response;
    } catch (error) {
      showError(formatApiError(error));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [
    accessToken,
    phoneNumberId,
    apiVersion,
    peopleIri,
    selectedId,
    selectedStatusIri,
    connectionsActions,
    connectionsStore.getters?.items,
    connectionsStore.actions,
    showError,
    showSuccess,
  ]);

  const handlePrimaryAction = useCallback(async () => {
    if (providerMode === PROVIDER_OFFICIAL) {
      return saveOfficialConnection();
    }
    return startPolling(completePhone);
  }, [providerMode, saveOfficialConnection, startPolling, completePhone]);

  const handleUseExistingConnection = useCallback(item => {
    const raw = item || {};
    const normalized = normalizeConnection(raw);
    const nextDdi = String(raw?.phone?.ddi || '55');
    const nextDdd = String(raw?.phone?.ddd || '');
    const nextPhone = extractDigits(raw?.phone?.phone || '');
    setDdi(nextDdi);
    setDdd(nextDdd);
    setPhone(nextPhone);
    setConnectionStatus(normalized.status || 'Pendente');
    setQrValue('');
    setSelectedId(normalized.numericId || null);
    setSelectedStatusIri(normalized.statusIri || null);
    setProviderMode(
      normalized.channel === CHANNEL_WHATSAPP_OFFICIAL
        ? PROVIDER_OFFICIAL
        : PROVIDER_UNOFFICIAL,
    );
    setAccessToken('');
    setPhoneNumberId('');
    setFeedback({
      type: 'info',
      message: `Conexao #${normalized.numericId || '—'} selecionada. Ajuste o canal e salve.`,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (peopleIri) {
        connectionsStore.actions?.getItems?.({ people: peopleIri });
      }
      return () => clearPolling();
    }, [peopleIri, clearPolling]),
  );

  useEffect(() => () => clearPolling(), [clearPolling]);

  const renderConnectionCard = useCallback(
    ({ item }) => {
      if (!item) return null;
      const n = normalizeConnection(item);
      return (
        <View>
          <Text style={styles.previewName}>{n.name}</Text>
          <Text style={styles.previewMeta}>
            {n.phoneLabel} · {n.channel} · {n.status}
          </Text>
        </View>
      );
    },
    [styles],
  );

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: brandColors.background }]}
      edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled">
        {feedback ? (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor:
                  feedback.type === 'error'
                    ? withOpacity('#ef4444', 0.12)
                    : feedback.type === 'success'
                      ? withOpacity('#10b981', 0.12)
                      : withOpacity('#2563eb', 0.1),
              },
            ]}>
            <Text style={styles.feedbackText}>{feedback.message}</Text>
          </View>
        ) : null}

        {selectedId ? (
          <Text style={styles.selectedHint}>
            Editando conexao #{selectedId}
            {providerMode === PROVIDER_OFFICIAL ? ' · modo oficial' : ''}
          </Text>
        ) : null}

        <WhatsAppProviderForm
          styles={styles}
          brandColors={brandColors}
          providerMode={providerMode}
          setProviderMode={setProviderMode}
          ddi={ddi}
          setDdi={setDdi}
          ddd={ddd}
          setDdd={setDdd}
          phone={phone}
          setPhone={setPhone}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          phoneNumberId={phoneNumberId}
          setPhoneNumberId={setPhoneNumberId}
          apiVersion={apiVersion}
          setApiVersion={setApiVersion}
          submitting={submitting}
          onPrimaryAction={handlePrimaryAction}
        />

        {connectionStatus ? (
          <Text style={styles.statusLine}>Status: {connectionStatus}</Text>
        ) : null}

        {qrValue ? (
          <View style={styles.qrWrap}>
            <QRCode value={qrValue} size={180} />
          </View>
        ) : null}

        <View style={{ minHeight: 280, marginTop: 16 }}>
          <DefaultTable
            storeName="connections"
            requestParams={requestParams}
            initialViewMode="table"
            forceCardsOnCompact
            showToolbar
            showRowActions={false}
            showColumnFiltersButton={false}
            showSearch
            searchKey="search"
            searchPlaceholder="Buscar conexao"
            onRowPress={handleUseExistingConnection}
            renderCard={renderConnectionCard}
            totalItemsLabel="connections"
            visibleColumnsPreferenceKey="whatsapp-connections"
            accentColor={brandColors.primary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

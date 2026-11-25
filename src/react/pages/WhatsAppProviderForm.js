import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import { PROVIDER_OFFICIAL, PROVIDER_UNOFFICIAL } from './whatsAppConnectionHelpers';

export default function WhatsAppProviderForm({
  styles,
  brandColors,
  providerMode,
  setProviderMode,
  accessToken,
  setAccessToken,
  phoneNumberId,
  setPhoneNumberId,
  apiVersion,
  setApiVersion,
  submitting,
  onPrimaryAction,
  embeddedSignupAvailable,
  onEmbeddedSignup,
}) {
  return (
    <>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setProviderMode(PROVIDER_UNOFFICIAL)}
          style={[
            styles.statusBadge,
            {
              marginRight: 8,
              backgroundColor:
                providerMode === PROVIDER_UNOFFICIAL
                  ? withOpacity('#2563EB', 0.18)
                  : withOpacity('#94A3B8', 0.12),
            },
          ]}>
          <Text style={styles.statusBadgeText}>Nao oficial (QR)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setProviderMode(PROVIDER_OFFICIAL)}
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                providerMode === PROVIDER_OFFICIAL
                  ? withOpacity('#10b981', 0.18)
                  : withOpacity('#94A3B8', 0.12),
            },
          ]}>
          <Text style={styles.statusBadgeText}>Oficial (Cloud API)</Text>
        </TouchableOpacity>
      </View>

      {providerMode === PROVIDER_OFFICIAL && embeddedSignupAvailable ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.inputLabel}>Conectar pelo Facebook</Text>
          {[
            [true, 'Numero do app WhatsApp Business', 'smartphone', 'Continua no celular; autorize pelo QR Code no app.'],
            [false, 'Numero novo', 'plus-circle', 'O Meta verifica o numero por SMS ou ligacao.'],
          ].map(([coexistence, label, icon, hint]) => (
            <TouchableOpacity
              key={label}
              activeOpacity={0.9}
              disabled={submitting}
              onPress={() => onEmbeddedSignup(coexistence)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: withOpacity('#1877F2', 0.35),
                backgroundColor: withOpacity('#1877F2', 0.06),
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
                opacity: submitting ? 0.6 : 1,
              }}>
              <Icon name={icon} size={18} color="#1877F2" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#0F172A', fontWeight: '600' }}>{label}</Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>{hint}</Text>
              </View>
              <Icon name="chevron-right" size={18} color="#1877F2" />
            </TouchableOpacity>
          ))}
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>Ou informe manualmente</Text>
        </View>
      ) : null}

      {providerMode === PROVIDER_OFFICIAL ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.inputLabel}>Access token (Meta)</Text>
          <TextInput
            style={styles.input}
            value={accessToken}
            onChangeText={setAccessToken}
            placeholder="EAAG..."
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            secureTextEntry
          />
          <Text style={[styles.inputLabel, { marginTop: 8 }]}>Phone number ID</Text>
          <TextInput
            style={styles.input}
            value={phoneNumberId}
            onChangeText={setPhoneNumberId}
            placeholder="123456789012345"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="number-pad"
          />
          <Text style={[styles.inputLabel, { marginTop: 8 }]}>API version</Text>
          <TextInput
            style={styles.input}
            value={apiVersion}
            onChangeText={setApiVersion}
            placeholder="v22.0"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={submitting}
        onPress={onPrimaryAction}
        style={[
          styles.primaryButton,
          { backgroundColor: brandColors.primary },
          submitting && styles.primaryButtonDisabled,
        ]}>
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Icon
              name={providerMode === PROVIDER_OFFICIAL ? 'cloud' : 'smartphone'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              {providerMode === PROVIDER_OFFICIAL
                ? 'Salvar conexao oficial'
                : 'Solicitar QR Code'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );
}

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

import React from 'react';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import PaymentTypesByWalletTab from '@controleonline/ui-common/src/react/pages/SettingsPage/PaymentTypesByWalletTab';
import styles from '../../DeviceDetailPage.styles';

/**
 * PDV payment types tab.
 * Refs: app-community#382
 */
export default function DeviceDetailPaymentSection(ctx) {
  const {
    showPdvPaymentTypesTab, renderHelpButton, currentCompany, configs,
    savePaymentTypeConfigs, savingPaymentTypes,
  } = ctx;

  if (!showPdvPaymentTypesTab) return null;

  return (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Pagamentos do device
            </Text>
            {renderHelpButton(
              'Pagamentos do device',
              'Selecione os meios de pagamento que este device pode exibir e usar nas opções de pagamento. Os wallets entram só para organizar a lista.',
            )}
          </View>
          <PaymentTypesByWalletTab
            currentCompanyId={currentCompany?.id}
            configs={configs}
            disableSelection={savingPaymentTypes}
            isSaving={savingPaymentTypes}
            onPersistSelectedPaymentTypeIds={savePaymentTypeConfigs}
          />
        </View>
  );
}

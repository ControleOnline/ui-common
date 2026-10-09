import React, {useRef, useState} from 'react';
import {Text, View} from 'react-native';
import {ORDER_CHARGE_ENABLED_CONFIG_KEY, isOrderChargeEnabled} from '../../../config/deviceConfigBootstrap';
import styles from '../../DeviceDetailPage.styles';

export default function DeviceChargePermissionSection({configs, actionsRef, currentCompany,
  deviceString, deviceType, refreshCurrentConfig, showSystemError, renderSwitchRow, brandColors}) {
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  async function save(value) {
    if (pending.current || !currentCompany?.id || !deviceString) return;
    pending.current = true;
    setSaving(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({device: deviceString,
        people: `/people/${currentCompany.id}`, type: deviceType,
        configs: JSON.stringify({[ORDER_CHARGE_ENABLED_CONFIG_KEY]: value})});
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(error, 'Não foi possível salvar a permissão de cobrança.');
    } finally {pending.current = false; setSaving(false);}
  }
  const enabled = isOrderChargeEnabled(configs);
  return <View style={styles.configCard}>
    {renderSwitchRow({label: 'Permitir cobrança neste device', value: enabled,
      valueLabel: enabled ? 'Permitida' : 'Desabilitada',
      disabled: saving || !deviceString || !currentCompany?.id, onValueChange: save})}
    <Text style={[styles.deviceString, {color: brandColors.textSecondary}]}>
      A cobrança usa os meios de pagamento e o destino configurados. O sistema valida a autorização para receber aqui ou encaminhar a outro device.
    </Text>
  </View>;
}

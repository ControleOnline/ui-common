import {useCallback, useState} from 'react';
import {executeCopyDeviceConfigs} from '@controleonline/ui-common/src/react/utils/copyDeviceConfigs';

/**
 * Copy device_config from another company device onto the current detail target.
 * Refs: app-community#629
 */
export default function useDeviceDetailCopyConfig({
  actionsRef,
  alias,
  currentCompanyId,
  deviceString,
  loadCompanyConfigs,
  messageApi,
  refreshCurrentConfig,
  showSystemError,
}) {
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyingConfig, setCopyingConfig] = useState(false);

  const openCopyConfigModal = useCallback(() => {
    if (!deviceString || copyingConfig) {
      return;
    }
    setCopyModalVisible(true);
    loadCompanyConfigs?.();
  }, [deviceString, copyingConfig, loadCompanyConfigs]);

  const closeCopyConfigModal = useCallback(() => {
    if (copyingConfig) {
      return;
    }
    setCopyModalVisible(false);
  }, [copyingConfig]);

  const handleCopyConfigConfirm = useCallback(
    async sourceOption => {
      if (!sourceOption || !currentCompanyId || !deviceString || copyingConfig) {
        return;
      }
      setCopyingConfig(true);
      try {
        const summary = await executeCopyDeviceConfigs({
          addDeviceConfigs: params =>
            actionsRef.current.deviceConfigActions.addDeviceConfigs(params),
          sourceConfigs: sourceOption.configs || [],
          destinationDeviceString: deviceString,
          peopleIri: `/people/${currentCompanyId}`,
        });
        setCopyModalVisible(false);
        await refreshCurrentConfig?.();
        const keysLabel =
          summary.keys && summary.keys.length
            ? summary.keys.join(', ')
            : '(nenhuma chave)';
        messageApi?.showSuccess?.(
          `Configurações copiadas (${(summary.types || []).join(', ') || '—'}). Chaves: ${keysLabel}`,
        );
      } catch (error) {
        showSystemError?.(
          error,
          'Não foi possível copiar as configurações do device.',
        );
      } finally {
        setCopyingConfig(false);
      }
    },
    [
      actionsRef,
      copyingConfig,
      currentCompanyId,
      deviceString,
      messageApi,
      refreshCurrentConfig,
      showSystemError,
    ],
  );

  return {
    alias,
    copyModalVisible,
    copyingConfig,
    openCopyConfigModal,
    closeCopyConfigModal,
    handleCopyConfigConfirm,
  };
}

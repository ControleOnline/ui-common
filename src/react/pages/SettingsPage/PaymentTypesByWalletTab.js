import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import DefaultTooltip from '@controleonline/ui-default/src/react/components/help/DefaultTooltip';
import {
  groupWalletPaymentTypesByWalletId,
  normalizeEntityId,
  resolveDevicePaymentTypeIds,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const resolveWalletLabel = wallet => {
  return String(wallet?.wallet ?? '').trim();
};

const resolvePaymentTypeLabel = walletPaymentType => {
  const paymentType = walletPaymentType?.paymentType;

  if (!paymentType || typeof paymentType !== 'object') {
    return '';
  }

  return String(paymentType.paymentType ?? '').trim();
};

const localStyles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingBottom: 8,
  },
  introCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  introHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  introTitle: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginTop: 14,
    padding: 14,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  walletList: {
    marginTop: 12,
    gap: 12,
  },
  walletCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  walletCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletMeta: {
    flex: 1,
    minWidth: 0,
  },
  walletName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  walletId: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  paymentTypesBlock: {
    marginTop: 12,
  },
  paymentTypesTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  paymentTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentTypeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  paymentTypeChipSelected: {
    backgroundColor: '#1B5587',
    borderColor: '#1B5587',
  },
  paymentTypeChipDisabled: {
    opacity: 0.55,
  },
  paymentTypeChipText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  paymentTypeChipTextSelected: {
    color: '#FFFFFF',
  },
  paymentTypesEmpty: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
  footerHintRow: {
    marginTop: 12,
  },
  footerHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
  },
});

const PaymentTypesByWalletTab = ({
  configs,
  currentCompanyId,
  disableSelection = false,
  isSaving = false,
  onPersistSelectedPaymentTypeIds,
  title = 'Pagamentos',
  introText = 'Os wallets organizam a lista, mas o que vale é a seleção dos meios de pagamento.',
  helpText = 'Esta seleção é a fonte usada pelo runtime para mostrar os pagamentos disponíveis neste contexto.',
  loadingWalletsText = 'Carregando wallets da empresa...',
  loadingPaymentsText = 'Carregando meios de pagamento...',
  emptyTitle = 'Nenhuma wallet encontrada',
  emptyText = 'Não há wallets carregadas para a empresa ativa.',
  emptyPaymentsText = 'Nenhum meio de pagamento vinculado a esta wallet.',
  unassignedTitle = 'Sem carteira',
  unassignedText = 'Meios de pagamento sem wallet vinculada.',
}) => {
  const walletStore = useStore('wallet');
  const {getters: walletGetters, actions: walletActions} = walletStore;

  const wallets = Array.isArray(walletGetters.items) ? walletGetters.items : [];
  const walletsLoading = walletGetters.isLoading === true;
  const [selectedPaymentTypeIds, setSelectedPaymentTypeIds] = useState([]);
  const [walletPaymentTypes, setWalletPaymentTypes] = useState([]);
  const [walletPaymentTypesLoading, setWalletPaymentTypesLoading] =
    useState(false);

  useEffect(() => {
    if (!currentCompanyId) {
      walletActions.setItems([]);
      setWalletPaymentTypes([]);
      setWalletPaymentTypesLoading(false);
      return;
    }

    let cancelled = false;

    walletActions
      .getItems({people: currentCompanyId})
      .catch(() => {
        walletActions.setItems([]);
      });

    setWalletPaymentTypesLoading(true);
    api
      .fetch('wallet_payment_types', {
        params: {
          'wallet.people': currentCompanyId,
        },
      })
      .then(response => {
        if (cancelled) {
          return;
        }

        const items = Array.isArray(response?.member)
          ? response.member
          : Array.isArray(response?.['hydra:member'])
            ? response['hydra:member']
            : Array.isArray(response)
              ? response
              : [];

        setWalletPaymentTypes(items);
      })
      .catch(() => {
        if (!cancelled) {
          setWalletPaymentTypes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWalletPaymentTypesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentCompanyId, walletActions]);

  useEffect(() => {
    const nextSelectedPaymentTypeIds = resolveDevicePaymentTypeIds(configs);
    setSelectedPaymentTypeIds(current => {
      const currentSignature = current
        .map(normalizeEntityId)
        .filter(Boolean)
        .join(',');
      const nextSignature = nextSelectedPaymentTypeIds
        .map(normalizeEntityId)
        .filter(Boolean)
        .join(',');

      return currentSignature === nextSignature
        ? current
        : nextSelectedPaymentTypeIds;
    });
  }, [configs]);

  const selectedPaymentTypeIdSet = useMemo(
    () => new Set(selectedPaymentTypeIds.map(normalizeEntityId).filter(Boolean)),
    [selectedPaymentTypeIds],
  );

  const walletGroups = useMemo(() => {
    const groupedPaymentTypes = groupWalletPaymentTypesByWalletId(
      walletPaymentTypes,
    );
    const groupedWalletIds = new Set();

    const groups = wallets
      .map(wallet => {
        const walletId = normalizeEntityId(wallet?.id);

        if (!walletId) {
          return null;
        }

        groupedWalletIds.add(walletId);

        return {
          key: walletId,
          walletId,
          wallet,
          paymentTypes: groupedPaymentTypes[walletId] ?? [],
          isUnassigned: false,
        };
      })
      .filter(Boolean);

    Object.entries(groupedPaymentTypes).forEach(([walletId, paymentTypes]) => {
      if (walletId === '__unassigned' || groupedWalletIds.has(walletId)) {
        return;
      }

      groups.push({
        key: `wallet-${walletId}`,
        walletId,
        wallet: paymentTypes[0]?.wallet ?? null,
        paymentTypes,
        isUnassigned: false,
      });
    });

    const unassignedPaymentTypes = groupedPaymentTypes.__unassigned ?? [];
    if (unassignedPaymentTypes.length > 0) {
      groups.push({
        key: '__unassigned',
        walletId: '',
        wallet: null,
        paymentTypes: unassignedPaymentTypes,
        isUnassigned: true,
      });
    }

    return groups;
  }, [walletPaymentTypes, wallets]);

  const persistSelectedPaymentTypeIds = useCallback(
    nextSelectedPaymentTypeIds => {
      if (typeof onPersistSelectedPaymentTypeIds !== 'function') {
        return Promise.resolve(nextSelectedPaymentTypeIds);
      }

      return Promise.resolve(onPersistSelectedPaymentTypeIds(nextSelectedPaymentTypeIds));
    },
    [onPersistSelectedPaymentTypeIds],
  );

  const handleTogglePaymentType = useCallback(
    paymentTypeId => {
      const normalizedPaymentTypeId = normalizeEntityId(paymentTypeId);

      if (!normalizedPaymentTypeId || isSaving || disableSelection) {
        return;
      }

      const currentIds = [
        ...new Set(
          selectedPaymentTypeIds.map(normalizeEntityId).filter(Boolean),
        ),
      ];
      const nextIdsSet = new Set(currentIds);
      const wasSelected = nextIdsSet.has(normalizedPaymentTypeId);

      if (wasSelected) {
        nextIdsSet.delete(normalizedPaymentTypeId);
      } else {
        nextIdsSet.add(normalizedPaymentTypeId);
      }

      const nextSelectedIds = currentIds.filter(id => nextIdsSet.has(id));
      if (!wasSelected) {
        nextSelectedIds.push(normalizedPaymentTypeId);
      }

      setSelectedPaymentTypeIds(nextSelectedIds);
      persistSelectedPaymentTypeIds(nextSelectedIds).catch(error => {
        Alert.alert(
          'Erro ao gravar configurações',
          error?.message ?? JSON.stringify(error),
        );
        setSelectedPaymentTypeIds(resolveDevicePaymentTypeIds(configs));
      });
    },
    [
      configs,
      disableSelection,
      isSaving,
      selectedPaymentTypeIds,
      persistSelectedPaymentTypeIds,
    ],
  );

  const hasWallets = wallets.length > 0;
  const hasPaymentTypes = walletPaymentTypes.length > 0;
  const hasVisibleGroups = walletGroups.length > 0;
  const selectionEnabled = !isSaving && !disableSelection;

  return (
    <View style={localStyles.container}>
      <View style={localStyles.introCard}>
        <View style={localStyles.introHeaderRow}>
          <Text style={localStyles.introTitle}>{title}</Text>
          <DefaultTooltip
            title={title}
            message={`${introText} ${helpText}`.trim()}
          />
        </View>
      </View>

      {walletsLoading ? (
        <StateStore compact loading={loadingWalletsText} />
      ) : null}

      {!walletsLoading && walletPaymentTypesLoading ? (
        <StateStore compact loading={loadingPaymentsText} />
      ) : null}

      {!walletsLoading && !hasWallets && !hasPaymentTypes ? (
        <View style={localStyles.emptyCard}>
          <Text style={localStyles.emptyTitle}>{emptyTitle}</Text>
          <Text style={localStyles.emptyText}>{emptyText}</Text>
        </View>
      ) : null}

      {hasVisibleGroups ? (
        <View style={localStyles.walletList}>
          {walletGroups.map(group => {
            const walletLabel = group.isUnassigned
              ? unassignedTitle
              : resolveWalletLabel(group.wallet);

            return (
              <View key={group.key} style={localStyles.walletCard}>
                <View style={localStyles.walletCardHeader}>
                  <View style={localStyles.walletMeta}>
                    <Text style={localStyles.walletName}>{walletLabel}</Text>
                    {!group.isUnassigned && (
                      <Text style={localStyles.walletId}>
                        {group.walletId ? `ID #${group.walletId}` : ''}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={localStyles.paymentTypesBlock}>
                  <Text style={localStyles.paymentTypesTitle}>
                    Meios de pagamento
                  </Text>
                  {group.paymentTypes.length > 0 ? (
                    <View style={localStyles.paymentTypesRow}>
                      {group.paymentTypes.map(item => {
                        const walletPaymentTypeId = normalizeEntityId(item?.id);
                        if (!walletPaymentTypeId) {
                          return null;
                        }

                        const paymentTypeLabel = resolvePaymentTypeLabel(item);
                        const selected = selectedPaymentTypeIdSet.has(
                          walletPaymentTypeId,
                        );

                        if (!paymentTypeLabel) {
                          return null;
                        }

                        return (
                          <TouchableOpacity
                            key={`${group.key}-${walletPaymentTypeId}`}
                            activeOpacity={selectionEnabled ? 0.85 : 1}
                            disabled={!selectionEnabled}
                            onPress={() =>
                              handleTogglePaymentType(walletPaymentTypeId)
                            }
                            style={[
                              localStyles.paymentTypeChip,
                              selected && localStyles.paymentTypeChipSelected,
                              !selectionEnabled && localStyles.paymentTypeChipDisabled,
                            ]}>
                            <Text
                              style={[
                                localStyles.paymentTypeChipText,
                                selected &&
                                  localStyles.paymentTypeChipTextSelected,
                              ]}>
                              {paymentTypeLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={localStyles.paymentTypesEmpty}>
                      {group.isUnassigned ? unassignedText : emptyPaymentsText}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={localStyles.footerHintRow}>
        <Text style={localStyles.footerHint}>
          {selectedPaymentTypeIds.length > 0
            ? `${selectedPaymentTypeIds.length} meio(s) de pagamento liberado(s).`
            : 'Nenhum meio de pagamento liberado ainda.'}
        </Text>
      </View>
    </View>
  );
};

export default PaymentTypesByWalletTab;

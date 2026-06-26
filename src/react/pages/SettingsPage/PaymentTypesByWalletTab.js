import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {api} from '@controleonline/ui-common/src/api';
import {
  groupWalletPaymentTypesByWalletId,
  normalizeEntityId,
  resolveDevicePaymentTypeIds,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

const extractCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const resolveWalletLabel = wallet => {
  const label = String(
    wallet?.wallet || wallet?.name || wallet?.label || wallet?.description || '',
  ).trim();

  if (label) {
    return label;
  }

  const walletId = normalizeEntityId(wallet?.id || wallet?.wallet || wallet);
  return walletId ? `Wallet #${walletId}` : 'Wallet';
};

const resolvePaymentTypeLabel = walletPaymentType => {
  const paymentType = walletPaymentType?.paymentType;

  if (!paymentType) {
    return '';
  }

  if (typeof paymentType === 'object') {
    return (
      paymentType.paymentType ||
      paymentType.name ||
      paymentType.label ||
      paymentType.code ||
      ''
    );
  }

  return String(paymentType || '').trim();
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
  introTitle: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  introText: {
    color: '#1D4ED8',
    fontSize: 13,
    lineHeight: 18,
  },
  helpText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  loadingText: {
    color: '#334155',
    fontSize: 13,
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
  walletHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  walletColor: {
    borderRadius: 999,
    height: 12,
    marginLeft: 10,
    width: 12,
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
  const [wallets, setWallets] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletPaymentTypes, setWalletPaymentTypes] = useState([]);
  const [walletPaymentTypesLoading, setWalletPaymentTypesLoading] = useState(false);
  const [selectedPaymentTypeIds, setSelectedPaymentTypeIds] = useState([]);

  useEffect(() => {
    if (!currentCompanyId) {
      setWallets([]);
      setWalletPaymentTypes([]);
      setWalletsLoading(false);
      setWalletPaymentTypesLoading(false);
      return;
    }

    let isMounted = true;
    setWalletsLoading(true);

    api
      .fetch('wallets', {
        params: {
          people: currentCompanyId,
        },
      })
      .then(response => {
        if (!isMounted) {
          return;
        }

        setWallets(extractCollectionItems(response));
      })
      .catch(() => {
        if (isMounted) {
          setWallets([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setWalletsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentCompanyId]);

  useEffect(() => {
    if (!currentCompanyId) {
      setWalletPaymentTypes([]);
      setWalletPaymentTypesLoading(false);
      return;
    }

    let isMounted = true;
    setWalletPaymentTypesLoading(true);

    api
      .fetch('wallet_payment_types', {
        params: {
          people: `/people/${currentCompanyId}`,
        },
      })
      .then(response => {
        if (!isMounted) {
          return;
        }

        setWalletPaymentTypes(extractCollectionItems(response));
      })
      .catch(() => {
        if (isMounted) {
          setWalletPaymentTypes([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setWalletPaymentTypesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentCompanyId]);

  useEffect(() => {
    setSelectedPaymentTypeIds(resolveDevicePaymentTypeIds(configs));
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

    const groups = (Array.isArray(wallets) ? wallets : []).map(wallet => {
      const walletId = normalizeEntityId(wallet?.id);
      if (walletId) {
        groupedWalletIds.add(walletId);
      }

      return {
        key:
          walletId ||
          `wallet-${String(wallet?.wallet || wallet?.name || wallet?.label || '').trim() || 'unassigned'}`,
        walletId,
        wallet,
        paymentTypes: groupedPaymentTypes[walletId] || [],
        isUnassigned: false,
      };
    });

    Object.entries(groupedPaymentTypes).forEach(([walletId, paymentTypes]) => {
      if (walletId === '__unassigned' || groupedWalletIds.has(walletId)) {
        return;
      }

      groups.push({
        key: `wallet-${walletId}`,
        walletId,
        wallet: paymentTypes[0]?.wallet || null,
        paymentTypes,
        isUnassigned: false,
      });
    });

    const unassignedPaymentTypes = groupedPaymentTypes.__unassigned || [];
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
          error?.message || JSON.stringify(error),
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
        <Text style={localStyles.introTitle}>{title}</Text>
        <Text style={localStyles.introText}>{introText}</Text>
        <Text style={localStyles.helpText}>{helpText}</Text>
      </View>

      {walletsLoading ? (
        <View style={localStyles.loadingRow}>
          <ActivityIndicator size="small" color="#1B5587" />
          <Text style={localStyles.loadingText}>{loadingWalletsText}</Text>
        </View>
      ) : null}

      {!walletsLoading && walletPaymentTypesLoading ? (
        <View style={localStyles.loadingRow}>
          <ActivityIndicator size="small" color="#1B5587" />
          <Text style={localStyles.loadingText}>{loadingPaymentsText}</Text>
        </View>
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
            const walletHint = group.isUnassigned
              ? unassignedText
              : group.wallet?.description || group.wallet?.hint || '';
            const walletColor = group.wallet?.color || '#CBD5E1';

            return (
              <View key={group.key} style={localStyles.walletCard}>
                <View style={localStyles.walletCardHeader}>
                  <View style={localStyles.walletMeta}>
                    <Text style={localStyles.walletName}>{walletLabel}</Text>
                    {!group.isUnassigned && (
                      <Text style={localStyles.walletId}>
                        {group.walletId ? `ID #${group.walletId}` : 'ID -'}
                      </Text>
                    )}
                  </View>
                  {!group.isUnassigned && (
                    <View
                      style={[
                        localStyles.walletColor,
                        {backgroundColor: walletColor},
                      ]}
                    />
                  )}
                </View>

                {walletHint ? (
                  <Text style={localStyles.walletHint}>{walletHint}</Text>
                ) : null}

                <View style={localStyles.paymentTypesBlock}>
                  <Text style={localStyles.paymentTypesTitle}>
                    Meios de pagamento
                  </Text>
                  {group.paymentTypes.length > 0 ? (
                    <View style={localStyles.paymentTypesRow}>
                      {group.paymentTypes.map(item => {
                        const paymentTypeId = normalizeEntityId(
                          item?.paymentType?.id ||
                            item?.paymentType ||
                            item?.payment_type?.id ||
                            item?.payment_type,
                        );
                        const paymentTypeLabel = resolvePaymentTypeLabel(item);
                        const selected = selectedPaymentTypeIdSet.has(paymentTypeId);

                        if (!paymentTypeLabel) {
                          return null;
                        }

                        return (
                          <TouchableOpacity
                            key={`${group.key}-${paymentTypeId || paymentTypeLabel}`}
                            activeOpacity={selectionEnabled ? 0.85 : 1}
                            disabled={!selectionEnabled}
                            onPress={() => handleTogglePaymentType(paymentTypeId)}
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

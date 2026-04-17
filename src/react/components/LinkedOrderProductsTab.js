import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import {
  addProductsToOrder,
  ensureLinkedOrder,
  fetchLinkedOrder,
  fetchOrderProducts,
  isOpenCommercialOrder,
  normalizeEntityId,
  removeOrderProduct,
  searchCompanyProducts,
  updateOrderProductQuantity,
} from '@controleonline/ui-common/src/react/utils/commercialDocumentOrders';
import styles from './LinkedOrderProductsTab.styles';

const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a operacao.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }

  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel concluir a operacao.';
};

const resolveProductLabel = orderProduct => {
  const product = orderProduct?.product;
  return (
    product?.product ||
    product?.name ||
    product?.description ||
    orderProduct?.description ||
    'Produto'
  );
};

const resolveProductSku = orderProduct =>
  String(orderProduct?.product?.sku || orderProduct?.sku || '').trim();

const resolveQuantity = orderProduct => {
  const parsed = Number(orderProduct?.quantity || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const LinkedOrderProductsTab = ({
  contract,
  canEdit,
  emptyTitle = 'Nenhum produto adicionado.',
  emptySubtitle = 'Voce pode vincular produtos a este documento quando precisar.',
  searchPlaceholder = 'Buscar produto para adicionar...',
}) => {
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const { showError } = useMessage() || {};

  const [order, setOrder] = useState(null);
  const [orderProducts, setOrderProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingProductId, setAddingProductId] = useState(null);
  const [updatingOrderProductId, setUpdatingOrderProductId] = useState(null);

  const orderId = useMemo(
    () => normalizeEntityId(order?.id || order?.['@id']),
    [order?.id, order?.['@id']],
  );

  const canEditProducts = !!canEdit && !!contract?.['@id'] && (!order || isOpenCommercialOrder(order));

  const loadLinkedOrderProducts = useCallback(async () => {
    if (!contract?.['@id']) {
      setOrder(null);
      setOrderProducts([]);
      return;
    }

    setIsLoading(true);
    try {
      const linkedOrder = await fetchLinkedOrder(contract['@id']);
      setOrder(linkedOrder);

      if (linkedOrder) {
        const items = await fetchOrderProducts(linkedOrder['@id'] || linkedOrder.id);
        setOrderProducts(items);
      } else {
        setOrderProducts([]);
      }
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [contract?.['@id'], showError]);

  useEffect(() => {
    loadLinkedOrderProducts();
  }, [loadLinkedOrderProducts]);

  useEffect(() => {
    const trimmedQuery = String(searchQuery || '').trim();

    if (!canEditProducts || !currentCompany?.id || !trimmedQuery) {
      setSearchResults([]);
      setSearchLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchCompanyProducts({
          companyId: currentCompany.id,
          query: trimmedQuery,
          itemsPerPage: 8,
        });

        if (!cancelled) {
          setSearchResults(results);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [canEditProducts, currentCompany?.id, searchQuery]);

  const ensureCurrentOrder = useCallback(async () => {
    if (order) {
      return order;
    }

    const createdOrder = await ensureLinkedOrder({
      contractRef: contract?.['@id'],
      provider: contract?.provider,
      client: contract?.client,
      payer: contract?.client,
      app: 'CRM',
      orderType: 'sale',
    });

    setOrder(createdOrder);
    return createdOrder;
  }, [contract?.['@id'], contract?.client, contract?.provider, order]);

  const handleAddProduct = useCallback(async product => {
    if (!canEditProducts || addingProductId) {
      return;
    }

    const productId = normalizeEntityId(product);
    if (!productId) {
      return;
    }

    setAddingProductId(productId);
    try {
      const currentOrder = await ensureCurrentOrder();
      await addProductsToOrder({
        orderId: currentOrder?.id || currentOrder?.['@id'],
        products: [{ product: productId, quantity: 1 }],
      });
      setSearchQuery('');
      setSearchResults([]);
      await loadLinkedOrderProducts();
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setAddingProductId(null);
    }
  }, [addingProductId, canEditProducts, ensureCurrentOrder, loadLinkedOrderProducts, showError]);

  const handleChangeQuantity = useCallback(async (orderProduct, nextQuantity) => {
    if (updatingOrderProductId) {
      return;
    }

    const orderProductId = normalizeEntityId(orderProduct);
    if (!orderProductId) {
      return;
    }

    setUpdatingOrderProductId(orderProductId);
    try {
      if (nextQuantity <= 0) {
        await removeOrderProduct(orderProductId);
      } else {
        await updateOrderProductQuantity({
          orderProductId,
          quantity: nextQuantity,
        });
      }

      await loadLinkedOrderProducts();
    } catch (error) {
      showError?.(formatApiError(error));
    } finally {
      setUpdatingOrderProductId(null);
    }
  }, [loadLinkedOrderProducts, showError, updatingOrderProductId]);

  const visibleSearchResults = useMemo(() => {
    const existingProductIds = new Set(
      (Array.isArray(orderProducts) ? orderProducts : [])
        .map(item => normalizeEntityId(item?.product))
        .filter(Boolean),
    );

    return (Array.isArray(searchResults) ? searchResults : []).filter(
      product => !existingProductIds.has(normalizeEntityId(product)),
    );
  }, [orderProducts, searchResults]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Produtos</Text>
            <Text style={styles.subtitle}>
              {orderId
                ? `Pedido vinculado #${orderId}`
                : 'Os produtos deste documento sao guardados em um pedido vinculado.'}
            </Text>
          </View>
          {isLoading && <ActivityIndicator size="small" color="#2529a1" />}
        </View>

        {canEditProducts && (
          <View style={styles.searchWrap}>
            <View style={styles.searchInputWrap}>
              <Icon name="search" size={18} color="#64748B" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {searchLoading && <ActivityIndicator size="small" color="#2529a1" />}
            </View>

            {String(searchQuery || '').trim().length > 0 && visibleSearchResults.map(product => {
              const productId = normalizeEntityId(product);
              const isAdding = addingProductId === productId;
              return (
                <TouchableOpacity
                  key={product?.['@id'] || productId}
                  style={styles.searchResultRow}
                  onPress={() => handleAddProduct(product)}
                  disabled={!!addingProductId}
                  activeOpacity={0.75}>
                  <View style={styles.searchResultBody}>
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {product?.product || 'Produto'}
                    </Text>
                    <Text style={styles.searchResultMeta}>
                      {Formatter.formatMoney(Number(product?.price || 0))}
                    </Text>
                  </View>
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#2529a1" />
                  ) : (
                    <Icon name="add-circle" size={22} color="#2529a1" />
                  )}
                </TouchableOpacity>
              );
            })}

            {String(searchQuery || '').trim().length > 0 && !searchLoading && visibleSearchResults.length === 0 && (
              <Text style={styles.searchEmptyText}>Nenhum produto encontrado para esta busca.</Text>
            )}
          </View>
        )}

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#2529a1" />
            <Text style={styles.emptySubtitle}>Carregando produtos...</Text>
          </View>
        ) : orderProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inventory-2" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {orderProducts.map(orderProduct => {
              const quantity = resolveQuantity(orderProduct);
              const orderProductId = normalizeEntityId(orderProduct);
              const isUpdating = updatingOrderProductId === orderProductId;
              const sku = resolveProductSku(orderProduct);

              return (
                <View key={orderProduct?.['@id'] || orderProductId} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <View style={styles.productBody}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {resolveProductLabel(orderProduct)}
                      </Text>
                      <Text style={styles.productMeta}>
                        {[sku ? `SKU ${sku}` : null, Formatter.formatMoney(Number(orderProduct?.price || 0))]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <Text style={styles.productTotal}>
                      {Formatter.formatMoney(Number(orderProduct?.total || 0))}
                    </Text>
                  </View>

                  {canEditProducts ? (
                    <View style={styles.actionsRow}>
                      <View style={styles.quantityWrap}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => handleChangeQuantity(orderProduct, quantity - 1)}
                          disabled={!!updatingOrderProductId}>
                          <Icon name="remove" size={18} color="#0F172A" />
                        </TouchableOpacity>
                        <View style={styles.qtyValueWrap}>
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="#2529a1" />
                          ) : (
                            <Text style={styles.qtyValue}>{quantity}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => handleChangeQuantity(orderProduct, quantity + 1)}
                          disabled={!!updatingOrderProductId}>
                          <Icon name="add" size={18} color="#0F172A" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleChangeQuantity(orderProduct, 0)}
                        disabled={!!updatingOrderProductId}>
                        <Icon name="delete-outline" size={18} color="#DC2626" />
                        <Text style={styles.removeButtonText}>Remover</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.readonlyMetaWrap}>
                      <Text style={styles.readonlyMetaText}>Quantidade: {quantity}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default LinkedOrderProductsTab;

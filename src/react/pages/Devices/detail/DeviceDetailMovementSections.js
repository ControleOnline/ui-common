import React from 'react';
import { Text, View, FlatList, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import styles from '../../DeviceDetailPage.styles';
import { hex } from './deviceDetailConstants';

/**
 * PDV movement tab sections.
 * Refs: app-community#382
 */
export default function DeviceDetailMovementSections(ctx) {
  const {
    showPdvMovementTab, inflowData, productTotal, wallets, filteredProducts, search, setSearch,
    renderProduct, loadingMovementData,
  } = ctx;

  return (
    <>
      {showPdvMovementTab && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Icon name="dollar-sign" size={14} color={hex.success} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Total Geral</Text>
            <Text style={[styles.summaryValue, { color: hex.success }]}>
              {Formatter.formatMoney(inflowTotal)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="shopping-bag" size={14} color={hex.info} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Em Produtos</Text>
            <Text style={[styles.summaryValue, { color: hex.info }]}>
              {Formatter.formatMoney(productTotal)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Icon name="package" size={14} color={hex.purple} style={styles.summaryIcon} />
            <Text style={styles.summaryLabel}>Itens</Text>
            <Text style={[styles.summaryValue, { color: hex.purple }]}>
              {products.length}
            </Text>
          </View>
        </View>
      )}

      {showPdvMovementTab && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              <Icon name="shield" size={13} /> {'  '}
              {global.t?.t('manager', 'title', 'pdvMovement') || 'PDV Movement'}
            </Text>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                {backgroundColor: isOpen ? hex.danger : hex.success},
                actionLoading && {opacity: 0.6},
              ]}
              onPress={handleToggle}
              disabled={actionLoading || loadingConfigData}
              activeOpacity={0.85}>
              <Icon
                name={isOpen ? 'lock' : 'unlock'}
                size={13}
                color="#fff"
              />
              <Text style={styles.toggleBtnText}>
                {actionLoading
                  ? isOpen
                    ? 'Fechando...'
                    : 'Abrindo...'
                  : isOpen
                    ? global.t?.t('orders', 'button', 'closeCashRegister') || 'Close'
                    : global.t?.t('orders', 'button', 'openCashRegister') || 'Open'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPdvMovementTab && wallets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="credit-card" size={13} /> {'  '}Recebimentos por Forma de Pagamento
          </Text>
          {wallets.map((wallet, wi) => (
            <View key={wi} style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <Icon name="briefcase" size={13} color="#64748B" />
                <Text style={styles.walletName}>{wallet.wallet || 'Carteira'}</Text>
                <Text style={[styles.walletTotal, { color: brandColors.primary }]}>
                  {Formatter.formatMoney(wallet.total)}
                </Text>
              </View>
              {wallet.payments.map((pt, pi) => (
                <View key={pi} style={styles.paymentRow}>
                  <View style={[styles.paymentIconBox, { backgroundColor: withOpacity(hex.info, 0.1) }]}>
                    <Icon name={paymentIcon(pt.payment)} size={11} color={hex.info} />
                  </View>
                  <Text style={styles.paymentName}>{pt.payment || '-'}</Text>
                  <Text style={styles.paymentValue}>
                    {Formatter.formatMoney(pt.inflow)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {showPdvMovementTab && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="shopping-bag" size={13} /> {'  '}Produtos Vendidos
          </Text>

          <View style={styles.searchRow}>
            <Icon name="search" size={14} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar produto ou SKU..."
              placeholderTextColor="#94A3B8"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="x" size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {filteredProducts.length > 0 ? (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHead, { flex: 0.5 }]}>Qtd</Text>
                <Text style={[styles.tableHead, { flex: 3 }]}>Produto</Text>
                <Text style={[styles.tableHead, { flex: 1.2, textAlign: 'right' }]}>Unit.</Text>
                <Text style={[styles.tableHead, { flex: 1.3, textAlign: 'right' }]}>Total</Text>
              </View>
              <FlatList
                data={filteredProducts}
                keyExtractor={(item, i) => `${item.product_sku || i}`}
                renderItem={renderProduct}
                scrollEnabled={false}
              />
              <View style={styles.tableFooter}>
                <Text style={styles.tableFooterLabel}>Total em produtos</Text>
                <Text style={[styles.tableFooterValue, { color: brandColors.primary }]}>
                  {Formatter.formatMoney(productTotal)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Icon name="inbox" size={24} color="#CBD5E1" style={inlineStyle_1301_61} />
              <Text style={styles.emptyText}>
                {search ? 'Nenhum produto encontrado para esta busca' : 'Nenhum produto registrado neste equipamento'}
              </Text>
            </View>
          )}
        </View>
      )}

    </>
  );
}

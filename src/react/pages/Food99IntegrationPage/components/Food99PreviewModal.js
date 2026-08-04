import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '@controleonline/../../src/styles/colors';

import AnimatedModal from '@controleonline/ui-common/src/react/components/AnimatedModal';

import styles from '../styles';
import { countCollection } from '@controleonline/ui-common/src/react/utils/integrationPage';

const resolveButtonPalette = (palette, accentColor) => {
  const primaryBackground =
    palette.buttonBackground || accentColor || palette.primary;
  const primaryBorder = palette.buttonBorder || primaryBackground;
  const primaryText = palette.buttonText || palette.white;
  const primaryIcon = palette.buttonIcon || primaryText;
  const secondaryBackground =
    palette.buttonBackgroundSecondary || palette.white;
  const secondaryBorder = palette.buttonBorderSecondary || palette.border;
  const secondaryText = palette.buttonTextSecondary || palette.textSecondary;
  const secondaryIcon = palette.buttonIconSecondary || secondaryText;
  const disabledBackground =
    palette.buttonDisabledBackground || secondaryBorder;
  const disabledBorder = palette.buttonBorderSecondary || secondaryBorder;
  const disabledText = palette.buttonDisabledText || secondaryText;

  return {
    primaryBackground,
    primaryBorder,
    primaryText,
    primaryIcon,
    secondaryBackground,
    secondaryBorder,
    secondaryText,
    secondaryIcon,
    disabledBackground,
    disabledBorder,
    disabledText,
  };
};

// Modal de pré-visualização do menu antes do envio à 99Food.
export default function Food99PreviewModal({
  visible,
  previewData,
  selectedEligibleProducts,
  uploading,
  accentColor,
  palette = colors,
  onClose,
  onUpload,
}) {
  const buttonPalette = resolveButtonPalette(palette, accentColor);

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose}>
      <View style={styles.modalShell}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Pre-visualizacao do menu</Text>
              <Text style={styles.modalSubtitle}>
                {previewData?.eligible_product_count || selectedEligibleProducts.length} produtos prontos para upload
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="x" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalSummaryGrid}>
              <View style={styles.modalSummaryCard}>
                <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.menus)}</Text>
                <Text style={styles.modalSummaryLabel}>Menus</Text>
              </View>
              <View style={styles.modalSummaryCard}>
                <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.categories)}</Text>
                <Text style={styles.modalSummaryLabel}>Categorias</Text>
              </View>
              <View style={styles.modalSummaryCard}>
                <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.items)}</Text>
                <Text style={styles.modalSummaryLabel}>Itens</Text>
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Categorias</Text>
              {(previewData?.payload?.categories || []).map(category => (
                <View key={category.app_category_id} style={styles.previewLine}>
                  <Text style={styles.previewLineTitle}>{category.category_name}</Text>
                  <Text style={styles.previewLineMeta}>
                    {countCollection(category.app_item_ids)} item(ns)
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Itens selecionados</Text>
              {selectedEligibleProducts.map(product => (
                <View key={product.id} style={styles.previewLine}>
                  <Text style={styles.previewLineTitle}>{product.name}</Text>
                  <Text style={styles.previewLineMeta}>
                    {product.category?.name || 'Sem categoria'} • R$ {Number(product.price || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  borderColor: buttonPalette.secondaryBorder,
                  backgroundColor: buttonPalette.secondaryBackground,
                },
              ]}
              onPress={onClose}>
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: buttonPalette.secondaryText },
                ]}>
                Fechar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.modalPrimaryButton,
                {
                  borderWidth: 1,
                  borderColor: uploading
                    ? buttonPalette.disabledBorder
                    : buttonPalette.primaryBorder,
                  backgroundColor: uploading
                    ? buttonPalette.disabledBackground
                    : buttonPalette.primaryBackground,
                },
              ]}
              onPress={onUpload}
              disabled={uploading}>
              {uploading ? (
                <ActivityIndicator
                  size="small"
                  color={buttonPalette.disabledText}
                />
              ) : (
                <>
                  <Icon
                    name="upload-cloud"
                    size={16}
                    color={buttonPalette.primaryIcon}
                  />
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: buttonPalette.primaryText },
                    ]}>
                    Publicar menu
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedModal>
  );
}

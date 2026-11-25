import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createDocumentDetailsStyles, resolveDocumentDetailsTheme } from './DocumentDetailsShell.styles';

const WIDE_BREAKPOINT = 768;

/**
 * Shared layout for proposal/contract details.
 * The header and the action bar stay fixed so the seller always sees who the
 * document is for, its value and the main action, while the document itself
 * gets the rest of the screen. Secondary data (products, signers) open in sheets.
 */
const DocumentDetailsShell = ({
  theme,
  title,
  clientName,
  meta,
  totalLabel,
  statusLabel,
  statusColor,
  onBack,
  loading,
  children,
  secondaryActions = [],
  primaryAction,
  footerNote,
}) => {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const colors = resolveDocumentDetailsTheme(theme);
  const styles = createDocumentDetailsStyles(colors, isWide);
  const chipColor = statusColor || colors.muted;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={onBack}
              style={styles.backButton}>
              <Icon name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {statusLabel ? (
                <View style={[styles.statusChip, { borderColor: `${chipColor}55`, backgroundColor: `${chipColor}14` }]}>
                  <View style={[styles.statusDot, { backgroundColor: chipColor }]} />
                  <Text style={[styles.statusText, { color: chipColor }]} numberOfLines={1}>
                    {statusLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {[clientName, meta].filter(Boolean).join('  ·  ')}
            </Text>
          </View>

          {totalLabel ? (
            <View style={styles.totalBox}>
              <Text style={styles.totalCaption}>Total</Text>
              <Text style={styles.totalValue} numberOfLines={1}>
                {totalLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.paper}>
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            children
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={styles.secondaryActions}>
            {secondaryActions.map(action => (
              <TouchableOpacity
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={styles.secondaryButton}>
                <Icon name={action.icon} size={18} color={colors.text} />
                {isWide ? <Text style={styles.secondaryLabel}>{action.label}</Text> : null}
                {Number.isFinite(action.count) ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{action.count}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          {primaryAction ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={primaryAction.label}
              disabled={primaryAction.disabled || primaryAction.loading}
              onPress={primaryAction.onPress}
              style={[
                styles.primaryButton,
                (primaryAction.disabled || primaryAction.loading) && styles.primaryButtonDisabled,
              ]}>
              {primaryAction.loading ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Icon name={primaryAction.icon || 'check'} size={18} color={colors.onPrimary} />
              )}
              <Text style={styles.primaryLabel} numberOfLines={1}>
                {primaryAction.label}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {footerNote ? <Text style={styles.footerNote}>{footerNote}</Text> : null}
      </View>
    </SafeAreaView>
  );
};

export default DocumentDetailsShell;

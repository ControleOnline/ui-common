import React, {useMemo} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import Formatter from '@controleonline/ui-common/src/utils/formatter';

import createStyles, {resolveActionPalette} from './UnifiedPaymentBar.styles';

const getStatusPresentation = (theme, totalAmount, paidAmount, pendingAmount) => {
  if (pendingAmount <= 0.009 && totalAmount > 0) {
    return {
      label: 'Pago',
      color: theme?.success || '#16A34A',
      icon: 'check-circle',
    };
  }

  if (paidAmount > 0.009) {
    return {
      label: 'Saldo pendente',
      color: theme?.warning || '#D97706',
      icon: 'schedule',
    };
  }

  return {
    label: 'Aguardando pagamento',
    color: theme?.primary || '#1D4ED8',
    icon: 'payments',
  };
};

const withAlpha = (hex, alpha) => {
  const normalized = String(hex || '').trim();
  if (
    !normalized.startsWith('#') ||
    (normalized.length !== 7 && normalized.length !== 4)
  ) {
    return hex;
  }

  if (normalized.length === 4) {
    const [r, g, b] = normalized.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  return `${normalized}${alpha}`;
};

export default function UnifiedPaymentBar({
  actions = [],
  bottomOffset = 0,
  paidAmount = 0,
  pendingAmount = 0,
  theme,
  title = '',
  totalAmount = 0,
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedTotalAmount = Number(totalAmount || 0);
  const resolvedPaidAmount = Number(paidAmount || 0);
  const resolvedPendingAmount = Math.max(Number(pendingAmount || 0), 0);
  const status = getStatusPresentation(
    theme,
    resolvedTotalAmount,
    resolvedPaidAmount,
    resolvedPendingAmount,
  );
  const visibleActions = Array.isArray(actions) ? actions.filter(Boolean) : [];

  return (
    <View style={[styles.wrapper, {paddingBottom: bottomOffset + 12}]}>
      <View style={styles.card}>
        <View style={[styles.headerRow, !title && styles.headerRowCompact]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View
            style={[
              styles.statusBadge,
              {
                borderColor: status.color,
                backgroundColor: withAlpha(status.color, '18'),
              },
            ]}>
            <Icon color={status.color} name={status.icon} size={14} />
            <Text style={[styles.statusText, {color: status.color}]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardSingle]}>
            <Text style={styles.metricLabel}>Pendente</Text>
            <Text style={[styles.metricValue, styles.metricValueStrong]}>
              {Formatter.formatMoney(resolvedPendingAmount)}
            </Text>
          </View>
        </View>

        {visibleActions.length > 0 && (
          <View
            style={[
              styles.actionsRow,
              visibleActions.length === 1 && styles.actionsRowSingle,
            ]}>
            {visibleActions.map(action => {
              const key =
                action?.key ||
                `${action?.label || 'action'}-${action?.variant || 'primary'}`;
              const disabled = !!action?.disabled;
              const palette = resolveActionPalette(
                theme,
                action?.variant || 'primary',
                disabled,
              );

              return (
                <TouchableOpacity
                  key={key}
                  disabled={disabled}
                  onPress={action?.onPress}
                  style={[
                    styles.actionButton,
                    visibleActions.length === 1 && styles.actionButtonSingle,
                    {
                      backgroundColor: palette.backgroundColor,
                      borderColor: palette.borderColor,
                    },
                  ]}>
                  {action?.loading ? (
                    <ActivityIndicator color={palette.textColor} />
                  ) : (
                    <>
                      {action?.icon ? (
                        <Icon
                          color={palette.textColor}
                          name={action.icon}
                          size={18}
                        />
                      ) : null}
                      <Text
                        style={[styles.actionLabel, {color: palette.textColor}]}>
                        {action?.label}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

import React from 'react';
import { Text, View, Switch } from 'react-native';
import DefaultTooltip from '@controleonline/ui-default/src/react/components/help/DefaultTooltip';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import styles from '../../DeviceDetailPage.styles';
import { inlineStyle_667_12 } from '../../DeviceDetailPage.styles';
import OptionButtonChip from './OptionButtonChip';
import { getDeviceSwitchProps } from './deviceDetailHelpers';

/** Factory so themeColors/palette close over caller context */
export function createDeviceDetailRenderers({ themeColors, palette }) {
    const renderProduct = ({ item, index }) => (
    <View style={[styles.productRow, index % 2 === 0 && styles.productRowAlt]}>
      <Text style={[styles.productCell, { flex: 0.5 }]}>{item.quantity}</Text>
      <View style={inlineStyle_667_12}>
        <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
        {!!item.product_sku && (
          <Text style={styles.productSku}>{item.product_sku}</Text>
        )}
      </View>
      <Text style={[styles.productCell, { flex: 1.2, textAlign: 'right' }]}>
        {Formatter.formatMoney(item.order_product_price)}
      </Text>
      <Text style={[styles.productCell, { flex: 1.3, textAlign: 'right', fontWeight: '700' }]}>
        {Formatter.formatMoney(item.order_product_total)}
      </Text>
    </View>
  );

    const renderHelpButton = (title, message) => (
    <DefaultTooltip
      accentColor={themeColors.buttonIcon}
      title={title}
      message={message}
      style={{
        backgroundColor: themeColors.buttonBackground,
        borderColor: themeColors.buttonBackground,
        borderRadius: 8,
        height: 34,
        width: 34,
      }}
      textStyle={{
        color: themeColors.buttonIcon,
        fontSize: 16,
        lineHeight: 16,
      }}
    />
  );

    const renderSwitchRow = ({
    disabled = false,
    label,
    onValueChange,
    value,
    valueLabel,
  }) => {
    const checked = Boolean(value);

    return (
      <View
        style={[
          styles.toggleRow,
          {
            backgroundColor: themeColors.listItemBackground,
            borderColor: themeColors.listItemBorder,
          },
          disabled && styles.toggleRowDisabled,
        ]}>
        <View style={styles.toggleRowCopy}>
          <Text
            style={[
              styles.toggleRowLabel,
              {color: themeColors.listItemText},
            ]}>
            {label}
          </Text>
          <Text
            style={[
              styles.toggleRowValue,
              {color: themeColors.listItemSubtitleText},
            ]}>
            {valueLabel}
          </Text>
        </View>
        <Switch
          value={checked}
          disabled={disabled}
          onValueChange={onValueChange}
          {...getDeviceSwitchProps({
            disabled,
            palette: themeColors,
            value: checked,
          })}
        />
      </View>
    );
  };

    const renderOptionButtons = ({ options, value, onChange, disabled = false, optionColors = null }) => (
    <View style={styles.optionRow}>
      {options.map(option => {
        const selected = String(option.value) === String(value);
        const optionDisabled = disabled || option.disabled === true;
        const optionTitle = String(option.title || '').trim();
        if (optionDisabled && optionTitle) {
          return (
            <OptionButtonChip
              key={String(option.value)}
              label={option.label}
              selected={selected}
              disabled
              colors={optionColors}
              tooltip={optionTitle}
              onPress={() => onChange(option.value)}
            />
          );
        }

        return (
          <OptionButtonChip
            key={String(option.value)}
            label={option.label}
            selected={selected}
            disabled={optionDisabled}
            colors={optionColors}
            tooltip={optionTitle}
            onPress={() => onChange(option.value)}
          />
        );
      })}
    </View>
  );

  return { renderProduct, renderHelpButton, renderSwitchRow, renderOptionButtons };
}

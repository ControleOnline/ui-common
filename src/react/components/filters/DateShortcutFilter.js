import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import createStyles from './DateShortcutFilter.styles';
import {
  buildDateFilterOptions,
  DEFAULT_DATE_FILTER_OPTION_KEYS,
  resolveDateFilterCurrentLabel,
  resolveDateFilterTitle,
  resolveDateRangeSummary,
  validateCustomDateRange,
} from '@controleonline/ui-common/src/react/utils/dateRangeFilter';

const createDefaultColors = colors => ({
  accent: colors?.accent || '#0EA5E9',
  appBg: colors?.appBg || 'transparent',
  border: colors?.border || '#CBD5E1',
  borderSoft: colors?.borderSoft || '#E2E8F0',
  cardBg: colors?.cardBg || '#FFFFFF',
  cardBgSoft: colors?.cardBgSoft || '#F8FAFC',
  danger: colors?.danger || '#DC2626',
  isLight: typeof colors?.isLight === 'boolean' ? colors.isLight : true,
  panelBg: colors?.panelBg || '#F1F5F9',
  pillTextDark: colors?.pillTextDark || '#0F172A',
  textPrimary: colors?.textPrimary || '#0F172A',
  textSecondary: colors?.textSecondary || '#64748B',
});

const DateShortcutFilter = ({
  value = '',
  onChange = null,
  customRange = null,
  onCustomRangeChange = null,
  colors = null,
  optionKeys = DEFAULT_DATE_FILTER_OPTION_KEYS,
}) => {
  const themeColors = useMemo(() => createDefaultColors(colors), [colors]);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [customFromInput, setCustomFromInput] = useState('');
  const [customToInput, setCustomToInput] = useState('');
  const [dateValidationMessage, setDateValidationMessage] = useState('');
  const options = useMemo(
    () => buildDateFilterOptions(optionKeys),
    [optionKeys],
  );
  const periodLabel = resolveDateFilterTitle();
  const currentDateLabel = resolveDateFilterCurrentLabel();
  const activeRangeSummary = useMemo(
    () => resolveDateRangeSummary(value, customRange),
    [customRange, value],
  );

  useEffect(() => {
    setCustomFromInput(String(customRange?.from || ''));
    setCustomToInput(String(customRange?.to || ''));
  }, [customRange?.from, customRange?.to]);

  useEffect(() => {
    if (value !== 'custom') {
      setDateValidationMessage('');
    }
  }, [value]);

  // Custom ranges are applied explicitly so the parent only refreshes when valid.
  const applyCustomRange = useCallback(() => {
    const validationMessage = validateCustomDateRange(
      customFromInput,
      customToInput,
    );

    setDateValidationMessage(validationMessage);

    if (validationMessage) {
      return;
    }

    onCustomRangeChange?.({
      from: String(customFromInput || '').trim(),
      to: String(customToInput || '').trim(),
    });
  }, [customFromInput, customToInput, onCustomRangeChange]);

  const clearCustomRange = useCallback(() => {
    setCustomFromInput('');
    setCustomToInput('');
    setDateValidationMessage('');
    onCustomRangeChange?.({
      from: '',
      to: '',
    });
  }, [onCustomRangeChange]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {periodLabel}
          </Text>

          {!!activeRangeSummary && (
            <View style={styles.currentDateWrap}>
              <Text style={styles.currentDateLabel}>
                {currentDateLabel}
              </Text>
              <Text style={styles.currentDateValue}>
                {activeRangeSummary}
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {options.map(option => {
            const active = option.key === value;

            return (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.9}
                style={[
                  styles.chip,
                  active ? styles.chipActive : null,
                ]}
                onPress={() => onChange?.(option.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {value === 'custom' && (
          <View style={styles.customRangeWrap}>
            <View style={styles.customInputsRow}>
              <TextInput
                value={customFromInput}
                onChangeText={setCustomFromInput}
                placeholder={global.t?.t('orders', 'placeholder', 'date_from')}
                placeholderTextColor={themeColors.textSecondary}
                style={styles.customInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                value={customToInput}
                onChangeText={setCustomToInput}
                placeholder={global.t?.t('orders', 'placeholder', 'date_to')}
                placeholderTextColor={themeColors.textSecondary}
                style={styles.customInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!!dateValidationMessage && (
              <Text style={styles.validationText}>
                {dateValidationMessage}
              </Text>
            )}

            <View style={styles.customActionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.9}
                onPress={clearCustomRange}
              >
                <Text style={styles.secondaryButtonText}>
                  {global.t?.t('orders', 'button', 'clear')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.9}
                onPress={applyCustomRange}
              >
                <Text style={styles.primaryButtonText}>
                  {global.t?.t('orders', 'button', 'apply_period')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default DateShortcutFilter;

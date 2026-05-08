import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  formatStoreColumnLabel,
  resolveStoreColumn,
  resolveStoreConfigByName,
} from '../../utils/storeColumns';
import createStyles from './CompactFilterSelector.styles';

const buildTheme = accentColor => ({
  accentColor: accentColor || '#2563EB',
  activeBackgroundColor: `${accentColor || '#2563EB'}14`,
  activeIconBackgroundColor: `${accentColor || '#2563EB'}24`,
  backgroundColor: '#F8FAFC',
  borderColor: '#E2E8F0',
  iconBackgroundColor: '#E2E8F0',
  optionBackgroundColor: '#F8FAFC',
  optionBorderColor: '#E2E8F0',
  textColor: '#0F172A',
});

const noop = () => {};

const normalizeText = value => String(value || '').trim();

const resolveStoreName = store => {
  if (typeof store === 'string') return normalizeText(store);
  return normalizeText(store?.storeName || store?.name || '');
};

const resolveStoreFieldLabel = ({ fallbackLabel = '', field = '', store = '' }) => {
  const storeName = resolveStoreName(store);
  const fieldName = normalizeText(field);
  if (!storeName || !fieldName) return fallbackLabel;

  const { columns } = resolveStoreConfigByName(storeName);
  const column = resolveStoreColumn(columns, fieldName);
  const labelKey = normalizeText(column?.label || fieldName);
  const translatedLabel =
    global.t?.t(storeName, 'label', labelKey) ||
    global.t?.t(storeName, 'input', labelKey);

  return (
    translatedLabel ||
    formatStoreColumnLabel({
      columns,
      fallbackLabel: fallbackLabel || labelKey,
      fieldName,
      storeName,
    }) ||
    fallbackLabel
  );
};

const CompactFilterSelector = ({
  accentColor = '#2563EB',
  active = false,
  children = null,
  dense = false,
  disabled = false,
  icon = 'sliders',
  label = '',
  labelCaption = '',
  onSelect = null,
  options = [],
  selectedKey = '',
  field = '',
  store = '',
  title = '',
}) => {
  const [visible, setVisible] = useState(false);
  const styles = useMemo(
    () => createStyles(buildTheme(accentColor), dense),
    [accentColor, dense],
  );
  const storeFieldLabel = useMemo(
    () => resolveStoreFieldLabel({ fallbackLabel: labelCaption || title, field, store }),
    [field, labelCaption, store, title],
  );
  const resolvedLabelCaption = labelCaption || storeFieldLabel;
  const resolvedTitle = title || storeFieldLabel;

  const closeModal = useCallback(() => {
    setVisible(false);
  }, []);

  const openModal = useCallback(() => {
    if (!disabled) {
      setVisible(true);
    }
  }, [disabled]);

  const handleSelect = useCallback(optionKey => {
    const shouldClose = onSelect?.(optionKey, {
      close: closeModal,
      open: openModal,
    });

    if (shouldClose !== false) {
      closeModal();
    }
  }, [closeModal, onSelect, openModal]);

  const resolvedChildren = useMemo(() => {
    if (typeof children === 'function') {
      return children({ close: closeModal, open: openModal });
    }

    return children;
  }, [children, closeModal, openModal]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          active ? styles.triggerActive : null,
        ]}
        activeOpacity={0.9}
        disabled={disabled}
        onPress={openModal}
      >
        <View style={[styles.iconWrap, active ? styles.iconWrapActive : null]}>
          <Icon
            name={icon}
            size={dense ? 14 : 15}
            color={active ? accentColor : '#64748B'}
          />
        </View>

        <View style={styles.textWrap}>
          {!!resolvedLabelCaption && (
            <Text
              numberOfLines={1}
              style={[
                styles.triggerCaption,
                active ? styles.triggerCaptionActive : null,
              ]}
            >
              {resolvedLabelCaption}
            </Text>
          )}

          <Text
            numberOfLines={1}
            style={[styles.triggerText, active ? styles.triggerTextActive : null]}
          >
            {label}
          </Text>
        </View>

        <Icon
          name="chevron-down"
          size={dense ? 14 : 16}
          color={active ? accentColor : '#94A3B8'}
        />
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={noop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{resolvedTitle}</Text>

                  <TouchableOpacity onPress={closeModal} activeOpacity={0.8}>
                    <Icon name="x" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {options.map(option => {
                    const isSelected = option.key === selectedKey;

                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.modalOption,
                          isSelected ? styles.modalOptionActive : null,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => handleSelect(option.key)}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected ? styles.modalOptionTextActive : null,
                          ]}
                        >
                          {option.label}
                        </Text>

                        {isSelected ? (
                          <Icon name="check" size={16} color={accentColor} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}

                  {resolvedChildren}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default CompactFilterSelector;

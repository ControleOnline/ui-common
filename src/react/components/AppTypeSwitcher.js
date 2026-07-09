import React, {useMemo, useState} from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {
  app_type,
  app_type_base,
  app_type_options,
  clear_app_type,
  normalize_app_type,
  set_app_type,
} from '@appType';
import styles from './AppTypeSwitcher.styles';

const reloadApp = () => {
  if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
    window.location.reload();
  }
};

function AppTypeOptionsModal({visible, currentAppType, onClose, onSelect}) {
  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return app_type_options;
    }

    return app_type_options.filter(option =>
      option.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar tipo de app</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Fechar seletor"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Icon name="x" size={18} color="#334155" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalSearch}
            value={query}
            onChangeText={setQuery}
            placeholder="Filtrar"
            placeholderTextColor="#94A3B8"
          />
          <ScrollView contentContainerStyle={styles.optionList}>
            {filteredOptions.map(option => {
              const selected = option === currentAppType;

              return (
                <TouchableOpacity
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  style={[styles.optionRow, selected && styles.optionRowActive]}
                  onPress={() => onSelect(option)}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                    {option}
                  </Text>
                  {selected && <Text style={styles.optionHint}>Visão atual</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const AppTypeSwitcher = () => {
  const buildAppType = normalize_app_type(app_type_base);
  const currentAppType = normalize_app_type(app_type);
  const [selectorOpen, setSelectorOpen] = useState(false);

  if (Platform.OS !== 'web' || buildAppType !== 'ADMIN') {
    return null;
  }

  const handleSelect = appType => {
    const normalizedAppType = normalize_app_type(appType);
    if (!normalizedAppType || normalizedAppType === currentAppType) {
      setSelectorOpen(false);
      return;
    }

    if (normalizedAppType === buildAppType) {
      clear_app_type();
    } else {
      set_app_type(normalizedAppType);
    }

    setSelectorOpen(false);
    reloadApp();
  };

  const handleReset = () => {
    clear_app_type();
    setSelectorOpen(false);
    reloadApp();
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.label}>Tipo de app</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Selecionar tipo de app"
          activeOpacity={0.82}
          style={styles.button}
          onPress={() => setSelectorOpen(true)}
          >
          <Text style={styles.buttonText}>{currentAppType}</Text>
          <Icon name="chevron-down" size={16} color="#334155" />
        </TouchableOpacity>

        {currentAppType !== buildAppType && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar para ADMIN"
            activeOpacity={0.82}
            style={styles.resetButton}
            onPress={handleReset}
          >
            <Text style={styles.resetText}>Voltar para ADMIN</Text>
          </TouchableOpacity>
        )}
      </View>

      <AppTypeOptionsModal
        visible={selectorOpen}
        currentAppType={currentAppType}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelect}
      />
    </>
  );
};

export default AppTypeSwitcher;

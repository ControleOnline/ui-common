import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import globalStyles from '../styles/global';
import {useStores} from '@store';

const resolveStateMessage = (value, fallback) => {
  if (value === null || value === undefined || value === false) {
    return '';
  }

  if (typeof value === 'boolean') {
    return fallback;
  }

  if (typeof value === 'string') {
    return value.trim() || fallback;
  }

  return fallback;
};

const StateStore = ({
  store,
  stores = [],
  mode = 'default',
  loading = false,
  saving = false,
  loadingText = 'Carregando...',
  savingText = 'Salvando...',
  title = '',
  subtitle = '',
  showSpinner = false,
  spinnerColor = '#0EA5E9',
  spinnerSize = 'small',
  align = 'center',
  compact = false,
  containerStyle = null,
  contentStyle = null,
  messageStyle = null,
  titleStyle = null,
  subtitleStyle = null,
}) => {
  const styles = globalStyles();
  const allStores = typeof useStores === 'function' ? useStores(state => state) : null;
  const storeNames = [
    ...(Array.isArray(store) ? store : store ? [store] : []),
    ...(Array.isArray(stores) ? stores : []),
  ].filter(Boolean);
  const isCompactMode = mode === 'compact';
  const isDisplayMode = mode === 'display';
  const isCompactLayout = compact || isCompactMode;
  const containerBaseStyle = isCompactLayout
    ? styles.state.compactContainer
    : isDisplayMode
      ? styles.state.displayContainer || styles.state.container
      : styles.state.container;
  const contentBaseStyle = isCompactLayout
    ? styles.state.compactContent
    : [
        styles.state.content,
        styles.state.loadingContainer,
        isDisplayMode ? styles.state.displayContent : null,
      ].filter(Boolean);
  const textAlign = align === 'left' ? 'left' : 'center';
  const alignItems = align === 'left' ? 'flex-start' : 'center';
  const shouldShowSpinner = showSpinner || isCompactLayout || isDisplayMode;

  if (!allStores) {
    const runtimeLoadingText = resolveStateMessage(loading, loadingText);
    const runtimeSavingText = resolveStateMessage(saving, savingText);
    const runtimeEntries = [
      runtimeLoadingText ? {kind: 'loading', label: runtimeLoadingText} : null,
      runtimeSavingText ? {kind: 'saving', label: runtimeSavingText} : null,
    ].filter(Boolean);

    if (runtimeEntries.length === 0) {
      return null;
    }

    return (
      <View style={[containerBaseStyle, containerStyle]}>
        <View style={[contentBaseStyle, {alignItems}, contentStyle]}>
          {(showSpinner || title || subtitle) ? (
            <View
              style={{
                alignItems: alignItems === 'flex-start' ? 'flex-start' : 'center',
                flexDirection: 'row',
                gap: 10,
                justifyContent: alignItems === 'flex-start' ? 'flex-start' : 'center',
                marginBottom: 12,
                width: '100%',
              }}
            >
              {showSpinner ? (
                <ActivityIndicator size={spinnerSize} color={spinnerColor} />
              ) : null}
              {(title || subtitle) ? (
                <View style={{flex: 1, gap: 2}}>
                  {title ? (
                    <Text
                      style={[
                        {
                          color: '#0F172A',
                          fontSize: 14,
                          fontWeight: '800',
                          textAlign,
                        },
                        titleStyle,
                      ]}
                    >
                      {title}
                    </Text>
                  ) : null}
                  {subtitle ? (
                    <Text
                      style={[
                        {
                          color: '#64748B',
                          fontSize: 12,
                          lineHeight: 16,
                          textAlign,
                        },
                        subtitleStyle,
                      ]}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
          {runtimeEntries.map(entry => (
            <Text
              key={`${entry.kind}-${entry.label}`}
              style={[
                styles.state.messageText,
                {textAlign},
                messageStyle,
              ]}
            >
              {entry.label}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  const storeEntries = storeNames
    .map(storeName => {
      const currentStore = allStores?.[storeName] || {};
      const getters = currentStore?.getters || {};

      if (getters.isLoading === true) {
        return {
          kind: 'loading',
          label: `Carregando${storeName ? `: ${storeName}` : ''}`,
        };
      }

      if (getters.isSaving === true) {
        return {
          kind: 'saving',
          label: `Salvando${storeName ? `: ${storeName}` : ''}`,
        };
      }

      return null;
    })
    .filter(Boolean);

  const runtimeEntries = [
    resolveStateMessage(loading, loadingText)
      ? {kind: 'loading', label: resolveStateMessage(loading, loadingText)}
      : null,
    resolveStateMessage(saving, savingText)
      ? {kind: 'saving', label: resolveStateMessage(saving, savingText)}
      : null,
  ].filter(Boolean);

  const entries = [...storeEntries, ...runtimeEntries];

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={[containerBaseStyle, containerStyle]}>
      <View style={[contentBaseStyle, {alignItems}, contentStyle]}>
        {(shouldShowSpinner || title || subtitle) ? (
          <View
            style={{
              alignItems: alignItems === 'flex-start' ? 'flex-start' : 'center',
              flexDirection: 'row',
              gap: 10,
              justifyContent: alignItems === 'flex-start' ? 'flex-start' : 'center',
              marginBottom: 12,
              width: '100%',
            }}
          >
            {shouldShowSpinner ? (
              <ActivityIndicator size={spinnerSize} color={spinnerColor} />
            ) : null}
            {(title || subtitle) ? (
              <View style={{flex: 1, gap: 2}}>
                {title ? (
                  <Text
                    style={[
                      {
                        color: '#0F172A',
                        fontSize: 14,
                        fontWeight: '800',
                        textAlign,
                      },
                      titleStyle,
                    ]}
                  >
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text
                    style={[
                      {
                        color: '#64748B',
                        fontSize: 12,
                        lineHeight: 16,
                        textAlign,
                      },
                      subtitleStyle,
                    ]}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
        {entries.map(entry => (
          <Text
            key={`${entry.kind}-${entry.label}`}
            style={[
              styles.state.messageText,
              {textAlign},
              messageStyle,
            ]}
          >
            {entry.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default StateStore;

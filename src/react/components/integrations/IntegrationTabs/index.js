import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@controleonline/../../src/styles/colors';

import createStyles from './styles';

// Abas horizontais simples para reduzir densidade visual das páginas.
export default function IntegrationTabs({ tabs, activeKey, onChange, accentColor, palette = colors }) {
  const styles = createStyles(palette);
  const resolvedPrimaryBackground =
    palette.buttonBackground ||
    accentColor ||
    palette.primary;
  const resolvedPrimaryBorder =
    palette.buttonBorder ||
    resolvedPrimaryBackground;
  const resolvedPrimaryText =
    palette.buttonText ||
    palette.white;
  const resolvedSecondaryBackground =
    palette.buttonBackgroundSecondary ||
    palette.white;
  const resolvedSecondaryBorder =
    palette.buttonBorderSecondary ||
    palette.border;
  const resolvedSecondaryText =
    palette.buttonTextSecondary ||
    palette.textSecondary;
  const resolvedSecondaryIcon =
    palette.buttonIconSecondary ||
    resolvedSecondaryText;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        const tabColors = active
          ? {
              backgroundColor: resolvedPrimaryBackground,
              borderColor: resolvedPrimaryBorder,
              textColor: resolvedPrimaryText,
              badgeBackground: palette.buttonPressedBackground || resolvedPrimaryBorder,
              badgeText: resolvedPrimaryText,
            }
          : {
              backgroundColor: resolvedSecondaryBackground,
              borderColor: resolvedSecondaryBorder,
              textColor: resolvedSecondaryText,
              badgeBackground: palette.badgeBackground || resolvedSecondaryBackground,
              badgeText: resolvedSecondaryIcon,
            };

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.85}
            style={[
              styles.tabButton,
              {
                backgroundColor: tabColors.backgroundColor,
                borderColor: tabColors.borderColor,
              },
            ]}
            onPress={() => onChange(tab.key)}>
            <Text style={[styles.tabLabel, { color: tabColors.textColor }]}>
              {tab.label}
            </Text>

            {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: tabColors.badgeBackground },
                ]}>
                <Text style={[styles.tabBadgeText, { color: tabColors.badgeText }]}>
                  {tab.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { withOpacity } from '@controleonline/../../src/styles/branding';
import styles from '../../DeviceDetailPage.styles';

/**
 * Device detail header: icon + alias edit/save/trash + deviceString.
 * Refs: app-community#382
 */
export default function DeviceDetailHeader({
  accent,
  alias,
  aliasInput,
  aliasInputRef,
  deviceId,
  deviceString,
  editingAlias,
  removingDevice,
  savingAlias,
  themeColors,
  onAliasChange,
  onConfirmRemove,
  onSaveAlias,
  onStartEdit,
}) {
  return (
    <View style={styles.deviceHeader}>
      <View style={styles.deviceHeaderLeft}>
        <View style={[styles.deviceIconBox, { backgroundColor: withOpacity(accent, 0.1) }]}>
          <Icon name="monitor" size={20} color={accent} />
        </View>

        <View style={styles.aliasBlock}>
          <View style={styles.aliasRow}>
            {editingAlias ? (
              <TextInput
                ref={aliasInputRef}
                style={styles.aliasInput}
                value={aliasInput}
                onChangeText={onAliasChange}
                onSubmitEditing={onSaveAlias}
                returnKeyType="done"
                autoCapitalize="words"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.deviceAlias} numberOfLines={1} ellipsizeMode="tail">
                {alias}
              </Text>
            )}

            {!!deviceId && (
              <TouchableOpacity
                style={[
                  styles.editAliasBtn,
                  {
                    backgroundColor: themeColors.buttonBackground,
                    borderColor: themeColors.buttonBackground,
                  },
                ]}
                onPress={editingAlias ? onSaveAlias : onStartEdit}
                activeOpacity={0.8}
                disabled={savingAlias || removingDevice}
              >
                <Icon
                  name={savingAlias ? 'save' : editingAlias ? 'check' : 'edit-2'}
                  size={16}
                  color={themeColors.buttonIcon}
                />
              </TouchableOpacity>
            )}
            {!!deviceId && !editingAlias && (
              <TouchableOpacity
                style={[
                  styles.editAliasBtn,
                  {
                    backgroundColor: themeColors.buttonBackground,
                    borderColor: themeColors.buttonBackground,
                    marginLeft: 8,
                  },
                ]}
                onPress={onConfirmRemove}
                activeOpacity={0.8}
                disabled={removingDevice || savingAlias}
                accessibilityLabel="Excluir device"
              >
                <Icon
                  name={removingDevice ? 'loader' : 'trash-2'}
                  size={16}
                  color={themeColors.buttonIcon}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.deviceString} numberOfLines={1} ellipsizeMode="middle">
            {deviceString}
          </Text>
        </View>
      </View>
    </View>
  );
}

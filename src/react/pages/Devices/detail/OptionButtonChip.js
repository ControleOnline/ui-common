import React, {useState} from 'react';
import {Platform, Pressable, Text, TouchableOpacity, View} from 'react-native';
import styles from '../../DeviceDetailPage.styles';

const OptionButtonChip = ({
  label,
  selected,
  disabled,
  colors: optionColors,
  tooltip,
  onPress,
}) => {
  const [hovered, setHovered] = useState(false);
  const showTooltip =
    Platform.OS === 'web' && disabled && Boolean(tooltip) && hovered;

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.optionButtonHoverWrap,
        hovered && styles.optionButtonHoverWrapActive,
      ]}>
      <TouchableOpacity
        style={[
          styles.optionButton,
          selected && styles.optionButtonActive,
          optionColors && {
            backgroundColor: selected
              ? optionColors.buttonBackground
              : optionColors.buttonBackgroundSecondary,
            borderColor: selected
              ? optionColors.buttonBorder
              : optionColors.buttonBorderSecondary,
          },
          disabled && {opacity: 0.55},
        ]}
        accessibilityHint={tooltip || undefined}
        activeOpacity={disabled ? 1 : 0.85}
        disabled={disabled}
        onPress={disabled ? undefined : onPress}>
        <Text
          style={[
            styles.optionButtonText,
            selected && styles.optionButtonTextActive,
            optionColors && {
              color: selected
                ? optionColors.buttonText
                : optionColors.buttonTextSecondary,
            },
          ]}>
          {label}
        </Text>
      </TouchableOpacity>
      {showTooltip ? (
        <View pointerEvents="none" style={styles.optionButtonTooltip}>
          <Text style={styles.optionButtonTooltipText}>{tooltip}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

export default OptionButtonChip;

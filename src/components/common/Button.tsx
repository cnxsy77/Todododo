import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = styles.button;
    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...styles.primaryButton };
      case 'secondary':
        return { ...baseStyle, ...styles.secondaryButton };
      case 'outline':
        return { ...baseStyle, ...styles.outlineButton };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle = styles.buttonText;
    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...styles.primaryButtonText };
      case 'secondary':
        return { ...baseStyle, ...styles.secondaryButtonText };
      case 'outline':
        return { ...baseStyle, ...styles.outlineButtonText };
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), disabled && styles.disabledButton, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[getTextStyle(), disabled && styles.disabledButtonText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    button: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButton: {
      backgroundColor: c.primary,
    },
    secondaryButton: {
      backgroundColor: c.surfaceSecondary,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.primary,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    secondaryButtonText: {
      color: c.text,
    },
    outlineButtonText: {
      color: c.primary,
    },
    disabledButton: {
      opacity: 0.5,
    },
    disabledButtonText: {
      color: c.textTertiary,
    },
  });

import React, { useMemo } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme, ThemeColors } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  containerStyle,
  style,
  ...props
}) => {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textTertiary}
        {...props}
      />
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    labelContainer: {
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: c.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      backgroundColor: c.surface,
      color: c.text,
    },
  });

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, ThemeColors } from '../../theme';

interface ReminderPickerProps {
  value?: number;
  onChange: (timestamp: number) => void;
  onClear?: () => void;
  disabled?: boolean;
}

const formatReminder = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// 封装 DateTimePicker：Android 原生弹窗、iOS Modal 内 spinner
export const ReminderPicker: React.FC<ReminderPickerProps> = ({
  value,
  onChange,
  onClear,
  disabled,
}) => {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [showAndroid, setShowAndroid] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  const handlePick = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroid(false);
      if (event.type === 'set' && date) onChange(date.getTime());
    } else {
      // iOS：实时更新选中值，不关闭 Modal（由"完成"关闭）
      if (date) onChange(date.getTime());
    }
  };

  const open = () => {
    if (Platform.OS === 'android') setShowAndroid(true);
    else setIosOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, disabled && styles.buttonDisabled]}
          onPress={open}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, !value && styles.placeholder]}>
            {value ? `🔔 ${formatReminder(value)}` : '🔔 设置提醒时间'}
          </Text>
        </TouchableOpacity>
        {value && onClear && !disabled && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} activeOpacity={0.7}>
            <Text style={styles.clearText}>清除</Text>
          </TouchableOpacity>
        )}
      </View>

      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="datetime"
          display="default"
          onChange={handlePick}
        />
      )}

      {Platform.OS === 'ios' && iosOpen && (
        <Modal transparent animationType="slide" visible={iosOpen} onRequestClose={() => setIosOpen(false)}>
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setIosOpen(false)}>
                  <Text style={styles.iosCancel}>取消</Text>
                </TouchableOpacity>
                <Text style={styles.iosTitle}>提醒时间</Text>
                <TouchableOpacity onPress={() => setIosOpen(false)}>
                  <Text style={styles.iosDone}>完成</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value ? new Date(value) : new Date()}
                mode="datetime"
                display="spinner"
                onChange={handlePick}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    button: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      color: c.text,
    },
    placeholder: {
      color: c.textTertiary,
    },
    clearBtn: {
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    clearText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    iosOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: c.overlay,
    },
    iosSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 20,
    },
    iosHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    iosCancel: {
      fontSize: 16,
      color: c.textSecondary,
    },
    iosTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
    },
    iosDone: {
      fontSize: 16,
      color: c.primary,
      fontWeight: '600',
    },
    iosPicker: {
      height: 200,
    },
  });

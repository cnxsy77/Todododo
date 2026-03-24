import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DatePickerProps {
  value: number;
  onChange: (timestamp: number) => void;
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label = '选择日期' }) => {
  const [visible, setVisible] = useState(false);
  const listRef = useRef<FlatList>(null);
  const shouldScrollRef = useRef(false);

  const currentDate = new Date(value);

  // 生成前后各 180 天的日期列表
  const generateDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 前 180 天到后 365 天
    for (let i = -180; i <= 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const days = generateDays();

  // 找到当前选中日期的索引
  const currentIndexChanged = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays + 180;
  };

  useEffect(() => {
    if (visible && listRef.current) {
      const index = currentIndexChanged();
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: Math.max(0, Math.min(index, days.length - 1)),
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, [visible]);

  const handleSelectDate = (date: Date) => {
    onChange(date.getTime());
    setVisible(false);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  };

  const isSelected = (date: Date) => {
    return format(date, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd');
  };

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) {
      return '今天';
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return '明天';
    }
    return format(date, 'M 月 d 日');
  };

  const formatWeekday = (date: Date) => {
    return format(date, 'EEEE', { locale: zhCN });
  };

  return (
    <>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dateButtonText}>
          {formatDateLabel(currentDate)} {formatWeekday(currentDate)}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              ref={listRef}
              data={days}
              keyExtractor={(item) => item.getTime().toString()}
              renderItem={({ item }) => {
                const selected = isSelected(item);
                const today = isToday(item);
                return (
                  <TouchableOpacity
                    style={[styles.dayItem, selected && styles.dayItemSelected]}
                    onPress={() => handleSelectDate(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dayInfo}>
                      <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
                        {formatDateLabel(item)}
                      </Text>
                      {today && <Text style={styles.todayBadge}>今天</Text>}
                    </View>
                    <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>
                      {formatWeekday(item)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              getItemLayout={(data, index) => ({
                length: 54,
                offset: 54 * index,
                index,
              })}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
              windowSize={21}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 400,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    fontSize: 24,
    color: '#999999',
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  dayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  dayItemSelected: {
    backgroundColor: '#E5F1FF',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#333333',
  },
  dayTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  todayBadge: {
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  weekdayText: {
    fontSize: 14,
    color: '#999999',
  },
  weekdayTextSelected: {
    color: '#007AFF',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { TimeAxisUnit, ViewType } from '../../types';

interface TimeAxisProps {
  units: TimeAxisUnit[];
  currentView: ViewType;
  onUnitPress: (unit: TimeAxisUnit) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const TimeAxis: React.FC<TimeAxisProps & { onSetView?: (view: ViewType) => void }> = ({
  units,
  currentView,
  onUnitPress,
  onPrevious,
  onNext,
  onSetView,
}) => {
  const getViewLabel = () => {
    switch (currentView) {
      case 'day':
        return '日';
      case 'week':
        return '周';
      case 'month':
        return '月';
      case 'year':
        return '年';
    }
  };

  return (
    <View style={styles.container}>
      {/* 视图切换按钮 */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity style={styles.navButton} onPress={onPrevious}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.viewButtons}>
          {(['day', 'week', 'month', 'year'] as ViewType[]).map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.viewButton,
                currentView === view && styles.viewButtonActive,
              ]}
              onPress={() => onSetView?.(view)}
            >
              <Text
                style={[
                  styles.viewButtonText,
                  currentView === view && styles.viewButtonTextActive,
                ]}
              >
                {view === 'day' ? '日' : view === 'week' ? '周' : view === 'month' ? '月' : '年'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.navButton} onPress={onNext}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 时间轴 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.axisContainer}
      >
        {units.map((unit) => (
          <TouchableOpacity
            key={unit.id}
            style={[
              styles.unit,
              unit.isSelected && styles.unitSelected,
            ]}
            onPress={() => onUnitPress(unit)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.unitLabel,
                unit.isSelected && styles.unitLabelSelected,
              ]}
            >
              {unit.label}
            </Text>
            {unit.subLabel && (
              <Text style={styles.unitSubLabel}>{unit.subLabel}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  viewSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '600',
  },
  viewButtons: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  viewButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  viewButtonTextActive: {
    color: '#FFFFFF',
  },
  axisContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  unit: {
    minWidth: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  unitLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  unitLabelSelected: {
    color: '#FFFFFF',
  },
  unitSubLabel: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },
});

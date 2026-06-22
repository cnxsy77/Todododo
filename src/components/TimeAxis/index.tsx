import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { TimeAxisUnit, ViewType } from '../../types';
import { useTheme, ThemeColors } from '../../theme';

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
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
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
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonText: {
      fontSize: 24,
      color: c.primary,
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
      backgroundColor: c.surfaceSecondary,
    },
    viewButtonActive: {
      backgroundColor: c.primary,
    },
    viewButtonText: {
      fontSize: 14,
      color: c.textSecondary,
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
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    unitSelected: {
      backgroundColor: c.primary,
      borderColor: c.primaryDark,
    },
    unitLabel: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500',
    },
    unitLabelSelected: {
      color: '#FFFFFF',
    },
    unitSubLabel: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 2,
    },
  });

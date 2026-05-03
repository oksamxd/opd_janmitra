import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export default function JanaOptionChips({ options, type, onSelect, onDateSelected }) {
  if (!options || options.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {options.map((option, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.chip}
            onPress={() => onSelect(option)}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0f2f1',
    borderWidth: 1,
    borderColor: '#00bfa5',
    marginRight: 8,
  },
  chipText: {
    color: '#008080',
    fontWeight: '600',
    fontSize: 14,
  }
});

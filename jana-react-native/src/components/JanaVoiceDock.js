import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JanaVoiceState } from '../models/types';

export default function JanaVoiceDock({ state, onMicTap }) {
  const isListening = state === JanaVoiceState.listening;
  const isProcessing = state === JanaVoiceState.processing;
  const isSpeaking = state === JanaVoiceState.speaking;

  // Determine button styles based on state
  let bgColor = '#008080';
  let iconName = 'mic';
  let iconColor = '#fff';

  if (isListening) {
    bgColor = '#e74c3c';
    iconName = 'stop';
  } else if (isProcessing) {
    bgColor = '#f39c12';
    // Using default icon but will show spinner overlay
  } else if (isSpeaking) {
    bgColor = '#3498db';
    iconName = 'volume-high';
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.micButton, { backgroundColor: bgColor }]}
        onPress={onMicTap}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons name={iconName} size={28} color={iconColor} />
        )}
      </TouchableOpacity>
      
      {isListening && <Text style={styles.statusText}>Listening...</Text>}
      {isProcessing && <Text style={styles.statusText}>Processing...</Text>}
      {isSpeaking && <Text style={styles.statusText}>Speaking...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statusText: {
    marginTop: 8,
    color: '#7f8c8d',
    fontSize: 12,
    fontWeight: '600',
  }
});

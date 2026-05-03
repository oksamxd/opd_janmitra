import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JanaTextInputBar({ onSend, onAttach, t }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() === '') return;
    onSend(text);
    setText('');
    Keyboard.dismiss();
  };

  const placeholder = t ? t('type_placeholder') : 'Type your message...';

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.type === 'success' || !result.canceled) {
        const fileObj = result.assets ? result.assets[0] : result;
        if (onAttach && fileObj) {
          onAttach(fileObj);
        }
      }
    } catch (e) {
      console.log('Document picker error', e);
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.attachBtn} onPress={handleAttach}>
          <Ionicons name="attach" size={24} color="#008080" />
        </TouchableOpacity>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#95a5a6"
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendBtn, text.trim() === '' && styles.sendBtnDisabled]} 
          onPress={handleSend}
          disabled={text.trim() === ''}
        >
          <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, // Increased to avoid corner cutoffs
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginBottom: Platform.OS === 'android' ? 30 : 0, // Extra space for Android bottom nav buttons
  },
  attachBtn: {
    padding: 8,
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    justifyContent: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    minHeight: 24,
    maxHeight: 100,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#008080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
    elevation: 0,
  }
});

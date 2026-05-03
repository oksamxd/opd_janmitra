import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { JanaMessageType } from '../models/types';
import { Ionicons } from '@expo/vector-icons';

export default function JanaMessageBubble({ message }) {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isJanmitra = message.sender === 'janmitra';

  if (isSystem || message.type === JanaMessageType.milestone) {
    return (
      <View style={styles.systemContainer}>
        <View style={styles.systemBadge}>
          <Text style={styles.systemText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // Handle providerCard/slotCard specially if needed, but for now rendering as text with distinct style
  if (message.type === JanaMessageType.providerCard || message.type === JanaMessageType.slotCard) {
    return (
      <View style={[styles.container, styles.janaContainer]}>
        <View style={[styles.bubble, styles.janaBubble, { borderWidth: 1, borderColor: '#00bfa5' }]}>
            <Text style={styles.janaText}>{message.text}</Text>
            {/* If there's data in payload, like slots or doctors, you can map them here. We just show text for simplicity */}
            {message.type === JanaMessageType.providerCard && <Text style={{fontSize:10, color:'#008080', marginTop:4}}>- Doctor Card Component -</Text>}
            {message.type === JanaMessageType.slotCard && <Text style={{fontSize:10, color:'#008080', marginTop:4}}>- Slot Card Component -</Text>}
        </View>
      </View>
    );
  }

  if (message.type === JanaMessageType.documentCard) {
    return (
      <View style={[styles.container, styles.userContainer]}>
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#008080' }]}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <Ionicons name="document-text" size={20} color="#008080" style={{marginRight: 8}} />
             <Text style={[styles.userText, { color: '#2c3e50' }]}>{message.text}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.janaContainer]}>
      {isJanmitra && <Text style={styles.janmitraLabel}>Janmitra Associate</Text>}
      <View style={[
        styles.bubble, 
        isUser ? styles.userBubble : styles.janaBubble,
        isJanmitra ? styles.janmitraBubble : null
      ]}>
        <Text style={isUser ? styles.userText : styles.janaText}>
          {message.text}
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {(() => {
          const d = message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
          const hours = d.getHours().toString().padStart(2, '0');
          const minutes = d.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        })()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
  },
  janaContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#008080',
    borderBottomRightRadius: 4,
  },
  janaBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  janmitraBubble: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  janaText: {
    color: '#2c3e50',
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: '#95a5a6',
    marginTop: 4,
    alignSelf: 'flex-end',
    marginHorizontal: 4,
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  systemBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#7f8c8d',
    textTransform: 'uppercase',
  },
  janmitraLabel: {
    fontSize: 10,
    color: '#ff9800',
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 4,
  }
});

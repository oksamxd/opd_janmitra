import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import JanaMessageBubble from './JanaMessageBubble';

export default function JanaConversationList({ messages }) {
  const scrollViewRef = useRef();

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {messages.map((msg, index) => (
        <JanaMessageBubble key={msg.id || index} message={msg} />
      ))}
      <View style={{ height: 10 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f4',
  },
  contentContainer: {
    paddingHorizontal: 24, // Increased to avoid corner cutoffs
    paddingTop: 16,
    paddingBottom: 24,
  }
});

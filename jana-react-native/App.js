import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import Constants from 'expo-constants';
import DemoSelector from './src/screens/DemoSelector';
import JanaAiPage from './src/screens/JanaAiPage';
import JanaAssociateDashboard from './src/screens/JanaAssociateDashboard';

export default function App() {
  const variant = Constants.expoConfig?.extra?.appVariant || 'selector';
  
  const [currentScreen, setCurrentScreen] = useState(
    variant === 'member' ? 'Chat' : 
    variant === 'associate' ? 'AssociateDashboard' : 
    'Selector'
  );
  const [currentMode, setCurrentMode] = useState(variant === 'associate' ? 'associate' : 'member');

  let content;

  const handleBack = () => {
    if (variant === 'selector') {
      setCurrentScreen('Selector');
    }
  };

  if (currentScreen === 'Selector') {
    content = <DemoSelector setScreen={setCurrentScreen} setMode={setCurrentMode} />;
  } else if (currentScreen === 'AssociateDashboard') {
    content = <JanaAssociateDashboard onBack={handleBack} />;
  } else if (currentScreen === 'Chat') {
    content = <JanaAiPage mode={currentMode} onBack={handleBack} />;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="auto" />
        {content}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
});

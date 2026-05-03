import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { translations } from '../utils/translations';
import { Ionicons } from '@expo/vector-icons';

export default function DemoSelector({ setScreen, setMode }) {
  const [lang, setLang] = useState('en');
  
  const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || key;

  const launchMode = (screen, mode) => {
    if (mode) setMode(mode);
    setScreen(screen);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('welcome_title')}</Text>
        <Text style={styles.subtitle}>{t('welcome_subtitle')}</Text>
      </View>

      <View style={styles.langPicker}>
         {['en', 'hi', 'kn'].map(l => (
           <TouchableOpacity 
             key={l}
             style={[styles.langBtn, lang === l && styles.langBtnActive]}
             onPress={() => setLang(l)}
           >
             <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
               {l === 'en' ? 'EN' : l === 'hi' ? 'हिन्दी' : 'ಕನ್ನಡ'}
             </Text>
           </TouchableOpacity>
         ))}
      </View>

      <View style={styles.body}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => launchMode('Chat', 'member')}
        >
          <Ionicons name="person-outline" size={20} color="#008080" style={{marginRight: 10}} />
          <Text style={styles.buttonText}>{t('launch_member')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => launchMode('AssociateDashboard')}
        >
          <Ionicons name="medkit-outline" size={20} color="#008080" style={{marginRight: 10}} />
          <Text style={styles.buttonText}>{t('launch_associate')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => launchMode('Chat', 'web')}
        >
          <Ionicons name="desktop-outline" size={20} color="#008080" style={{marginRight: 10}} />
          <Text style={styles.buttonText}>{t('launch_web')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9f9',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: '#008080',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  langPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: -25,
    zIndex: 10,
  },
  langBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  langBtnActive: {
    backgroundColor: '#008080',
  },
  langBtnText: {
    color: '#008080',
    fontWeight: 'bold',
  },
  langBtnTextActive: {
    color: '#fff',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 10,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,128,128,0.1)',
  },
  buttonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  }
});

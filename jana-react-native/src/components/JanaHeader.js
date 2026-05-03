import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { translations } from '../utils/translations';
import config from '../config';

export default function JanaHeader({
  speakerEnabled,
  currentLanguage,
  onToggleSpeaker,
  onRequestHuman,
  isHumanControlled,
  onSwitchLanguage,
}) {
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const breathAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleLangSelect = (langCode) => {
    if (onSwitchLanguage) onSwitchLanguage(langCode);
    setShowLangMenu(false);
  };

  const t = (key) => translations[currentLanguage]?.[key] || translations['en']?.[key] || key;
  const primaryColor = config.isAssociate ? '#1E3A5F' : '#008080';

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Animated.View style={[styles.logo, { transform: [{ scale: breathAnim }] }]}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </Animated.View>
        <View>
          <Text style={styles.title}>{t('app_title')}</Text>
          <Text style={styles.subtitle}>{t('app_subtitle')}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.iconBtn, { backgroundColor: showLangMenu ? '#e0f2f1' : 'transparent', borderRadius: 8 }]} 
          onPress={() => setShowLangMenu(!showLangMenu)}
        >
          <Ionicons name="language" size={20} color={primaryColor} />
          <Text style={[styles.langText, { color: primaryColor }]}>{currentLanguage.substring(0, 2).toUpperCase()}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={onToggleSpeaker}>
          <Ionicons name={speakerEnabled ? "volume-high" : "volume-mute"} size={20} color={primaryColor} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={20} color={primaryColor} />
        </TouchableOpacity>

        {onRequestHuman && (
          <TouchableOpacity 
            style={styles.profileBtn} 
            onPress={onRequestHuman}
          >
            <View style={[styles.avatarCircle, { backgroundColor: isHumanControlled ? '#FF9800' : primaryColor }]}>
              <View style={styles.badge}>
                 <Ionicons 
                    name={isHumanControlled ? "hardware-chip-outline" : "headset"} 
                    size={10} 
                    color="#fff" 
                 />
              </View>
              <Text style={styles.avatarText}>JD</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {showLangMenu && (
        <View style={styles.langOverlay}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.langBackdrop} 
            onPress={() => setShowLangMenu(false)} 
          />
          <View style={styles.langModal}>
            <Text style={{padding: 12, fontWeight: 'bold', borderBottomWidth: 1, borderColor: '#eee', color: '#333'}}>
              {t('select_language')}
            </Text>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangSelect('en')}>
              <Text style={{color: currentLanguage === 'en' ? primaryColor : '#333', fontWeight: currentLanguage === 'en' ? 'bold' : 'normal'}}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangSelect('hi')}>
              <Text style={{color: currentLanguage === 'hi' ? primaryColor : '#333', fontWeight: currentLanguage === 'hi' ? 'bold' : 'normal'}}>Hindi (हिन्दी)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => handleLangSelect('kn')}>
              <Text style={{color: currentLanguage === 'kn' ? primaryColor : '#333', fontWeight: currentLanguage === 'kn' ? 'bold' : 'normal'}}>Kannada (ಕನ್ನಡ)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#fff',
    alignItems: 'center',
    zIndex: 100,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 10,
    color: '#7f8c8d',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
  },
  profileBtn: {
    marginLeft: 4,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#008080',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  langText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  langOverlay: {
    position: 'absolute',
    top: 50,
    right: 16,
    zIndex: 10001,
  },
  langBackdrop: {
    position: 'absolute',
    top: -100, right: -100, bottom: -2000, left: -2000,
  },
  langModal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  langOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  }
});

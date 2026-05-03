import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useJanaChat } from '../hooks/useJanaChat';
import { Ionicons } from '@expo/vector-icons';

import JanaHeader from '../components/JanaHeader';
import JanaMemberContextHeader from '../components/JanaMemberContextHeader';
import JanaConversationList from '../components/JanaConversationList';
import JanaOptionChips from '../components/JanaOptionChips';
import JanaTextInputBar from '../components/JanaTextInputBar';
import JanaVoiceDock from '../components/JanaVoiceDock';
import JanaRightPanel from '../components/JanaRightPanel';

export default function JanaAiPage({ mode = 'member', onBack }) {
  const insets = useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  const {
    state,
    sendMessage,
    uploadFile,
    selectOption,
    selectDate,
    requestHandoff,
    returnToAi,
    toggleSpeaker,
    switchLanguage,
    startVoice,
    stopVoice,
  } = useJanaChat(mode, null, 'en');

  const isHumanControlled = state.controlledBy === 'HUMAN';

  const chatUI = (
    <View style={styles.chatAreaContainer}>
      <View style={{ height: Platform.OS === 'ios' ? insets.top : 0, backgroundColor: '#fff' }} />
      <JanaHeader 
        speakerEnabled={state.speakerEnabled}
        currentLanguage={state.currentLanguage}
        onToggleSpeaker={toggleSpeaker}
        onRequestHuman={isHumanControlled ? returnToAi : requestHandoff}
        isHumanControlled={isHumanControlled}
        onSwitchLanguage={switchLanguage}
      />
      
      <View style={{flexDirection: 'row', alignItems:'center', backgroundColor: '#e0f2f1'}}>
         <TouchableOpacity onPress={onBack} style={{padding: 8, marginLeft:8}}>
           <Ionicons name="arrow-back" size={20} color="#008080" />
         </TouchableOpacity>
        <View style={{flex:1}}>
          <JanaMemberContextHeader 
            sessionId={state.sessionId}
            memberId={state.memberId}
            t={state.t}
          />
        </View>
      </View>

      {isHumanControlled && (
        <View style={styles.janmitraBanner}>
          <View style={styles.janmitraAvatar}>
            <Text style={styles.janmitraInitials}>
              {state.janmitraData?.fullName ? state.janmitraData.fullName[0] : 'J'}
            </Text>
          </View>
          <View style={{flex: 1, marginLeft: 10}}>
            <Text style={styles.janmitraName}>{state.janmitraData?.fullName || 'Janmitra'}</Text>
            <Text style={styles.janmitraSub}>Janmitra Associate • Managing session</Text>
          </View>
          <TouchableOpacity style={styles.btnReturnAi} onPress={returnToAi}>
              <Ionicons name="hardware-chip-outline" size={14} color="#37D2E0" />
              <Text style={styles.btnReturnAiText}>AI</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.chatArea}>
        {state.messages.length === 0 ? (
           <View style={styles.emptyState}>
             <Ionicons name="chatbubbles-outline" size={64} color="#bdc3c7" />
             <Text style={styles.emptyText}>Say hello to start the conversation!</Text>
           </View>
        ) : (
           <JanaConversationList messages={state.messages} />
        )}
      </View>

      {(state.pendingOptions.length > 0 || state.pendingType === 'date') && (
        <JanaOptionChips 
          options={state.pendingOptions}
          type={state.pendingType}
          onSelect={selectOption}
          onDateSelected={selectDate}
        />
      )}

      <JanaVoiceDock 
        state={state.voiceState}
        onMicTap={() => {
          if (state.voiceState === 'idle') {
            startVoice();
          } else {
            stopVoice();
          }
        }}
      />

      <JanaTextInputBar 
        onSend={(text) => sendMessage(text)} 
        onAttach={uploadFile} 
        t={state.t}
      />
      <View style={{ height: Platform.OS === 'ios' ? insets.bottom : 0, backgroundColor: '#fff' }} />
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={{flex: 1, flexDirection: 'row'}}>
          <View style={{ flex: mode === 'web' ? 2 : 1 }}>
             {chatUI}
          </View>
          
          {mode === 'web' && (
            <View style={{ flex: 1 }}>
               <JanaRightPanel contextEvents={state.contextEvents} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 35 : 0,
  },
  chatAreaContainer: {
    flex: 1,
    backgroundColor: '#f0f4f4',
  },
  chatArea: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  janmitraBanner: {
    backgroundColor: '#1a1200',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#ff9800',
  },
  janmitraAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  janmitraInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  janmitraName: {
    color: '#ff9800',
    fontWeight: 'bold',
    fontSize: 13,
  },
  janmitraSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  btnReturnAi: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btnReturnAiText: {
    color: '#37D2E0',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: 'bold',
  }
});

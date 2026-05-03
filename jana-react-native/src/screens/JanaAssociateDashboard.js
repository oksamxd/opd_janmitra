import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import EventSource from 'react-native-sse';
import { v4 as uuidv4 } from 'uuid';
import { getBaseUrl } from '../hooks/useJanaChat';

import JanaConversationList from '../components/JanaConversationList';
import JanaOptionChips from '../components/JanaOptionChips';

export default function JanaAssociateDashboard({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [pendingOptions, setPendingOptions] = useState([]);
  const [pendingType, setPendingType] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);

  const baseUrl = getBaseUrl();
  const eventSourceRef = useRef(null);
  const seenEventIdsRef = useRef(new Set());
  const myName = 'Priya Sharma';
  const myId = 'JSP-1011';

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  const fetchSessions = async () => {
    try {
      if (loadingSessions) return;
      setLoadingSessions(true);
      const res = await axios.get(`${baseUrl}/api/context/sessions/active`);
      if (res.status === 200) {
        setSessions(res.data.sessions || []);
      }
    } catch(err) {
      // quiet fail
    } finally {
      setLoadingSessions(false);
    }
  };

  const selectSession = async (s) => {
    setSelectedSession(s);
    setLoadingChat(true);
    setChatHistory([]);
    setPendingOptions([]);
    setPendingType(null);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    seenEventIdsRef.current.clear();

    try {
      const res = await axios.get(`${baseUrl}/api/context/sessions/${s.sessionId}/history`);
      if (res.status === 200) {
        // Map messages
        const history = res.data.history || [];
        const mapped = history.map(m => {
          let type = 'text';
          const role = m.role || 'user';
          if (role === 'janmitra') type = 'janmitra';
          if (role === 'assistant' || role === 'jana') {
            const tStr = m.type || (m.payload && m.payload.type) || 'text';
            if (tStr === 'slots') type = 'slotCard';
            if (tStr === 'doctors') type = 'providerCard';
            if (tStr === 'options') type = 'quickReplies';
          }
          return {
            id: m.id || uuidv4(),
            sender: role === 'assistant' ? 'jana' : role,
            type,
            text: m.content || m.message || '',
            createdAt: new Date(m.createdAt || Date.now()),
            payload: m.payload || {}
          };
        });

        // Inject saved case events (timeline overlap)
        const caseEvents = res.data.caseEvents || [];
        for (const ev of caseEvents) {
          const evId = ev.event_id || uuidv4();
          if (seenEventIdsRef.current.has(evId)) continue;
          seenEventIdsRef.current.add(evId);

          if (ev.event_type === 'JANMITRA_MESSAGE') {
             mapped.push({
               id: evId, sender: 'janmitra', type: 'janmitra',
               text: ev.payload?.message || '', createdAt: new Date(ev.created_at || Date.now()), payload: ev.payload || {}
             });
          } else if (ev.event_type === 'AI_RESPONSE') {
             const rt = ev.payload?.type || 'text';
             let type = 'text';
             if (rt==='slots') type = 'slotCard';
             if (rt==='doctors') type = 'providerCard';
             mapped.push({
               id: evId, sender: 'jana', type,
               text: ev.payload?.message || '', createdAt: new Date(ev.created_at || Date.now()), payload: ev.payload || {}
             });
          }
        }
        
        // sort by date just in case
        mapped.sort((a,b) => a.createdAt - b.createdAt);
        setChatHistory(mapped);
      }
    } catch(e) {}
    finally {
      setLoadingChat(false);
    }

    // Set up SSE
    const streamId = s.caseId || s.sessionId;
    eventSourceRef.current = new EventSource(`${baseUrl}/api/events/stream/${streamId}`);
    eventSourceRef.current.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        const events = JSON.parse(event.data);
        const newHistoryItems = [];
        
        events.forEach(ev => {
          const evId = ev.event_id || uuidv4();
          if (seenEventIdsRef.current.has(evId)) return;
          seenEventIdsRef.current.add(evId);

          if (ev.event_type === 'JANMITRA_MESSAGE') {
            newHistoryItems.push({
               id: evId, sender: 'janmitra', type: 'janmitra',
               text: ev.payload?.message || '', createdAt: new Date(ev.created_at || Date.now()), payload: ev.payload || {}
            });
          } else if (ev.event_type === 'AI_RESPONSE') {
             const rt = ev.payload?.type || 'text';
             let type = 'text';
             if (rt==='slots') type = 'slotCard';
             if (rt==='doctors') type = 'providerCard';
             
             if (ev.payload?.options) {
               setPendingOptions(ev.payload.options);
               setPendingType(rt);
             }

             newHistoryItems.push({
               id: evId, sender: 'jana', type,
               text: ev.payload?.message || '', createdAt: new Date(ev.created_at || Date.now()), payload: ev.payload || {}
             });
          } else {
             const milestones = ['CASE_CREATED', 'STEP_COMPLETED', 'TRIAGE_COMPLETED', 'APPOINTMENT_BOOKED', 'TEST_ORDERED'];
             if (milestones.includes(ev.event_type)) {
                let mTitle = ev.event_type.replace(/_/g, ' ');
                if (ev.event_type === 'CASE_CREATED') mTitle = '🏥 Case Created';
                if (ev.event_type === 'APPOINTMENT_BOOKED') mTitle = '📅 Appointment Booked';

                newHistoryItems.push({
                  id: evId, sender: 'system', type: 'milestone',
                  text: mTitle, createdAt: new Date(ev.created_at || Date.now()), payload: {title: mTitle, ...ev.payload}
                });
             }
          }
        });

        if (newHistoryItems.length > 0) {
          setChatHistory(prev => [...prev, ...newHistoryItems]);
        }
      } catch(e) {}
    });
  };

  const takeOver = async () => {
    if (!selectedSession) return;
    try {
      await axios.post(`${baseUrl}/api/context/handoff/to-human/${selectedSession.sessionId}`, {
        reason: 'Associate took control'
      });
      fetchSessions();
      setSelectedSession({...selectedSession, controlledBy: 'HUMAN'});
    } catch(e) {}
  };

  const releaseToAi = async () => {
    if (!selectedSession) return;
    try {
      await axios.post(`${baseUrl}/api/context/handoff/to-ai/${selectedSession.sessionId}`);
      fetchSessions();
      setSelectedSession({...selectedSession, controlledBy: 'AI'});
    } catch(e) {}
  };

  const sendMessage = async () => {
    if (!msgInput.trim() || !selectedSession) return;
    const text = msgInput.trim();
    setMsgInput('');
    setSending(true);

    const tempId = uuidv4();
    setChatHistory(prev => [...prev, {
       id: tempId, sender: 'janmitra', type: 'janmitra', text, createdAt: new Date()
    }]);

    try {
      await axios.post(`${baseUrl}/api/context/handoff/janmitra-message/${selectedSession.sessionId}`, {
        message: text,
        janmitraName: myName,
        janmitraId: myId
      });
    } catch(e) {
      console.error("Message send failed", e);
      // Optional: remove tempId from history if failed
      setChatHistory(prev => prev.filter(m => m.id !== tempId));
    }
    finally { setSending(false); }
  };

  const sendTrigger = async (triggerText) => {
    if (!selectedSession) return;
    setSending(true);
    setPendingOptions([]);
    setPendingType(null);
    setChatHistory(prev => [...prev, {
      id: uuidv4(), sender: 'janmitra', type: 'janmitra', text: `Action: ${triggerText}`, createdAt: new Date()
    }]);

    try {
      await axios.post(`${baseUrl}/api/context/handoff/janmitra-trigger/${selectedSession.sessionId}`, {
        message: triggerText,
        janmitraName: myName,
        janmitraId: myId
      });
    } catch(e) {}
    finally { setSending(false); }
  };

  const isHuman = selectedSession?.controlledBy === 'HUMAN';

  return (
    <View style={styles.container}>
      {/* ── Conditional Rendering for Mobile (No Overlap) ── */}
      {!selectedSession ? (
        <View style={[styles.sessionList, { width: '100%' }]}>
          <View style={styles.sessionListHeader}>
            <TouchableOpacity onPress={onBack} style={{position: 'absolute', top: 20, right: 16, zIndex: 10}}>
               <Ionicons name="close" size={24} color="#FF9800" />
            </TouchableOpacity>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <View style={styles.avatarLogo}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>JA</Text>
              </View>
              <View style={{marginLeft: 10}}>
                <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>Janmitra Dashboard</Text>
                <Text style={{color: '#FF9800', fontSize: 11}}>Associate Mode</Text>
              </View>
            </View>
            <Text style={{color: 'rgba(255,255,255,0.38)', fontSize: 10, letterSpacing: 1.2, marginTop: 12}}>
              ACTIVE SESSIONS
            </Text>
          </View>

          <ScrollView style={{flex: 1}}>
            {sessions.length === 0 ? (
              <Text style={{color: 'rgba(255,255,255,0.38)', textAlign: 'center', marginTop: 20}}>No active sessions</Text>
            ) : (
              sessions.map(s => {
                const isSelected = selectedSession?.sessionId === s.sessionId;
                const isSHuman = s.controlledBy === 'HUMAN';
                let sevColor = '#4CAF50';
                if (s.severity === 'severe') sevColor = '#F44336';
                if (s.severity === 'moderate') sevColor = '#FF9800';

                return (
                  <TouchableOpacity key={s.sessionId} onPress={() => selectSession(s)}
                    style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: sevColor}} />
                      <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 8, flex: 1}}>
                         {s.memberName || 'Member'}
                      </Text>
                      {isSHuman && (
                         <View style={{backgroundColor: 'rgba(255,152,0,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8}}>
                           <Text style={{color: '#FF9800', fontSize: 9, fontWeight: 'bold'}}>HUMAN</Text>
                         </View>
                      )}
                    </View>
                    <Text style={{color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 4}}>{(s.opdState||'NEW').replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
         <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
               <TouchableOpacity onPress={() => setSelectedSession(null)} style={{marginRight: 12}}>
                 <Ionicons name="arrow-back" size={24} color="#37D2E0" />
               </TouchableOpacity>
               <Ionicons name="person-outline" size={20} color="#37D2E0" />
               <View style={{flex: 1, marginLeft: 8}}>
                 <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 14}}>{selectedSession.memberName}</Text>
                 <Text style={{color: 'rgba(255,255,255,0.38)', fontSize: 11}}>
                   {(selectedSession.opdState||'NEW').replace(/_/g, ' ')} • {isHuman ? '👤 Human Control' : '🤖 AI Control'}
                 </Text>
               </View>
               {!isHuman ? (
                 <TouchableOpacity onPress={takeOver} style={styles.btnTakeOver}>
                   <Ionicons name="headset-outline" size={14} color="#fff" />
                   <Text style={{color: '#fff', fontSize: 12, marginLeft: 6}}>Take Over</Text>
                 </TouchableOpacity>
               ) : (
                 <TouchableOpacity onPress={releaseToAi} style={styles.btnRelease}>
                   <Ionicons name="hardware-chip-outline" size={14} color="#37D2E0" />
                   <Text style={{color: '#37D2E0', fontSize: 12, marginLeft: 6}}>Release to AI</Text>
                 </TouchableOpacity>
               )}
            </View>

            <View style={{flex: 1, backgroundColor: '#0B1628'}}>
              {loadingChat ? (
                 <ActivityIndicator color="#37D2E0" style={{marginTop: 20}} />
              ) : (
                 <JanaConversationList messages={chatHistory} />
              )}
            </View>

            {pendingOptions.length > 0 && (
               <View style={{backgroundColor: '#0E1A2B', borderTopWidth: 1, borderTopColor: '#1E3A5F'}}>
                 <JanaOptionChips options={pendingOptions} type={pendingType} onSelect={(o) => sendTrigger(o.value)} />
               </View>
            )}

            {isHuman ? (
              <View style={styles.inputArea}>
                <TextInput 
                  style={styles.inputField}
                  placeholder="Type message to member..."
                  placeholderTextColor="rgba(255,255,255,0.24)"
                  value={msgInput}
                  onChangeText={setMsgInput}
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={sending}>
                   {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{padding: 16, backgroundColor: '#0E1A2B', flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="information-circle-outline" color="rgba(255,255,255,0.38)" size={16} />
                <Text style={{color: 'rgba(255,255,255,0.38)', fontSize: 12, marginLeft: 8}}>Take over to send messages</Text>
              </View>
            )}
         </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0B1628',
  },
  sessionList: {
    width: 300,
    backgroundColor: '#0B1628',
  },
  sessionListHeader: {
    backgroundColor: '#0E1A2B',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: '#FF9800',
  },
  avatarLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCard: {
    backgroundColor: '#0E1A2B',
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  sessionCardSelected: {
    backgroundColor: '#1A2E4A',
    borderColor: '#37D2E0',
    borderWidth: 1.5,
  },
  detailEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContainer: {
    flex: 1,
    display: 'flex',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0E1A2B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
  },
  btnTakeOver: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnRelease: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#37D2E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0E1A2B',
    borderTopWidth: 1,
    borderTopColor: '#FF9800',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#1A2E4A',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },
  sendBtn: {
    marginLeft: 10,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

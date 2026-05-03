import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import axios from 'axios';
import 'react-native-url-polyfill/auto';
import EventSource from 'react-native-sse';

import { JanaMessageType, JanaVoiceState } from '../models/types';
import { translations } from '../utils/translations';

import Constants from 'expo-constants';
import config from '../config';

// Web and Mobile compatible base URL
export const getBaseUrl = () => {
  return config.apiUrl;
};

export const useJanaChat = (initialMode = 'member', memberId = null, initialLanguage = 'en') => {
  const baseUrl = getBaseUrl();
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  const [sessionId, setSessionId] = useState(() => generateUUID());
  const [mode, setMode] = useState(initialMode);
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [controlledBy, setControlledBy] = useState('AI');
  const [janmitraData, setJanmitraData] = useState(null);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

  const speakerEnabledRef = useRef(speakerEnabled);
  useEffect(() => {
    speakerEnabledRef.current = speakerEnabled;
  }, [speakerEnabled]);

  const [messages, setMessages] = useState([]);
  const [voiceState, setVoiceState] = useState(JanaVoiceState.idle);
  const [pendingOptions, setPendingOptions] = useState([]);
  const [pendingType, setPendingType] = useState(null);
  
  const [contextEvents, setContextEvents] = useState([]);

  const eventSourceRef = useRef(null);
  const lastAutoAdvanceRef = useRef(null);
  const processedEventIdsRef = useRef(new Set());
  const eventQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);
  const isFirstSyncRef = useRef(true);
  const currentStreamIdentifierRef = useRef(null);
  const activeAudioSessionRef = useRef(null);
  
  // Use a ref to access latest messages in queue processor without triggering loop
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const activeCaseIdRef = useRef(activeCaseId);
  useEffect(() => {
    activeCaseIdRef.current = activeCaseId;
  }, [activeCaseId]);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initial Message Trigger handling
  useEffect(() => {
    if (memberId) {
      sendMessage(memberId);
    } else {
      sendMessage('__INIT__', { hidden: true });
    }
  }, [memberId]);

  const isFirstLangRender = useRef(true);
  // Re-init on language change if no conversation has happened yet
  useEffect(() => {
    if (isFirstLangRender.current) {
      isFirstLangRender.current = false;
      return;
    }
    if (messages.length <= 1) { // 1 for the existing __INIT__ response
      setMessages([]);
      sendMessage('__INIT__', { hidden: true });
    }
  }, [currentLanguage]);

  const sendMessage = useCallback(async (text, options = {}) => {
    const { displayLabel = null, hidden = false } = options;
    if (!text || text.trim() === '') return;

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(text);
    
    // Auto sent filtering
    const isAutoSent = (text === memberId && messagesRef.current.length === 0) ||
                       text === '__auto_advance__' ||
                       hidden || isUuid;

    if (!isAutoSent) {
      const msg = {
        id: new Date().getTime().toString(),
        sender: 'user',
        type: JanaMessageType.text,
        text: displayLabel || text,
        createdAt: new Date(),
        payload: {}
      };
      setMessages(prev => [...prev, msg]);
      setVoiceState(JanaVoiceState.processing);
      setPendingOptions([]);
      setPendingType(null);
    } else {
      setVoiceState(JanaVoiceState.processing);
      setPendingOptions([]);
      setPendingType(null);
    }

    try {
      const response = await axios.post(`${baseUrl}/api/jana/message`, {
        message: text,
        sessionId: sessionIdRef.current,
        language: currentLanguage
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 || response.status === 201) {
        const data = response.data;
        const replyText = data.message || 'No response';
        const responseType = data.type || 'text';
        const rawOptions = data.options || [];

        let msgType;
        switch (responseType) {
          case 'doctors':
            msgType = JanaMessageType.providerCard;
            break;
          case 'slots':
            msgType = JanaMessageType.slotCard;
            break;
          default:
            msgType = JanaMessageType.text;
        }

        const receivedMsg = {
          id: new Date().getTime().toString(),
          sender: 'jana',
          type: msgType,
          text: replyText,
          createdAt: new Date(),
          payload: {
            responseType,
            options: rawOptions,
            data: data.data,
            state: data.state
          }
        };

        // Handled TTS speaking
        if (speakerEnabledRef.current) {
          try {
            if (activeAudioSessionRef.current) {
               if (Platform.OS === 'web') {
                  activeAudioSessionRef.current.pause();
               } else {
                  activeAudioSessionRef.current.unloadAsync();
               }
               activeAudioSessionRef.current = null;
            }

            const url = `${baseUrl}/api/voice/synthesize?text=${encodeURIComponent(replyText)}`;
            if (Platform.OS === 'web') {
               const audio = new Audio(url);
               activeAudioSessionRef.current = audio;
               audio.play().catch(e => console.error("TTS Web Play Error:", e));
            } else {
               const { Audio: ExpoAudio } = require('expo-av');
               ExpoAudio.Sound.createAsync({ uri: url }, { shouldPlay: true })
                 .then(({ sound }) => {
                    activeAudioSessionRef.current = sound;
                    sound.setOnPlaybackStatusUpdate(status => {
                       if (status.didJustFinish) sound.unloadAsync();
                    });
                 }).catch(e => console.error("TTS Native Play Error:", e));
            }
            setVoiceState(JanaVoiceState.speaking);
          } catch(err) {
            console.error('TTS error', err);
          }
        } else {
          setVoiceState(JanaVoiceState.idle);
        }

        const stateData = data.data;
        let newCaseId = activeCaseIdRef.current;
        if (stateData && stateData.caseId && activeCaseIdRef.current !== stateData.caseId) {
          newCaseId = stateData.caseId;
          setActiveCaseId(newCaseId);
          startContextStream(newCaseId);
        } else if (!activeCaseIdRef.current && sessionIdRef.current) {
          if (currentStreamIdentifierRef.current !== sessionIdRef.current) {
            startContextStream(sessionIdRef.current);
          }
        }

        setMessages(prev => [...prev, receivedMsg]);
        setVoiceState(JanaVoiceState.idle); // In flutter it goes speaking
        setPendingOptions(rawOptions);
        setPendingType(responseType);

        if (data.autoAdvance) {
          const now = new Date();
          if (lastAutoAdvanceRef.current && (now - lastAutoAdvanceRef.current) < 2000) {
            console.log('Prevented rapid auto-advance loop');
            return;
          }
          lastAutoAdvanceRef.current = now;
          setTimeout(() => {
            sendMessage('__auto_advance__');
          }, 1500);
        }
      } else {
        addError(`Server error (${response.status}). Please try again.`);
      }

    } catch (e) {
      const errorMsg = e.response 
        ? `Server error: ${e.response.status} ${e.response.data?.message || e.message}` 
        : `Network error: ${e.message} (Target: ${baseUrl}/api/jana/message)`;
      addError(errorMsg);
    }
  }, [currentLanguage, memberId]);

  const addError = useCallback((errorText) => {
    const errorMsg = {
      id: new Date().getTime().toString(),
      sender: 'jana',
      type: JanaMessageType.text,
      text: errorText,
      createdAt: new Date(),
      payload: {}
    };
    setMessages(prev => [...prev, errorMsg]);
    setVoiceState(JanaVoiceState.idle);
  }, []);

  const selectOption = useCallback((option) => {
    sendMessage(option.value, { displayLabel: option.label });
  }, [sendMessage]);

  const selectDate = useCallback((date) => {
    const d = new Date(date);
    const formatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    sendMessage(formatted);
  }, [sendMessage]);


  // SSE Implementation
  const startContextStream = useCallback((identifier) => {
    if (currentStreamIdentifierRef.current === identifier) return;
    currentStreamIdentifierRef.current = identifier;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    processedEventIdsRef.current.clear();
    eventQueueRef.current = [];
    isProcessingQueueRef.current = false;
    setContextEvents([]);
    isFirstSyncRef.current = true;

    const source = new EventSource(`${baseUrl}/api/events/stream/${identifier}`);
    eventSourceRef.current = source;

    source.addEventListener("message", (event) => {
      if (event.data) {
        try {
          const eventsData = JSON.parse(event.data);
          
          if (isFirstSyncRef.current) {
            const initialEvents = [];
            eventsData.forEach(ev => {
              const eventId = ev.event_id || String(Math.random());
              processedEventIdsRef.current.add(eventId);
              initialEvents.push(ev);
            });
            isFirstSyncRef.current = false;
            setContextEvents(initialEvents);
          } else {
            let addedAny = false;
            eventsData.forEach(ev => {
              const eventId = ev.event_id || String(Math.random());
              if (!processedEventIdsRef.current.has(eventId)) {
                eventQueueRef.current.push(ev);
                processedEventIdsRef.current.add(eventId);
                addedAny = true;
              }
            });

            if (addedAny && !isProcessingQueueRef.current) {
              processEventQueue();
            }
          }
        } catch (e) {
            console.log('SSE Parse error', e);
        }
      }
    });
  }, [baseUrl]);

  const processEventQueue = useCallback(async () => {
    if (eventQueueRef.current.length === 0) {
      isProcessingQueueRef.current = false;
      return;
    }

    isProcessingQueueRef.current = true;

    const nextEvent = eventQueueRef.current.shift();
    const eventType = nextEvent.event_type;
    
    setContextEvents(prev => [...prev, nextEvent]);

    let newMsg = null;

    if (eventType === 'JANMITRA_MESSAGE') {
      const payload = nextEvent.payload || {};
      newMsg = {
        id: nextEvent.event_id || new Date().getTime().toString(),
        sender: 'janmitra',
        type: JanaMessageType.janmitra,
        text: payload.message || '',
        createdAt: nextEvent.created_at ? new Date(nextEvent.created_at) : new Date(),
        payload
      };
    }

    if (eventType === 'AI_RESPONSE') {
      const payload = nextEvent.payload || {};
      const responseType = payload.type || 'text';
      const rawOptions = payload.options || [];

      const stateData = payload.data;
      if (stateData && stateData.caseId) {
        const newCaseId = stateData.caseId;
        setActiveCaseId(newCaseId);
        startContextStream(newCaseId);
      }

      let msgType;
      switch (responseType) {
        case 'doctors': msgType = JanaMessageType.providerCard; break;
        case 'slots': msgType = JanaMessageType.slotCard; break;
        default: msgType = JanaMessageType.text;
      }
      
      newMsg = {
        id: nextEvent.event_id || new Date().getTime().toString(),
        sender: 'jana',
        type: msgType,
        text: payload.message || '',
        createdAt: nextEvent.created_at ? new Date(nextEvent.created_at) : new Date(),
        payload
      };

      setPendingOptions(rawOptions);
      setPendingType(responseType);
    }

    const milestoneTypes = ['CASE_CREATED', 'STEP_COMPLETED', 'TRIAGE_COMPLETED', 'APPOINTMENT_BOOKED', 'TEST_ORDERED'];
    if (eventType && milestoneTypes.includes(eventType)) {
      const payload = nextEvent.payload || {};
      let milestoneTitle = eventType.replace(/_/g, ' ');
      if (eventType === 'CASE_CREATED') milestoneTitle = '🏥 Case Created';
      if (eventType === 'TRIAGE_COMPLETED') milestoneTitle = '📋 Triage Completed';
      if (eventType === 'APPOINTMENT_BOOKED') milestoneTitle = '📅 Appointment Booked';

      newMsg = {
        id: nextEvent.event_id || new Date().getTime().toString(),
        sender: 'system',
        type: JanaMessageType.milestone,
        text: milestoneTitle,
        createdAt: nextEvent.created_at ? new Date(nextEvent.created_at) : new Date(),
        payload: { title: milestoneTitle, ...payload }
      };
    }

    if (eventType === 'HANDOFF') {
      const title = nextEvent.payload?.title || '';
      const isToAi = title.includes('AI');
      setControlledBy(isToAi ? 'AI' : 'HUMAN');
    }

    if (newMsg) {
      setMessages(prev => [...prev, newMsg]);
    }

    setTimeout(() => {
      processEventQueue();
    }, 1250);

  }, [startContextStream]);

  // Handoff logic
  const requestHandoff = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      const response = await axios.post(`${baseUrl}/api/context/handoff/to-human/${sessionIdRef.current}`, {
        reason: 'User requested human assistance'
      }, { headers: { 'Content-Type': 'application/json' }});
      if (response.status === 200) {
        setControlledBy('HUMAN');
        setJanmitraData(response.data.janmitra);
      }
    } catch (e) {
      addError('Could not connect to Janmitra. Please try again.');
    }
  }, [baseUrl, addError]);

  const returnToAi = useCallback(async () => {
    if (!sessionIdRef.current) return;
    try {
      await axios.post(`${baseUrl}/api/context/handoff/to-ai/${sessionIdRef.current}`, {}, { headers: { 'Content-Type': 'application/json' }});
      setControlledBy('AI');
      setJanmitraData(null);
    } catch (e) {
      addError('Could not return control to AI. Please try again.');
    }
  }, [baseUrl, addError]);

  // Placeholder for File Upload logic
  const uploadFile = useCallback(async (fileObj) => {
    // Implement based on DocumentPicker result
    if (!fileObj) return;
    setVoiceState(JanaVoiceState.processing);

    try {
      const caseId = activeCaseIdRef.current || `PENDING_${sessionIdRef.current}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'web' ? fileObj.uri : fileObj.uri.replace('file://', ''),
        name: fileObj.name,
        type: fileObj.mimeType || 'application/octet-stream',
      });

      const response = await axios.post(`${baseUrl}/api/media/upload/${caseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.status === 201 || response.status === 200) {
        const msg = {
          id: new Date().getTime().toString(),
          sender: 'user',
          type: JanaMessageType.documentCard,
          text: `Uploaded: ${fileObj.name}`,
          createdAt: new Date(),
          payload: {
            title: fileObj.name,
            date: 'Just now',
            status: 'Uploaded',
            fileUrl: response.data.fileUrl,
          }
        };
        setMessages(prev => [...prev, msg]);
        sendMessage(`I have uploaded a document: ${fileObj.name}`, { hidden: true });
      } else {
        addError(`Upload failed (${response.status}).`);
      }
    } catch (e) {
        addError('Network error during upload.');
    } finally {
        setVoiceState(JanaVoiceState.idle);
    }
  }, [baseUrl, sendMessage, addError]);

  const recordingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startVoice = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
         if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            addError('Microphone not supported on this browser.');
            return;
         }
         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         const mediaRecorder = new MediaRecorder(stream);
         audioChunksRef.current = [];
         
         mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
         };
         mediaRecorder.start();
         mediaRecorderRef.current = mediaRecorder;
         setVoiceState(JanaVoiceState.listening);
      } else {
        const { Audio } = require('expo-av');
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.LOW_QUALITY
          );
          recordingRef.current = recording;
          setVoiceState(JanaVoiceState.listening);
        } else {
          addError('Microphone permission not granted.');
        }
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      addError('Failed to start recording: ' + err.message);
    }
  }, [addError]);

  const stopVoice = useCallback(async () => {
    setVoiceState(JanaVoiceState.processing);
    try {
      if (Platform.OS === 'web') {
         const mediaRecorder = mediaRecorderRef.current;
         if (!mediaRecorder) {
            setVoiceState(JanaVoiceState.idle);
            return;
         }
         mediaRecorder.onstop = async () => {
             const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
             mediaRecorder.stream.getTracks().forEach(t => t.stop());
             mediaRecorderRef.current = null;
             
             const formData = new FormData();
             formData.append('audio', audioBlob, 'recording.webm');
             
             try {
                const response = await axios.post(`${baseUrl}/api/voice/transcribe`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                if ((response.status === 200 || response.status === 201) && response.data.success && response.data.text) {
                  setVoiceState(JanaVoiceState.idle);
                  sendMessage(response.data.text);
                } else {
                  setVoiceState(JanaVoiceState.idle);
                }
             } catch(e) {
                setVoiceState(JanaVoiceState.idle);
             }
         };
         mediaRecorder.stop();
      } else {
        const { Audio } = require('expo-av');
        const recording = recordingRef.current;
        if (!recording) {
          setVoiceState(JanaVoiceState.idle);
          return;
        }
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        const uri = recording.getURI();
        recordingRef.current = null;

        if (!uri) {
          setVoiceState(JanaVoiceState.idle);
          return;
        }

        const fileExt = uri.split('.').pop() || 'm4a';
        const formData = new FormData();
        formData.append('audio', {
          uri: Platform.OS === 'web' ? uri : uri.replace('file://', ''),
          name: `recording.${fileExt}`,
          type: `audio/${fileExt}`
        });

        const response = await axios.post(`${baseUrl}/api/voice/transcribe`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if ((response.status === 200 || response.status === 201) && response.data.success && response.data.text) {
          setVoiceState(JanaVoiceState.idle);
          sendMessage(response.data.text);
        } else {
          setVoiceState(JanaVoiceState.idle);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      setVoiceState(JanaVoiceState.idle);
    }
  }, [baseUrl, sendMessage]);

  const toggleSpeaker = useCallback(() => setSpeakerEnabled(prev => !prev), []);
  const switchLanguage = useCallback((lang) => setCurrentLanguage(lang), []);

  return {
    state: {
      sessionId,
      mode,
      currentLanguage,
      activeCaseId,
      controlledBy,
      janmitraData,
      speakerEnabled,
      messages,
      voiceState,
      pendingOptions,
      pendingType,
      contextEvents,
      t: (key) => translations[currentLanguage]?.[key] || translations['en']?.[key] || key,
    },
    sendMessage,
    uploadFile,
    selectOption,
    selectDate,
    startVoice,
    stopVoice,
    requestHandoff,
    returnToAi,
    toggleSpeaker,
    switchLanguage,
  };
};

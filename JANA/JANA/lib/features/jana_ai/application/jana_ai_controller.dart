import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:html' as html;
import 'dart:js_util' as js_util;
import 'package:uuid/uuid.dart';
import 'jana_ai_view_state.dart';
import '../domain/models/jana_message.dart';
import '../domain/models/jana_voice_state.dart';

// ─── OPTION MODEL ───────────────────────────────────────────────────────────

class JanaOption {
  final String label;
  final String value;
  const JanaOption({required this.label, required this.value});

  factory JanaOption.fromJson(Map<String, dynamic> json) =>
      JanaOption(label: json['label'] as String, value: json['value'] as String);
}

// ─── CONTROLLER ─────────────────────────────────────────────────────────────

class JanaAiController extends ChangeNotifier {
  JanaAiViewState _state;
  html.AudioElement? _audioPlayer;
  html.EventSource? _eventSource;
  DateTime? _lastAutoAdvance;
  final Set<String> _processedEventIds = {};
  final List<Map<String, dynamic>> _eventQueue = [];
  bool _isProcessingQueue = false;
  bool _isFirstSync = true;

  JanaAiController(JanaAiViewState state) : _state = state {
    if (_state.sessionId == null) {
      _state = _state.copyWith(sessionId: const Uuid().v4());
    }
    _audioPlayer = html.AudioElement();
    html.document.body!.append(_audioPlayer!);

    // Send the member id automatically on start to pre-verify
    if (_state.memberId != null) {
      Future.microtask(() => sendMessage(_state.memberId!));
    } else {
      // Trigger the initial greeting message from the backend
      Future.microtask(() => sendMessage('__INIT__', hidden: true));
    }
  }

  JanaAiViewState get state => _state;

  // ─── SEND MESSAGE ────────────────────────────────────────────────────────

  Future<void> sendMessage(String text, {String? displayLabel, bool hidden = false}) async {
    if (text.trim().isEmpty) return;

    // Unlock audio context silently on user interaction
    if (_state.speakerEnabled && _audioPlayer != null) {
      try {
        _audioPlayer!.src =
            'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
        _audioPlayer!.play().then((_) => _audioPlayer!.pause()).catchError((e) {});
      } catch (e) {}
    }

    final isUuid = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$').hasMatch(text);

    // Don't show auto-sent member ID or auto-advance signals as a bubble
    final isAutoSent = (text == _state.memberId && _state.messages.isEmpty) || 
                       text == '__auto_advance__' || 
                       hidden || isUuid;

    if (!isAutoSent) {
      final msg = JanaMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'user',
        type: JanaMessageType.text,
        text: displayLabel ?? text,
        createdAt: DateTime.now(),
      );
      _state = _state.copyWith(
        messages: [..._state.messages, msg],
        voiceState: JanaVoiceState.processing,
        pendingOptions: [],
        pendingType: null,
      );
    } else {
      _state = _state.copyWith(
        voiceState: JanaVoiceState.processing,
        pendingOptions: [],
        pendingType: null,
      );
    }
    notifyListeners();

    try {
      final response = await http.post(
        Uri.parse('/api/jana/message'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': text,
          'sessionId': _state.sessionId,
          'language': _state.currentLanguage,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final replyText = data['message'] as String? ?? 'No response';
        final responseType = data['type'] as String? ?? 'text';
        final rawOptions = data['options'] as List<dynamic>? ?? [];
        final options = rawOptions
            .whereType<Map<String, dynamic>>()
            .map((o) => JanaOption.fromJson(o))
            .toList();

        // Determine message type enum for rendering
        JanaMessageType msgType;
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

        final receivedMsg = JanaMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          sender: 'jana',
          type: msgType,
          text: replyText,
          createdAt: DateTime.now(),
          payload: {
            'responseType': responseType,
            'options': rawOptions,
            'data': data['data'],
            'state': data['state'],
          },
        );

        // Speak the reply
        if (_state.speakerEnabled && _audioPlayer != null) {
          final escapedText = Uri.encodeComponent(replyText);
          _audioPlayer!.src =
              '/api/voice/synthesize?text=${escapedText}';
          _audioPlayer!.autoplay = true;
          _audioPlayer!.play().catchError((e) {
            print('TTS error: $e');
          });
        }

        final stateData = data['data'] as Map<String, dynamic>?;
        String? newCaseId = _state.activeCaseId;
        if (stateData != null && stateData['caseId'] != null && _state.activeCaseId != stateData['caseId']) {
          newCaseId = stateData['caseId'] as String;
          _startContextStream(newCaseId);
        }

        _state = _state.copyWith(
          messages: [..._state.messages, receivedMsg],
          voiceState: JanaVoiceState.speaking,
          pendingOptions: options,
          pendingType: responseType,
          activeCaseId: newCaseId,
        );
        notifyListeners();

        // Handle autoAdvance
        final autoAdvance = data['autoAdvance'] as bool? ?? false;
        if (autoAdvance) {
          final now = DateTime.now();
          if (_lastAutoAdvance != null && now.difference(_lastAutoAdvance!) < const Duration(seconds: 2)) {
            print('Prevented rapid auto-advance loop');
            return;
          }
          _lastAutoAdvance = now;
          await Future.delayed(const Duration(milliseconds: 1500));
          sendMessage('__auto_advance__');
        }
      } else {
        _addError('Server error (${response.statusCode}). Please try again.');
      }
    } catch (e) {
      _addError('Network error: $e');
    }
  }

  // ─── OPTION SELECTED ─────────────────────────────────────────────────────

  void selectOption(JanaOption option) {
    sendMessage(option.value, displayLabel: option.label);
  }

  // ─── DATE SELECTED ───────────────────────────────────────────────────────

  void selectDate(DateTime date) {
    final formatted =
        '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
    sendMessage(formatted);
  }

  // ─── VOICE INPUT ─────────────────────────────────────────────────────────

  html.MediaStream? _mediaStream;
  html.MediaRecorder? _mediaRecorder;
  List<html.Blob> _audioChunks = [];

  Future<void> startVoice() async {
    try {
      _state = _state.copyWith(voiceState: JanaVoiceState.listening);
      notifyListeners();

      final mediaDevices = html.window.navigator.mediaDevices;
      if (mediaDevices == null) throw Exception('MediaDevices not supported');

      _mediaStream = await mediaDevices.getUserMedia({'audio': true});
      _mediaRecorder = html.MediaRecorder(_mediaStream!);
      _audioChunks = [];

      _mediaRecorder!.addEventListener('dataavailable', (html.Event event) {
        final blob = js_util.getProperty(event, 'data') as html.Blob?;
        if (blob != null && blob.size > 0) _audioChunks.add(blob);
      });

      _mediaRecorder!.start(200);
    } catch (e) {
      print('Mic error: $e');
      _state = _state.copyWith(voiceState: JanaVoiceState.idle);
      notifyListeners();
    }
  }

  Future<void> stopVoice() async {
    _state = _state.copyWith(voiceState: JanaVoiceState.processing);
    notifyListeners();

    if (_mediaRecorder == null) {
      _state = _state.copyWith(voiceState: JanaVoiceState.idle);
      notifyListeners();
      return;
    }

    _mediaRecorder?.addEventListener('stop', (html.Event event) async {
      await Future.delayed(const Duration(milliseconds: 200));
      final audioBlob = html.Blob(_audioChunks, 'audio/webm');

      if (_mediaStream != null) {
        for (var track in _mediaStream!.getTracks()) track.stop();
      }

      if (_audioChunks.isEmpty) {
        _state = _state.copyWith(voiceState: JanaVoiceState.idle);
        notifyListeners();
        return;
      }

      final reader = html.FileReader();
      reader.readAsArrayBuffer(audioBlob);
      await reader.onLoadEnd.first;
      final bytes = reader.result as List<int>;

      final uri = Uri.parse('/api/voice/transcribe');
      final request = http.MultipartRequest('POST', uri);
      request.files.add(http.MultipartFile.fromBytes('audio', bytes, filename: 'recording.webm'));

      try {
        final response = await request.send();
        if (response.statusCode == 200 || response.statusCode == 201) {
          final respStr = await response.stream.bytesToString();
          final data = jsonDecode(respStr);
          if (data['success'] == true && data['text'] != null) {
            _state = _state.copyWith(voiceState: JanaVoiceState.idle);
            notifyListeners();
            sendMessage(data['text'] as String);
          } else {
            _state = _state.copyWith(voiceState: JanaVoiceState.idle);
            notifyListeners();
          }
        } else {
          _state = _state.copyWith(voiceState: JanaVoiceState.idle);
          notifyListeners();
        }
      } catch (e) {
        _state = _state.copyWith(voiceState: JanaVoiceState.idle);
        notifyListeners();
      }
    });

    _mediaRecorder?.stop();
  }

  // ─── MISC ─────────────────────────────────────────────────────────────────

  void receiveTranscript(String text) {}

  void receiveResponse(JanaMessage message) {
    _state = _state.copyWith(
      messages: [..._state.messages, message],
      voiceState: JanaVoiceState.speaking,
    );
    notifyListeners();
  }

  void switchLanguage(String locale) {
    _state = _state.copyWith(currentLanguage: locale);
    notifyListeners();
  }

  void resumeCase(String caseId) {
    _state = _state.copyWith(activeCaseId: caseId);
    notifyListeners();
    _startContextStream(caseId);
  }

  void _startContextStream(String caseId) {
    _eventSource?.close();
    _processedEventIds.clear();
    _eventQueue.clear();
    _isProcessingQueue = false;
    _state = _state.copyWith(contextEvents: []);
    _isFirstSync = true;
    _eventSource = html.EventSource('/api/events/stream/$caseId');
    _eventSource!.onMessage.listen((html.MessageEvent event) {
      if (event.data != null) {
        try {
          final List<dynamic> eventsData = jsonDecode(event.data as String);
          final List<Map<String, dynamic>> incomingEvents = eventsData.map((e) => e as Map<String, dynamic>).toList();
          
          if (_isFirstSync) {
            // Silence history: Mark all existing events as processed but DO NOT add to UI
            for (var event in incomingEvents) {
              final String eventId = event['event_id'] ?? event.hashCode.toString();
              _processedEventIds.add(eventId);
            }
            _isFirstSync = false;
            // Keep _state.contextEvents empty to only show LIVE events
            notifyListeners();
          } else {
            // Handle as live trigger (Drip-Feed)
            bool addedAny = false;
            for (var event in incomingEvents) {
              final String eventId = event['event_id'] ?? event.hashCode.toString();
              if (!_processedEventIds.contains(eventId)) {
                _eventQueue.add(event);
                _processedEventIds.add(eventId);
                addedAny = true;
              }
            }

            if (addedAny && !_isProcessingQueue) {
              _processEventQueue();
            }
          }
        } catch (e) {
          print('SSE parse error: $e');
        }
      }
    });
  }

  Future<void> _processEventQueue() async {
    if (_eventQueue.isEmpty) {
      _isProcessingQueue = false;
      return;
    }

    _isProcessingQueue = true;
    
    // Take the next event and add it to the state
    final nextEvent = _eventQueue.removeAt(0);
    _state = _state.copyWith(
      contextEvents: [..._state.contextEvents, nextEvent]
    );
    notifyListeners();

    // Wait before showing the next one for a "notification" feel
    await Future.delayed(const Duration(milliseconds: 1250));
    _processEventQueue();
  }

  void toggleSpeaker() {
    _state = _state.copyWith(speakerEnabled: !_state.speakerEnabled);
    notifyListeners();
  }

  void _addError(String text) {
    final errorMsg = JanaMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: 'jana',
      type: JanaMessageType.text,
      text: text,
      createdAt: DateTime.now(),
    );
    _state = _state.copyWith(
      messages: [..._state.messages, errorMsg],
      voiceState: JanaVoiceState.idle,
    );
    notifyListeners();
  }
}

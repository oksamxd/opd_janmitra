import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:html' as html;
import 'package:uuid/uuid.dart';
import 'package:file_picker/file_picker.dart';
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
  String? _currentStreamIdentifier;

  // Smart endpoint detection
  String get baseUrl {
    final hostname = html.window.location.hostname;
    final origin = html.window.location.origin;

    // Local dev fallback: If running on localhost, point to NestJS port 3005
    if (hostname == 'localhost' || hostname == '127.0.0.1') {
      return 'http://localhost:3005';
    }
    
    // In production, the backend is usually hosted on the same origin or determined by environment
    return origin;
  }

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
        Uri.parse('$baseUrl/api/jana/message'),
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
              '$baseUrl/api/voice/synthesize?text=${escapedText}';
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
        } else if (_state.activeCaseId == null && _state.sessionId != null) {
          // If no case yet, ensure we are at least streaming from sessionId
          if (_currentStreamIdentifier != _state.sessionId) {
            _startContextStream(_state.sessionId!);
          }
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

  Future<void> uploadFile(PlatformFile file) async {
    if (file.bytes == null) return;
    
    _state = _state.copyWith(voiceState: JanaVoiceState.processing);
    notifyListeners();

    try {
      final caseId = _state.activeCaseId ?? 'PENDING_${_state.sessionId}';
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/media/upload/$caseId'),
      );
      
      request.files.add(http.MultipartFile.fromBytes(
        'file',
        file.bytes!,
        filename: file.name,
      ));

      final response = await request.send();
      if (response.statusCode == 201 || response.statusCode == 200) {
        final resBody = await response.stream.bytesToString();
        final data = jsonDecode(resBody);
        
        // Add a message bubble for the uploaded file
        final msg = JanaMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          sender: 'user',
          type: JanaMessageType.documentCard,
          text: 'Uploaded: ${file.name}',
          createdAt: DateTime.now(),
          payload: {
            'title': file.name,
            'date': 'Just now',
            'status': 'Uploaded',
            'fileUrl': data['fileUrl'],
          },
        );
        
        _state = _state.copyWith(
          messages: [..._state.messages, msg],
          voiceState: JanaVoiceState.idle,
        );
        notifyListeners();
        
        // Notify AI about the upload
        await sendMessage('I have uploaded a document: ${file.name}', hidden: true);
      } else {
        _addError('Upload failed (${response.statusCode}). Please try again.');
      }
    } catch (e) {
      _addError('Network error during upload: $e');
    } finally {
      _state = _state.copyWith(voiceState: JanaVoiceState.idle);
      notifyListeners();
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
      // Security Check: getUserMedia requires HTTPS or localhost
      if (html.window.isSecureContext == false && html.window.location.hostname != 'localhost') {
        _addError('Voice input requires a secure connection (HTTPS). Please contact your administrator.');
        return;
      }

      _state = _state.copyWith(voiceState: JanaVoiceState.listening);
      notifyListeners();

      final mediaDevices = html.window.navigator.mediaDevices;
      if (mediaDevices == null) throw Exception('MediaDevices not supported');

      _mediaStream = await mediaDevices.getUserMedia({'audio': true});
      _mediaRecorder = html.MediaRecorder(_mediaStream!);
      _audioChunks = [];

      _mediaRecorder!.addEventListener('dataavailable', (html.Event event) {
        // Access the blob via JS dynamic property access (dart:html compatible)
        final dynamic jsEvent = event;
        final blob = (jsEvent as dynamic).data;
        if (blob != null) {
          try {
            final htmlBlob = blob as html.Blob;
            if (htmlBlob.size > 0) _audioChunks.add(htmlBlob);
          } catch (_) {}
        }
      });

      _mediaRecorder!.start(200);
    } catch (e) {
      print('Mic error: $e');
      _addError('Could not access microphone. Ensure permissions are granted and you are on a secure (HTTPS) connection.');
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

      final uri = Uri.parse('$baseUrl/api/voice/transcribe');
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

  // ─── JANMITRA HANDOFF ─────────────────────────────────────────────────────

  bool get isHumanControlled => _state.controlledBy == 'HUMAN';

  /// Hand control to a Janmitra associate. Calls backend, updates state.
  Future<void> requestHandoff() async {
    final sessionId = _state.sessionId;
    if (sessionId == null) return;
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/context/handoff/to-human/$sessionId'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'reason': 'User requested human assistance'}),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _state = _state.copyWith(
          controlledBy: 'HUMAN',
          janmitraData: data['janmitra'] as Map<String, dynamic>?,
        );
        notifyListeners();
      }
    } catch (e) {
      _addError('Could not connect to Janmitra. Please try again.');
    }
  }

  /// Return control back to Jana AI. Calls backend, updates state.
  Future<void> returnToAi() async {
    final sessionId = _state.sessionId;
    if (sessionId == null) return;
    try {
      await http.post(
        Uri.parse('$baseUrl/api/context/handoff/to-ai/$sessionId'),
        headers: {'Content-Type': 'application/json'},
      );
      _state = _state.copyWith(
        controlledBy: 'AI',
        janmitraData: null,
      );
      notifyListeners();
    } catch (e) {
      _addError('Could not return control to AI. Please try again.');
    }
  }

  void resumeCase(String caseId) {
    _state = _state.copyWith(activeCaseId: caseId);
    notifyListeners();
    _startContextStream(caseId);
  }

  void _startContextStream(String identifier) {
    if (_currentStreamIdentifier == identifier) return;
    _currentStreamIdentifier = identifier;

    _eventSource?.close();
    _processedEventIds.clear();
    _eventQueue.clear();
    _isProcessingQueue = false;
    _state = _state.copyWith(contextEvents: []);
    _isFirstSync = true;
    _eventSource = html.EventSource('$baseUrl/api/events/stream/$identifier');
    _eventSource!.onMessage.listen((html.MessageEvent event) {
      if (event.data != null) {
        try {
          final List<dynamic> eventsData = jsonDecode(event.data as String);
          final List<Map<String, dynamic>> incomingEvents = eventsData.map((e) => e as Map<String, dynamic>).toList();
          
          if (_isFirstSync) {
            // Populate history on first sync
            final List<Map<String, dynamic>> initialEvents = [];
            for (var event in incomingEvents) {
              final String eventId = event['event_id'] ?? event.hashCode.toString();
              _processedEventIds.add(eventId);
              initialEvents.add(event);
            }
            _isFirstSync = false;
            _state = _state.copyWith(contextEvents: initialEvents);
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
    final eventType = nextEvent['event_type'] as String?;

    List<JanaMessage> updatedMessages = List.from(_state.messages);

    if (eventType == 'JANMITRA_MESSAGE') {
      final payload = nextEvent['payload'] as Map<String, dynamic>? ?? {};
      final msg = JanaMessage(
        id: nextEvent['event_id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'janmitra',
        type: JanaMessageType.janmitra,
        text: payload['message'] ?? '',
        createdAt: DateTime.tryParse(nextEvent['created_at'] ?? '') ?? DateTime.now(),
        payload: payload,
      );
      updatedMessages.add(msg);
    }

    if (eventType == 'AI_RESPONSE') {
      final payload = nextEvent['payload'] as Map<String, dynamic>? ?? {};
      final responseType = payload['type'] as String? ?? 'text';
      final rawOptions = payload['options'] as List<dynamic>? ?? [];
      final options = rawOptions
          .whereType<Map<String, dynamic>>()
          .map((o) => JanaOption.fromJson(o))
          .toList();

      // Update caseId if present in response
      final stateData = payload['data'] as Map<String, dynamic>?;
      if (stateData != null && stateData['caseId'] != null) {
        final newCaseId = stateData['caseId'] as String;
        _state = _state.copyWith(activeCaseId: newCaseId);
        // If caseId changed, restart stream with new caseId
        Future.microtask(() => _startContextStream(newCaseId));
      }

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

      final msg = JanaMessage(
        id: nextEvent['event_id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'jana',
        type: msgType,
        text: payload['message'] ?? '',
        createdAt: DateTime.tryParse(nextEvent['created_at'] ?? '') ?? DateTime.now(),
        payload: payload,
      );
      updatedMessages.add(msg);

      // Update UI state with new options and type
      _state = _state.copyWith(
        pendingOptions: options,
        pendingType: responseType,
      );
    }

    // Handle Clinical Milestones
    final milestoneTypes = ['CASE_CREATED', 'STEP_COMPLETED', 'TRIAGE_COMPLETED', 'APPOINTMENT_BOOKED', 'TEST_ORDERED'];
    if (eventType != null && milestoneTypes.contains(eventType)) {
      final payload = nextEvent['payload'] as Map<String, dynamic>? ?? {};
      String milestoneTitle = eventType.replaceAll('_', ' ');
      if (eventType == 'CASE_CREATED') milestoneTitle = '🏥 Case Created';
      if (eventType == 'TRIAGE_COMPLETED') milestoneTitle = '📋 Triage Completed';
      if (eventType == 'APPOINTMENT_BOOKED') milestoneTitle = '📅 Appointment Booked';

      final msg = JanaMessage(
        id: nextEvent['event_id'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
        sender: 'system',
        type: JanaMessageType.milestone,
        text: milestoneTitle,
        createdAt: DateTime.tryParse(nextEvent['created_at'] ?? '') ?? DateTime.now(),
        payload: {
          'title': milestoneTitle,
          ...payload,
        },
      );
      updatedMessages.add(msg);
    }

    if (eventType == 'HANDOFF') {
      final title = nextEvent['payload']?['title'] as String? ?? '';
      final isToAi = title.contains('AI');
      _state = _state.copyWith(
        controlledBy: isToAi ? 'AI' : 'HUMAN',
      );
    }

    _state = _state.copyWith(
      contextEvents: [..._state.contextEvents, nextEvent],
      messages: updatedMessages,
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

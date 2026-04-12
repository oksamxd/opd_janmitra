import 'package:flutter/foundation.dart';
import '../domain/models/jana_app_mode.dart';
import '../domain/models/jana_message.dart';
import '../domain/models/jana_voice_state.dart';
import 'jana_ai_controller.dart'; // JanaOption

class JanaAiViewState {
  final JanaAppMode mode;
  final List<JanaMessage> messages;
  final JanaVoiceState voiceState;
  final bool speakerEnabled;
  final String currentLanguage;
  final String? activeCaseId;
  final String? memberId;
  final String? sessionId;
  final bool loading;
  final String? error;
  final List<Map<String, dynamic>> contextEvents;

  // Conversational UI
  final List<JanaOption> pendingOptions;
  final String? pendingType; // 'text' | 'options' | 'input' | 'date' | 'slots' | 'doctors'

  const JanaAiViewState({
    required this.mode,
    this.messages = const [],
    this.voiceState = JanaVoiceState.idle,
    this.speakerEnabled = true,
    this.currentLanguage = 'en',
    this.activeCaseId,
    this.memberId,
    this.sessionId,
    this.loading = false,
    this.error,
    this.contextEvents = const [],
    this.pendingOptions = const [],
    this.pendingType,
  });

  JanaAiViewState copyWith({
    JanaAppMode? mode,
    List<JanaMessage>? messages,
    JanaVoiceState? voiceState,
    bool? speakerEnabled,
    String? currentLanguage,
    String? activeCaseId,
    String? memberId,
    String? sessionId,
    bool? loading,
    String? error,
    List<Map<String, dynamic>>? contextEvents,
    List<JanaOption>? pendingOptions,
    String? pendingType,
  }) {
    return JanaAiViewState(
      mode: mode ?? this.mode,
      messages: messages ?? this.messages,
      voiceState: voiceState ?? this.voiceState,
      speakerEnabled: speakerEnabled ?? this.speakerEnabled,
      currentLanguage: currentLanguage ?? this.currentLanguage,
      activeCaseId: activeCaseId ?? this.activeCaseId,
      memberId: memberId ?? this.memberId,
      sessionId: sessionId ?? this.sessionId,
      loading: loading ?? this.loading,
      error: error,
      contextEvents: contextEvents ?? this.contextEvents,
      pendingOptions: pendingOptions ?? this.pendingOptions,
      pendingType: pendingType ?? this.pendingType,
    );
  }
}

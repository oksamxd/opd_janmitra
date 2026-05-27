import 'package:flutter/material.dart';
import '../../application/jana_ai_controller.dart';
import '../../application/jana_ai_view_state.dart';
import '../../domain/models/jana_app_mode.dart';
import '../../domain/models/jana_voice_state.dart';
import '../theme/jana_colors.dart';
import '../widgets/jana_header.dart';
import '../widgets/jana_member_context_header.dart';
import '../widgets/jana_greeting_card.dart';
import '../widgets/jana_conversation_list.dart';
import '../widgets/jana_voice_dock.dart';
import '../widgets/jana_text_input_bar.dart';
import '../widgets/jana_right_panel.dart';
import '../widgets/jana_left_nav_rail.dart';
import '../widgets/jana_option_chips.dart';
import 'jana_appointment_dashboard.dart';

class JanaAiPage extends StatefulWidget {
  final JanaAppMode mode;
  final String? memberId;
  final String? activeCaseId;
  final Locale? locale;

  const JanaAiPage({
    Key? key,
    required this.mode,
    this.memberId,
    this.activeCaseId,
    this.locale,
  }) : super(key: key);

  @override
  State<JanaAiPage> createState() => _JanaAiPageState();
}

class _JanaAiPageState extends State<JanaAiPage> {
  late JanaAiController _controller;

  @override
  void initState() {
    super.initState();
    _controller = JanaAiController(
      JanaAiViewState(
        mode: widget.mode,
        memberId: widget.memberId,
        activeCaseId: widget.activeCaseId,
        currentLanguage: widget.locale?.languageCode ?? 'en',
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _openAppointmentDashboard(String memberId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => JanaAppointmentDashboard(memberId: memberId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _controller,
      builder: (context, _) {
        final state = _controller.state;
        return Scaffold(
          backgroundColor: JanaColors.background,
          body: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                if (width < 840) {
                  return _buildMobileLayout(state);
                } else if (width < 1200) {
                  return _buildTabletLayout(state);
                } else {
                  return _buildDesktopLayout(state);
                }
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildChatColumn(JanaAiViewState state) {
    return Column(
      children: [
        // ── App Header ─────────────────────────────────────
        JanaHeader(
          mode: state.mode,
          speakerEnabled: state.speakerEnabled,
          currentLanguage: state.currentLanguage,
          onToggleSpeaker: _controller.toggleSpeaker,
          onLanguageChanged: _controller.switchLanguage,
          sessionId: state.sessionId,
          isHumanControlled: state.controlledBy == 'HUMAN',
          onOpenDashboard: state.memberId != null
              ? () => _openAppointmentDashboard(state.memberId!)
              : null,
          // Toggling Janmitra = calling the controller's handoff method.
          // The right panel will auto-switch to Janmitra view via controlledBy state.
          onRequestHuman: state.sessionId != null
              ? (state.controlledBy == 'HUMAN'
                  ? _controller.returnToAi
                  : _controller.requestHandoff)
              : null,
        ),

        // ── ALWAYS VISIBLE: Member Context Header ──────────
        JanaMemberContextHeader(
          sessionId: state.sessionId,
          memberId: state.memberId,
        ),

        // ── Chat Area ──────────────────────────────────────
        Expanded(
          child: state.messages.isEmpty
              ? JanaGreetingCard(mode: state.mode)
              : JanaConversationList(
                  messages: state.messages,
                  onSendMessage: _controller.sendMessage,
                ),
        ),

        // ── Option chips above input ────────────────────────
        if (state.pendingOptions.isNotEmpty || state.pendingType == 'date')
          JanaOptionChips(
            options: state.pendingOptions,
            type: state.pendingType ?? 'options',
            onSelect: _controller.selectOption,
            onDateSelected: _controller.selectDate,
          ),
        JanaVoiceDock(
          state: state.voiceState,
          onMicTap: () {
            if (state.voiceState == JanaVoiceState.idle) {
              _controller.startVoice();
            } else {
              _controller.stopVoice();
            }
          },
        ),
        JanaTextInputBar(
          onSend: _controller.sendMessage,
          onAttach: _controller.uploadFile,
        ),
      ],
    );
  }

  Widget _buildMobileLayout(JanaAiViewState state) {
    // On mobile, show Janmitra banner inline above chat when human-controlled
    return Column(
      children: [
        if (state.controlledBy == 'HUMAN')
          _buildMobileJanmitraBanner(state),
        Expanded(child: _buildChatColumn(state)),
      ],
    );
  }

  Widget _buildMobileJanmitraBanner(JanaAiViewState state) {
    final name = state.janmitraData?['fullName'] as String? ?? 'Janmitra';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF1A1200),
        border: Border(
          bottom: BorderSide(color: Color(0xFFFF9800), width: 1.5),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFFFF9800), Color(0xFFE65100)],
              ),
            ),
            child: Center(
              child: Text(
                name.isNotEmpty ? name[0] : 'J',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: Color(0xFFFF9800),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const Text(
                  'Janmitra Associate • Managing session',
                  style: TextStyle(color: Colors.white38, fontSize: 10),
                ),
              ],
            ),
          ),
          TextButton.icon(
            onPressed: _controller.returnToAi,
            icon: const Icon(Icons.smart_toy_outlined, size: 14),
            label: const Text('AI', style: TextStyle(fontSize: 11)),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF37D2E0),
              padding: const EdgeInsets.symmetric(horizontal: 8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabletLayout(JanaAiViewState state) {
    return Row(
      children: [
        Expanded(flex: 2, child: _buildChatColumn(state)),
        // Right panel auto-switches to Janmitra UI when controlled_by == HUMAN
        Expanded(
          flex: 1,
          child: JanaRightPanel(
            state: state,
            onReturnToAi: _controller.returnToAi,
          ),
        ),
      ],
    );
  }

  Widget _buildDesktopLayout(JanaAiViewState state) {
    return Row(
      children: [
        if (state.mode == JanaAppMode.web) const JanaLeftNavRail(),
        Expanded(flex: 2, child: _buildChatColumn(state)),
        Expanded(
          flex: 1,
          child: JanaRightPanel(
            state: state,
            onReturnToAi: _controller.returnToAi,
          ),
        ),
      ],
    );
  }
}

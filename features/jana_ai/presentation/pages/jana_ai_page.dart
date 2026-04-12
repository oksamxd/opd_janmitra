import 'package:flutter/material.dart';
import '../../application/jana_ai_controller.dart';
import '../../application/jana_ai_view_state.dart';
import '../../domain/models/jana_app_mode.dart';
import '../../domain/models/jana_voice_state.dart';
import '../theme/jana_colors.dart';
import '../widgets/jana_header.dart';
import '../widgets/jana_member_context_strip.dart';
import '../widgets/jana_greeting_card.dart';
import '../widgets/jana_conversation_list.dart';
import '../widgets/jana_voice_dock.dart';
import '../widgets/jana_text_input_bar.dart';
import '../widgets/jana_right_panel.dart';
import '../widgets/jana_left_nav_rail.dart';
import '../widgets/jana_option_chips.dart';

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

  Widget _buildMobileLayout(JanaAiViewState state) {
    return Column(
      children: [
        JanaHeader(
          mode: state.mode,
          speakerEnabled: state.speakerEnabled,
          currentLanguage: state.currentLanguage,
          onToggleSpeaker: _controller.toggleSpeaker,
          onLanguageChanged: _controller.switchLanguage,
        ),
        if (state.mode == JanaAppMode.associate)
          JanaMemberContextStrip(memberId: state.memberId),
        Expanded(
          child: state.messages.isEmpty
              ? JanaGreetingCard(mode: state.mode)
              : JanaConversationList(
                  messages: state.messages,
                  onSendMessage: _controller.sendMessage,
                ),
        ),
        // Option chips rendered above input
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
        JanaTextInputBar(onSend: _controller.sendMessage),
      ],
    );
  }

  Widget _buildTabletLayout(JanaAiViewState state) {
    return Row(
      children: [
        Expanded(
          flex: 2,
          child: _buildMobileLayout(state),
        ),
        Expanded(
          flex: 1,
          child: JanaRightPanel(state: state),
        ),
      ],
    );
  }

  Widget _buildDesktopLayout(JanaAiViewState state) {
    return Row(
      children: [
        if (state.mode == JanaAppMode.web) const JanaLeftNavRail(),
        Expanded(
          flex: 2,
          child: _buildMobileLayout(state),
        ),
        Expanded(
          flex: 1,
          child: JanaRightPanel(state: state),
        ),
      ],
    );
  }
}

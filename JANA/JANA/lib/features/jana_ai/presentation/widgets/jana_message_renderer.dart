import 'package:flutter/material.dart';
import '../../domain/models/jana_app_mode.dart';
import '../../domain/models/jana_message.dart';
import 'bubbles/jana_text_message_bubble.dart';
import 'bubbles/user_message_bubble.dart';
import 'bubbles/jana_transcript_bubble.dart';
import 'cards/jana_provider_card.dart';
import 'cards/jana_slot_card.dart';
import 'cards/jana_case_progress_card.dart';
import 'cards/jana_confirmation_card.dart';
import 'cards/jana_document_card.dart';
import 'cards/jana_alert_card.dart';
import 'cards/jana_task_card.dart';
import 'jana_quick_actions.dart';

class JanaMessageRenderer extends StatelessWidget {
  final JanaMessage message;
  final Function(String)? onSendMessage;

  const JanaMessageRenderer({
    Key? key,
    required this.message,
    this.onSendMessage,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget content;
    switch (message.type) {
      case JanaMessageType.text:
        content = message.sender == 'user'
            ? UserMessageBubble(message: message)
            : JanaTextMessageBubble(message: message);
        break;
      case JanaMessageType.transcript:
        content = JanaTranscriptBubble(message: message);
        break;
      case JanaMessageType.quickReplies:
        content = const JanaQuickActions(mode: JanaAppMode.member); // Should ideally receive from payload
        break;
      case JanaMessageType.providerCard:
        content = JanaProviderCard(
          payload: message.payload,
          onSendMessage: onSendMessage,
        );
        break;
      case JanaMessageType.slotCard:
        content = JanaSlotCard(
          payload: message.payload,
          onSendMessage: onSendMessage,
        );
        break;
      case JanaMessageType.caseProgress:
        content = JanaCaseProgressCard(payload: message.payload);
        break;
      case JanaMessageType.confirmation:
        content = JanaConfirmationCard(payload: message.payload);
        break;
      case JanaMessageType.documentCard:
        content = JanaDocumentCard(payload: message.payload);
        break;
      case JanaMessageType.alertCard:
        content = JanaAlertCard(payload: message.payload);
        break;
      case JanaMessageType.taskCard:
        content = JanaTaskCard(payload: message.payload);
        break;
    }

    final isUser = message.sender == 'user';

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: content,
    );
  }
}

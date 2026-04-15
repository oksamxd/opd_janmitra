import 'package:flutter/material.dart';
import '../../domain/models/jana_message.dart';
import '../theme/jana_spacing.dart';
import 'jana_message_renderer.dart';

class JanaConversationList extends StatelessWidget {
  final List<JanaMessage> messages;
  final Function(String)? onSendMessage;

  const JanaConversationList({
    Key? key,
    required this.messages,
    this.onSendMessage,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(JanaSpacing.md),
      itemCount: messages.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: JanaSpacing.md),
          child: JanaMessageRenderer(
            message: messages[index],
            onSendMessage: onSendMessage,
          ),
        );
      },
    );
  }
}

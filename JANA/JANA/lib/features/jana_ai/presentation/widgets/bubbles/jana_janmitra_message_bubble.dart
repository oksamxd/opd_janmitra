import 'package:flutter/material.dart';
import '../../../domain/models/jana_message.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaJanmitraMessageBubble extends StatelessWidget {
  final JanaMessage message;

  const JanaJanmitraMessageBubble({Key? key, required this.message}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final name = message.payload['janmitraName'] ?? 'Janmitra Associate';

    return Container(
      constraints: const BoxConstraints(maxWidth: 600),
      margin: const EdgeInsets.only(bottom: JanaSpacing.sm),
      padding: const EdgeInsets.all(JanaSpacing.md),
      decoration: BoxDecoration(
        color: const Color(0xFF3E1F00), // Dark orange tint
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
          bottomRight: Radius.circular(16),
          bottomLeft: Radius.circular(0),
        ),
        border: Border.all(color: const Color(0xFFFF9800).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.support_agent, color: Color(0xFFFF9800), size: 14),
              const SizedBox(width: 6),
              Text(
                name.toUpperCase(),
                style: const TextStyle(
                  color: Color(0xFFFF9800),
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            message.text,
            style: const TextStyle(
              color: Color(0xFFFFCC80),
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../../domain/models/jana_message.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';

class JanaTranscriptBubble extends StatelessWidget {
  final JanaMessage message;

  const JanaTranscriptBubble({Key? key, required this.message}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
      padding: const EdgeInsets.symmetric(
        horizontal: JanaSpacing.md,
        vertical: JanaSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: JanaColors.userBubble.withOpacity(0.5),
        borderRadius: JanaRadius.bubbleLevelRight,
        border: Border.all(color: JanaColors.primaryTeal.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.graphic_eq, color: JanaColors.primaryTeal, size: 16),
          const SizedBox(width: JanaSpacing.sm),
          Flexible(
            child: Text(
              message.text.isNotEmpty ? message.text : 'Listening...',
              style: const TextStyle(
                color: JanaColors.darkText,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

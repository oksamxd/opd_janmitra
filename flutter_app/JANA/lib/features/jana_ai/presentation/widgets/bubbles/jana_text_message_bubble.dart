import 'package:flutter/material.dart';
import '../../../domain/models/jana_message.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaTextMessageBubble extends StatelessWidget {
  final JanaMessage message;

  const JanaTextMessageBubble({Key? key, required this.message}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
      padding: const EdgeInsets.symmetric(
        horizontal: JanaSpacing.md,
        vertical: JanaSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: JanaColors.janaBubble,
        borderRadius: JanaRadius.bubbleLevelLeft,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            offset: const Offset(0, 1),
            blurRadius: 2,
          ),
        ],
      ),
      child: Text(
        message.text,
        style: JanaTextStyles.body,
      ),
    );
  }
}

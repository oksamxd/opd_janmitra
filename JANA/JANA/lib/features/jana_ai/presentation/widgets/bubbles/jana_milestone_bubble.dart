import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../domain/models/jana_message.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';

class JanaMilestoneBubble extends StatelessWidget {
  final JanaMessage message;

  const JanaMilestoneBubble({Key? key, required this.message}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final title = message.payload['title'] ?? message.text;
    final time = DateFormat('HH:mm').format(message.createdAt);

    return Container(
      margin: EdgeInsets.symmetric(vertical: JanaSpacing.sm),
      padding: EdgeInsets.symmetric(horizontal: JanaSpacing.md, vertical: JanaSpacing.xs),
      decoration: BoxDecoration(
        color: const Color(0xFF1E3A5F).withOpacity(0.3),
        borderRadius: JanaRadius.card,
        border: Border.all(color: const Color(0xFF37D2E0).withOpacity(0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.stars, color: Color(0xFF37D2E0), size: 14),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            time,
            style: const TextStyle(
              color: Colors.white24,
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }
}

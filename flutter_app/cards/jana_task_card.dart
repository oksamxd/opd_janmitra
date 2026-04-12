import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaTaskCard extends StatelessWidget {
  final Map<String, dynamic> payload;

  const JanaTaskCard({Key? key, required this.payload}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final title = payload['title'] ?? 'Task to complete';
    final desc = payload['description'] ?? 'Please fill out intake form.';

    return Container(
      width: 280,
      padding: const EdgeInsets.all(JanaSpacing.md),
      decoration: BoxDecoration(
        color: JanaColors.cardBackground,
        borderRadius: JanaRadius.card,
        border: Border.all(color: JanaColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.check_box_outline_blank, color: JanaColors.primaryTeal),
              const SizedBox(width: JanaSpacing.sm),
              Expanded(
                child: Text(title, style: JanaTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: JanaSpacing.sm),
          Text(desc, style: JanaTextStyles.caption),
          const SizedBox(height: JanaSpacing.sm),
          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton(
               onPressed: (){},
               child: const Text('Start'),
            ),
          ),
        ],
      ),
    );
  }
}

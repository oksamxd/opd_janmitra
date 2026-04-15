import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaConfirmationCard extends StatelessWidget {
  final Map<String, dynamic> payload;

  const JanaConfirmationCard({Key? key, required this.payload}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final title = payload['title'] ?? 'Confirm Action';
    final summary = payload['summary'] ?? 'Are you sure you want to proceed with this booking?';

    return Container(
      width: 280,
      padding: const EdgeInsets.all(JanaSpacing.md),
      decoration: BoxDecoration(
        color: JanaColors.cardBackground,
        borderRadius: JanaRadius.card,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: JanaTextStyles.header2),
          const SizedBox(height: JanaSpacing.sm),
          Text(summary, style: JanaTextStyles.body),
          const SizedBox(height: JanaSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {},
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: JanaSpacing.sm),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: JanaColors.primaryTeal),
                  onPressed: () {},
                  child: const Text('Confirm', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

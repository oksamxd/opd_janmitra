import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaDocumentCard extends StatelessWidget {
  final Map<String, dynamic> payload;

  const JanaDocumentCard({Key? key, required this.payload}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final title = payload['title'] ?? 'Lab Report - Blood Test';
    final date = payload['date'] ?? 'Oct 23, 2023';
    final status = payload['status'] ?? 'Normal';

    final isAbnormal = status.toString().toLowerCase() == 'abnormal';

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
              const Icon(Icons.description, color: JanaColors.primaryTeal),
              const SizedBox(width: JanaSpacing.sm),
              Expanded(
                child: Text(title, style: JanaTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: JanaSpacing.xs),
          Text(date, style: JanaTextStyles.caption),
          const SizedBox(height: JanaSpacing.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: (isAbnormal ? JanaColors.errorRed : JanaColors.primaryTeal).withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              status,
              style: TextStyle(
                color: isAbnormal ? JanaColors.errorRed : JanaColors.primaryTeal,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: JanaSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: () {}, child: const Text('Share')),
              TextButton(onPressed: () {}, child: const Text('Open')),
            ],
          ),
        ],
      ),
    );
  }
}

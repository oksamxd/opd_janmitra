import 'package:flutter/material.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_radius.dart';
import '../theme/jana_spacing.dart';
import '../theme/jana_text_styles.dart';

class JanaCaseSummaryCard extends StatelessWidget {
  final String caseId;

  const JanaCaseSummaryCard({Key? key, required this.caseId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(JanaSpacing.md),
      decoration: BoxDecoration(
        color: JanaColors.background,
        borderRadius: JanaRadius.card,
        border: Border.all(color: JanaColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Case #$caseId', 
                  style: JanaTextStyles.body.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: JanaColors.warningLevel1.withOpacity(0.2),
                  borderRadius: JanaRadius.card,
                ),
                child: const Text('Pending', style: TextStyle(color: JanaColors.warningLevel1, fontSize: 12)),
              ),
            ],
          ),
          const SizedBox(height: JanaSpacing.sm),
          const Text('Member requires follow-up consultation for latest diagnostic reports.', style: JanaTextStyles.caption),
        ],
      ),
    );
  }
}

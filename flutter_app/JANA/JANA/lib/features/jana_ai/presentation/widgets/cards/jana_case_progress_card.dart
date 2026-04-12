import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaCaseProgressCard extends StatelessWidget {
  final Map<String, dynamic> payload;

  const JanaCaseProgressCard({Key? key, required this.payload}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 300,
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
          const Text('Case Progress', style: JanaTextStyles.header2),
          const SizedBox(height: JanaSpacing.md),
          _buildStep('Consultation', true, true),
          _buildStep('Diagnostic Tests', true, false),
          _buildStep('Medicines', false, false, isLast: true),
        ],
      ),
    );
  }

  Widget _buildStep(String title, bool isCompleted, bool isActive, {bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Icon(
              isCompleted ? Icons.check_circle : (isActive ? Icons.radio_button_checked : Icons.radio_button_unchecked),
              color: isCompleted ? JanaColors.successGreen : (isActive ? JanaColors.primaryTeal : JanaColors.divider),
              size: 20,
            ),
            if (!isLast)
              Container(width: 2, height: 20, color: isCompleted ? JanaColors.successGreen : JanaColors.divider),
          ],
        ),
        const SizedBox(width: JanaSpacing.sm),
        Text(title, style: TextStyle(
          color: isActive ? JanaColors.darkText : JanaColors.lightText,
          fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
        )),
      ],
    );
  }
}

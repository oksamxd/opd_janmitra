import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaAlertCard extends StatelessWidget {
  final Map<String, dynamic> payload;

  const JanaAlertCard({Key? key, required this.payload}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final title = payload['title'] ?? 'Alert';
    final desc = payload['description'] ?? 'Your upcoming appointment requires fasting for 12 hours.';
    final severity = payload['severity'] ?? 'warning'; // 'warning' or 'error' or 'info'

    Color color;
    IconData icon;
    if (severity == 'error') {
      color = JanaColors.errorRed;
      icon = Icons.error;
    } else if (severity == 'info') {
      color = JanaColors.primaryTeal;
      icon = Icons.info;
    } else {
      color = JanaColors.warningLevel1;
      icon = Icons.warning;
    }

    return Container(
      width: 280,
      padding: const EdgeInsets.all(JanaSpacing.md),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: JanaRadius.card,
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: JanaSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: JanaTextStyles.body.copyWith(fontWeight: FontWeight.bold, color: color)),
                const SizedBox(height: JanaSpacing.xs),
                Text(desc, style: JanaTextStyles.caption.copyWith(color: JanaColors.darkText)),
                const SizedBox(height: JanaSpacing.sm),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: color,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    onPressed: () {},
                    child: const Text('Got it'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

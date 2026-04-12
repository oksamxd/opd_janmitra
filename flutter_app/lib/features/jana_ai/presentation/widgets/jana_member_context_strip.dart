import 'package:flutter/material.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';
import '../theme/jana_text_styles.dart';

class JanaMemberContextStrip extends StatelessWidget {
  final String? memberId;

  const JanaMemberContextStrip({Key? key, this.memberId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(JanaSpacing.sm),
      color: JanaColors.softBlue,
      child: Row(
        children: [
          const Icon(Icons.person, color: JanaColors.primaryTeal),
          const SizedBox(width: JanaSpacing.sm),
          Expanded(
            child: Text(
              memberId != null
                  ? 'Assisting Member: #$memberId'
                  : 'No member selected',
              style: JanaTextStyles.body.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          TextButton(
            onPressed: () {},
            child: const Text('Change'),
          ),
        ],
      ),
    );
  }
}

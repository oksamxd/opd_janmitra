import 'package:flutter/material.dart';
import '../../domain/models/jana_app_mode.dart';
import '../theme/jana_spacing.dart';
import '../theme/jana_text_styles.dart';
import 'jana_quick_actions.dart';
import 'jana_animated_logo.dart';

class JanaGreetingCard extends StatelessWidget {
  final JanaAppMode mode;

  const JanaGreetingCard({Key? key, required this.mode}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(JanaSpacing.md),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const JanaAnimatedLogo(size: 120),
            const SizedBox(height: JanaSpacing.xl),
            const Text(
              'How can I help you today?',
              style: JanaTextStyles.header1,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: JanaSpacing.xl),
            JanaQuickActions(mode: mode),
          ],
        ),
      ),
    );
  }
}

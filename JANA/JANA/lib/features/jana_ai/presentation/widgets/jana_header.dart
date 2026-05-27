import 'package:flutter/material.dart';
import '../../domain/models/jana_app_mode.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';
import '../theme/jana_text_styles.dart';
import 'jana_animated_logo.dart';
import 'jana_notification_system.dart';

class JanaHeader extends StatelessWidget {
  final JanaAppMode mode;
  final bool speakerEnabled;
  final String currentLanguage;
  final VoidCallback onToggleSpeaker;
  final Function(String) onLanguageChanged;
  final String? sessionId;
  final VoidCallback? onOpenDashboard;
  final VoidCallback? onRequestHuman;
  final bool isHumanControlled;

  const JanaHeader({
    Key? key,
    required this.mode,
    required this.speakerEnabled,
    required this.currentLanguage,
    required this.onToggleSpeaker,
    required this.onLanguageChanged,
    this.sessionId,
    this.onOpenDashboard,
    this.onRequestHuman,
    this.isHumanControlled = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: JanaSpacing.md,
        vertical: JanaSpacing.sm,
      ),
      decoration: const BoxDecoration(
        color: JanaColors.cardBackground,
        border: Border(bottom: BorderSide(color: JanaColors.divider)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Logo + Title
          Row(
            children: [
              JanaAnimatedLogo(size: 44),
              const SizedBox(width: JanaSpacing.sm),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Jana AI', style: JanaTextStyles.header2),
                  Text(
                    mode == JanaAppMode.associate
                        ? 'Associate Assistant'
                        : 'Your Healthcare Assistant',
                    style: JanaTextStyles.caption,
                  ),
                ],
              ),
            ],
          ),

          // Actions row
          Row(
            children: [
              // Appointment Dashboard
              if (onOpenDashboard != null)
                IconButton(
                  icon: const Icon(Icons.calendar_month_outlined),
                  color: JanaColors.primaryTeal,
                  onPressed: onOpenDashboard,
                  tooltip: 'My Appointments',
                ),

              // Language Switcher
              PopupMenuButton<String>(
                initialValue: currentLanguage,
                onSelected: onLanguageChanged,
                icon: const Icon(Icons.language, color: JanaColors.primaryTeal),
                tooltip: 'Select Language',
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'English', child: Text('English')),
                  const PopupMenuItem(value: 'Hindi', child: Text('Hindi (हिंदी)')),
                  const PopupMenuItem(value: 'Kannada', child: Text('Kannada (ಕನ್ನಡ)')),
                ],
              ),
              const SizedBox(width: JanaSpacing.xs),

              // Speaker toggle
              IconButton(
                icon: Icon(
                  speakerEnabled ? Icons.volume_up : Icons.volume_off,
                  color: JanaColors.primaryTeal,
                ),
                onPressed: onToggleSpeaker,
                tooltip: speakerEnabled ? 'Mute' : 'Unmute',
              ),

              // Notification Bell
              if (sessionId != null)
                JanaNotificationBell(sessionId: sessionId),

              // Janmitra / Return to AI button
              if (onRequestHuman != null)
                Tooltip(
                  message: isHumanControlled
                      ? 'Return to Jana AI'
                      : 'Request Janmitra (Human) Assistance',
                  child: IconButton(
                    icon: Icon(
                      isHumanControlled
                          ? Icons.smart_toy_outlined
                          : Icons.support_agent,
                    ),
                    color: isHumanControlled
                        ? JanaColors.primaryTeal
                        : const Color(0xFFFF9800),
                    onPressed: onRequestHuman,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

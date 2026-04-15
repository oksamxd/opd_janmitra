import 'package:flutter/material.dart';
import '../../domain/models/jana_app_mode.dart';
import '../../domain/models/jana_quick_action_type.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_radius.dart';
import '../theme/jana_spacing.dart';

class JanaQuickActions extends StatelessWidget {
  final JanaAppMode mode;

  const JanaQuickActions({Key? key, required this.mode}) : super(key: key);

  List<JanaQuickActionType> _getActionsForMode() {
    if (mode == JanaAppMode.associate) {
      return [
        JanaQuickActionType.searchMember,
        JanaQuickActionType.continueCase,
        JanaQuickActionType.escalateIssue,
      ];
    }
    return [
      JanaQuickActionType.doctorConsultation,
      JanaQuickActionType.bookAppointment,
      JanaQuickActionType.medicineDelivery,
      JanaQuickActionType.diagnosticTest,
    ];
  }

  String _getLabel(JanaQuickActionType type) {
    switch (type) {
      case JanaQuickActionType.doctorConsultation:
        return 'Consult Doctor';
      case JanaQuickActionType.bookAppointment:
        return 'Book Appointment';
      case JanaQuickActionType.diagnosticTest:
        return 'Lab Test';
      case JanaQuickActionType.medicineDelivery:
        return 'Medicines';
      case JanaQuickActionType.continueCase:
        return 'Continue Case';
      case JanaQuickActionType.findService:
        return 'Find Service';
      case JanaQuickActionType.startMemberCase:
        return 'New Case';
      case JanaQuickActionType.searchMember:
        return 'Search Member';
      case JanaQuickActionType.escalateIssue:
        return 'Escalate';
    }
  }

  IconData _getIcon(JanaQuickActionType type) {
    switch (type) {
      case JanaQuickActionType.doctorConsultation:
        return Icons.medical_services;
      case JanaQuickActionType.bookAppointment:
        return Icons.calendar_today;
      case JanaQuickActionType.diagnosticTest:
        return Icons.science;
      case JanaQuickActionType.medicineDelivery:
        return Icons.local_pharmacy;
      case JanaQuickActionType.continueCase:
        return Icons.play_arrow;
      case JanaQuickActionType.findService:
        return Icons.search;
      case JanaQuickActionType.startMemberCase:
        return Icons.add_circle_outline;
      case JanaQuickActionType.searchMember:
        return Icons.person_search;
      case JanaQuickActionType.escalateIssue:
        return Icons.warning_amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    final actions = _getActionsForMode();
    return Wrap(
      spacing: JanaSpacing.sm,
      runSpacing: JanaSpacing.sm,
      alignment: WrapAlignment.center,
      children: actions.map((action) {
        return ActionChip(
          label: Text(_getLabel(action)),
          avatar: Icon(_getIcon(action), color: JanaColors.primaryTeal, size: 18),
          backgroundColor: JanaColors.softBlue,
          shape: RoundedRectangleBorder(borderRadius: JanaRadius.card),
          onPressed: () {
            // execute action
          },
        );
      }).toList(),
    );
  }
}

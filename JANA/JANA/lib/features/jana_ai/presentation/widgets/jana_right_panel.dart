import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../application/jana_ai_view_state.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';
import '../theme/jana_text_styles.dart';
import 'jana_case_summary_card.dart';
import 'jana_janmitra_panel.dart';

class JanaRightPanel extends StatefulWidget {
  final JanaAiViewState state;
  final VoidCallback? onReturnToAi;

  const JanaRightPanel({Key? key, required this.state, this.onReturnToAi}) : super(key: key);

  @override
  State<JanaRightPanel> createState() => _JanaRightPanelState();
}

class _JanaRightPanelState extends State<JanaRightPanel> {
  final ScrollController _scrollController = ScrollController();

  @override
  void didUpdateWidget(JanaRightPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state.contextEvents.length > oldWidget.state.contextEvents.length) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ── JANMITRA MODE: Show associate UI in the right panel ─────────────────
    if (widget.state.controlledBy == 'HUMAN') {
      return _buildJanmitraView();
    }

    // ── AI MODE: Show clinical assistant events ──────────────────────────────
    final events = widget.state.contextEvents.reversed.toList();

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: JanaColors.cardBackground,
        border: Border(left: BorderSide(color: JanaColors.divider)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(JanaSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Clinical Assistant', style: JanaTextStyles.header2),
                const SizedBox(height: 4),
                Text(
                  'Real-time clinical updates',
                  style: JanaTextStyles.caption.copyWith(fontSize: 12),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: widget.state.contextEvents.isEmpty
                ? _buildEmptyPlaceholder()
                : ListView.builder(
                    physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                    controller: _scrollController,
                    padding: const EdgeInsets.all(JanaSpacing.md),
                    itemCount: events.length,
                    itemBuilder: (context, index) {
                      final event = events[index];
                      final bool isLatest = index == 0;
                      return _buildNotificationItem(event, isLatest);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  /// Janmitra Associate panel — renders inside the right panel (associate mode).
  Widget _buildJanmitraView() {
    final sessionId = widget.state.sessionId;
    final janmitra = widget.state.janmitraData;
    final name = janmitra?['fullName'] as String? ?? 'Janmitra Associate';
    final role = janmitra?['role'] as String? ?? 'Janmitra Associate';

    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFF0E1A2B),
        border: Border(left: BorderSide(color: Color(0xFFFF9800), width: 2)),
      ),
      child: Column(
        children: [
          // Header banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF1A1200),
              border: Border(bottom: BorderSide(color: Color(0xFFFF9800), width: 1)),
            ),
            child: const Row(
              children: [
                Icon(Icons.support_agent, color: Color(0xFFFF9800), size: 18),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Janmitra Associate',
                    style: TextStyle(
                      color: Color(0xFFFF9800),
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: sessionId != null
                ? JanaJanmitraPanel(
                    sessionId: sessionId,
                    janmitraName: name,
                    janmitraRole: role,
                    janmitraData: janmitra,
                    onReturnToAi: widget.onReturnToAi,
                  )
                : const Center(
                    child: Text('Connecting to associate...',
                        style: TextStyle(color: Colors.white38)),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyPlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none, color: Colors.grey[300], size: 48),
          const SizedBox(height: 16),
          Text(
            'Waiting for updates...',
            style: JanaTextStyles.caption.copyWith(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(Map<String, dynamic> event, bool isLatest) {
    final String eventType = event['event_type'] ?? 'GENERIC_EVENT';
    final payload = event['payload'] ?? {};
    final String timestampStr = payload['timestamp'] ?? DateTime.now().toIso8601String();
    final DateTime time = DateTime.parse(timestampStr);
    final String formattedTime = DateFormat('hh:mm a').format(time.toLocal());

    String title = 'Update';
    String details = payload['message'] ?? 'Action processed.';
    IconData icon = Icons.notifications_active_outlined;
    Color color = JanaColors.primaryTeal;

    switch (eventType) {
      case 'MEMBER_VERIFIED':
        title = 'Patient Verified';
        icon = Icons.verified_user_outlined;
        color = Colors.blue;
        break;
      case 'CASE_CREATED':
        title = 'Case Created';
        icon = Icons.folder_shared_outlined;
        color = Colors.indigo;
        break;
      case 'APPOINTMENT_BOOKED':
        title = 'Booking Done';
        icon = Icons.event_available;
        color = Colors.deepPurple;
        break;
      case 'DOCTOR_OUTCOME_GENERATED':
        title = 'Outcome Ready';
        icon = Icons.assignment_outlined;
        color = Colors.teal;
        break;
      case 'LAB_TEST_SCHEDULED':
        title = 'Tests Booked';
        icon = Icons.biotech;
        color = Colors.cyan;
        break;
      case 'TEST_COMPLETED':
        title = 'Report Ready';
        icon = Icons.article_outlined;
        color = Colors.redAccent;
        break;
      case 'MEDICINE_DELIVERY_BOOKED':
        title = 'Dispatch Ready';
        icon = Icons.local_shipping;
        color = Colors.orange;
        break;
      case 'STEP_COMPLETED':
        title = payload['title'] ?? 'Step Complete';
        details = payload['message'] ?? 'Successfully completed.';
        icon = Icons.check_circle_outline;
        color = Colors.green;
        break;
      case 'HANDOFF':
        title = payload['title'] ?? 'Associate Joined';
        icon = Icons.support_agent;
        color = Colors.orange;
        break;
    }

    return AnimatedScale(
      scale: 1.0,
      duration: const Duration(milliseconds: 300),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: EdgeInsets.all(isLatest ? 16 : 12),
        decoration: BoxDecoration(
          color: isLatest ? color.withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isLatest ? color.withOpacity(0.5) : JanaColors.divider,
            width: isLatest ? 2 : 1,
          ),
          boxShadow: isLatest ? [
            BoxShadow(color: color.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 4))
          ] : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isLatest ? color : color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: isLatest ? 20 : 16, color: isLatest ? Colors.white : color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: isLatest ? 15 : 13,
                          color: JanaColors.darkText,
                        ),
                      ),
                      Text(
                        formattedTime,
                        style: JanaTextStyles.caption.copyWith(fontSize: 10),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    details,
                    style: JanaTextStyles.caption.copyWith(
                      fontSize: isLatest ? 13 : 12,
                      height: 1.4,
                      color: isLatest ? Colors.black87 : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

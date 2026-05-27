import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:async';
import 'dart:html' as html;
import 'package:http/http.dart' as http;
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';
import '../theme/jana_text_styles.dart';

/// Full member context header — always visible during session.
/// Shows: profile, risk indicators, medical summary, case snapshot.
class JanaMemberContextHeader extends StatefulWidget {
  final String? sessionId;
  final String? memberId;

  const JanaMemberContextHeader({
    Key? key,
    this.sessionId,
    this.memberId,
  }) : super(key: key);

  @override
  State<JanaMemberContextHeader> createState() => _JanaMemberContextHeaderState();
}

class _JanaMemberContextHeaderState extends State<JanaMemberContextHeader>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _contextData;
  bool _expanded = false;
  Timer? _pollTimer;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  String get _baseUrl {
    final hostname = html.window.location.hostname;
    // If running on localhost or 127.0.0.1, default to the local backend port 3005
    if (hostname == 'localhost' || hostname == '127.0.0.1') {
      return 'http://localhost:3005';
    }
    return html.window.location.origin;
  }


  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _fetchContext();
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _fetchContext());

  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant JanaMemberContextHeader oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Re-fetch if the sessionId changes (e.g., after init completes)
    if (oldWidget.sessionId != widget.sessionId && widget.sessionId != null) {
      _fetchContext();
    }
  }

  Future<void> _fetchContext() async {
    final id = widget.sessionId;
    if (id == null) return;
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/context/session/$id'),
        headers: {'Content-Type': 'application/json'},
      );
      if (res.statusCode == 200) {
        if (mounted) {
          setState(() => _contextData = jsonDecode(res.body));
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    // Still loading on first mount — but don't block forever if sessionId exists
    if (_contextData == null && widget.sessionId == null) return _buildSkeleton();
    // If sessionId is ready but data not yet fetched, show a subtle waiting state
    if (_contextData == null) return _buildWaitingState();

    final member = _contextData!['member'] as Map<String, dynamic>?;
    final risk = _contextData!['riskIndicators'] as Map<String, dynamic>?;
    final caseSnap = _contextData!['caseSnapshot'] as Map<String, dynamic>?;
    final medSummary = _contextData!['medicalSummary'] as Map<String, dynamic>?;
    final sessionCtx = _contextData!['session'] as Map<String, dynamic>?;
    final isHumanControlled = sessionCtx?['controlledBy'] == 'HUMAN';

    final riskLevel = risk?['level'] as String? ?? 'UNKNOWN';
    final riskColor = _riskColor(riskLevel);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF0E1A2B),
            const Color(0xFF112236),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border(
          bottom: BorderSide(
            color: isHumanControlled
                ? const Color(0xFFFF9800)
                : JanaColors.primaryTeal.withOpacity(0.3),
            width: isHumanControlled ? 2.0 : 1.0,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: JanaColors.primaryTeal.withOpacity(0.05),
            blurRadius: 8,
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── JANMITRA BANNER ──────────────────────────────
          if (isHumanControlled)
            _buildJanmitraBanner(),

          // ── MAIN HEADER ROW ──────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: JanaSpacing.md,
              vertical: JanaSpacing.sm,
            ),
            child: Row(
              children: [
                // Avatar
                _buildAvatar(member, riskColor),
                const SizedBox(width: JanaSpacing.sm),
                // Member info
                Expanded(child: _buildMemberInfo(member, risk, sessionCtx)),
                // Expand/collapse
                IconButton(
                  icon: AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(Icons.expand_more, color: JanaColors.primaryTeal),
                  ),
                  onPressed: () => setState(() => _expanded = !_expanded),
                  tooltip: _expanded ? 'Collapse' : 'Expand details',
                ),
              ],
            ),
          ),

          // ── EXPANDED DETAILS ──────────────────────────────
          if (_expanded) ...[
            const Divider(color: Color(0xFF1E3A5F), height: 1),
            Padding(
              padding: const EdgeInsets.all(JanaSpacing.md),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _buildMedicalSummary(medSummary, risk)),
                  const SizedBox(width: JanaSpacing.md),
                  Expanded(child: _buildCaseSnapshot(caseSnap)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSkeleton() {
    return Container(
      height: 64,
      color: const Color(0xFF0E1A2B),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 120, height: 12, color: Colors.white.withOpacity(0.1)),
              const SizedBox(height: 6),
              Container(width: 80, height: 10, color: Colors.white.withOpacity(0.07)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildWaitingState() {
    return Container(
      height: 56,
      color: const Color(0xFF0E1A2B),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: JanaColors.primaryTeal.withOpacity(0.2),
              border: Border.all(color: JanaColors.primaryTeal.withOpacity(0.4)),
            ),
            child: const Center(
              child: SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 1.5,
                  color: Color(0xFF37D2E0),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Loading profile...',
            style: TextStyle(
              color: Color(0xFF90A4AE),
              fontSize: 12,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildJanmitraBanner() {

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      color: const Color(0xFFFF9800).withOpacity(0.15),
      child: Row(
        children: [
          const Icon(Icons.person_pin, color: Color(0xFFFF9800), size: 16),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              '👨‍💼 Janmitra Associate is managing this session',
              style: TextStyle(
                color: Color(0xFFFF9800),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(Map<String, dynamic>? member, Color riskColor) {
    final name = member?['fullName'] as String? ?? '?';
    final initials = name.isNotEmpty
        ? name.trim().split(' ').map((w) => w[0]).take(2).join()
        : '?';

    return Stack(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [JanaColors.primaryTeal, const Color(0xFF00ACC1)],
            ),
            boxShadow: [
              BoxShadow(
                color: JanaColors.primaryTeal.withOpacity(0.3),
                blurRadius: 8,
                spreadRadius: 1,
              )
            ],
          ),
          child: Center(
            child: Text(
              initials.toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        Positioned(
          right: 0,
          bottom: 0,
          child: AnimatedBuilder(
            animation: _pulseAnim,
            builder: (_, __) => Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: riskColor.withOpacity(_pulseAnim.value),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF0E1A2B), width: 2),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMemberInfo(
    Map<String, dynamic>? member,
    Map<String, dynamic>? risk,
    Map<String, dynamic>? sessionCtx,
  ) {
    final name = member?['fullName'] ?? 'No member identified';
    final memberId = member?['memberId'] as String?;
    final age = member?['age'];
    final gender = member?['gender'] as String?;
    final state = sessionCtx?['state'] as String? ?? 'NEW';
    final riskFlags = (risk?['flags'] as List<dynamic>? ?? []).cast<String>();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          member != null ? name : 'Identifying member...',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 2),
        Row(
          children: [
            if (memberId != null)
              _tag('ID: ...${memberId.substring(memberId.length - 6)}',
                  const Color(0xFF37D2E0)),
            if (age != null) ...[
              const SizedBox(width: 4),
              _tag('$age yrs', const Color(0xFF7C83FD)),
            ],
            if (gender != null) ...[
              const SizedBox(width: 4),
              _tag(gender, const Color(0xFF7C83FD)),
            ],
            const SizedBox(width: 4),
            _tag(state.replaceAll('_', ' '), const Color(0xFF4CAF50)),
          ],
        ),
        if (riskFlags.isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            riskFlags.take(2).join(' • '),
            style: const TextStyle(
              color: Color(0xFFFF7043),
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ],
    );
  }

  Widget _buildMedicalSummary(
      Map<String, dynamic>? summary, Map<String, dynamic>? risk) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('📋 Medical Summary',
            style: TextStyle(
                color: Color(0xFF37D2E0),
                fontSize: 11,
                fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _summaryRow('🤧 Allergies', summary?['allergies'] ?? 'None recorded'),
        _summaryRow('💊 Medications', summary?['currentMedications'] ?? 'None'),
        _summaryRow('⚠️ Risk', risk?['level'] ?? 'UNKNOWN'),
      ],
    );
  }

  Widget _buildCaseSnapshot(Map<String, dynamic>? snap) {
    if (snap == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('📌 Case Snapshot',
              style: TextStyle(
                  color: Color(0xFF37D2E0),
                  fontSize: 11,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          _summaryRow('Status', 'No active case'),
        ],
      );
    }

    final appt = snap['nextAppointment'] as Map<String, dynamic>?;
    final doc = snap['assignedDoctor'] as Map<String, dynamic>?;
    final apptDate = appt != null
        ? DateTime.tryParse(appt['scheduledAt'] as String? ?? '')
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('📌 Case Snapshot',
            style: TextStyle(
                color: Color(0xFF37D2E0),
                fontSize: 11,
                fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        _summaryRow('Case', '...${(snap['caseId'] as String).substring((snap['caseId'] as String).length - 8)}'),
        _summaryRow('Status', snap['status'] ?? 'Active'),
        if (doc != null) _summaryRow('👨‍⚕️ Doctor', doc['name'] ?? 'TBA'),
        if (apptDate != null)
          _summaryRow(
            '📅 Next Appt',
            '${_weekday(apptDate.weekday)}, ${apptDate.day}/${apptDate.month} ${_time(apptDate)}',
          ),
      ],
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$label: ',
            style: const TextStyle(
                color: Color(0xFF90A4AE), fontSize: 10, fontWeight: FontWeight.w500),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white70, fontSize: 10),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _tag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.4), width: 0.5),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w600),
      ),
    );
  }

  Color _riskColor(String level) {
    switch (level) {
      case 'HIGH': return const Color(0xFFFF5252);
      case 'MEDIUM': return const Color(0xFFFF9800);
      case 'LOW': return const Color(0xFF4CAF50);
      default: return const Color(0xFF90A4AE);
    }
  }

  String _weekday(int d) =>
      const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1];

  String _time(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

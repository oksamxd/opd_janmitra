import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:html' as html;
import 'package:http/http.dart' as http;
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';

/// Appointment Dashboard Page
/// Shows upcoming, past, and cancelled appointments with actions.
class JanaAppointmentDashboard extends StatefulWidget {
  final String memberId;

  const JanaAppointmentDashboard({Key? key, required this.memberId})
      : super(key: key);

  @override
  State<JanaAppointmentDashboard> createState() =>
      _JanaAppointmentDashboardState();
}

class _JanaAppointmentDashboardState extends State<JanaAppointmentDashboard>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;

  String get _baseUrl {
    final origin = html.window.location.origin;
    if (html.window.location.hostname == 'localhost' &&
        html.window.location.port == '5000') {
      return 'http://localhost:3005';
    }
    return origin;
  }

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _fetchAppointments();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchAppointments() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/context/appointments/${widget.memberId}'),
      );
      if (res.statusCode == 200) {
        setState(() {
          _data = jsonDecode(res.body);
          _loading = false;
        });
      } else {
        setState(() { _error = 'Failed to load appointments'; _loading = false; });
      }
    } catch (e) {
      setState(() { _error = 'Network error'; _loading = false; });
    }
  }

  Future<void> _cancelAppointment(String apptId) async {
    try {
      await http.post(
        Uri.parse('$_baseUrl/api/context/appointments/$apptId/cancel'),
        headers: {'Content-Type': 'application/json'},
      );
      _fetchAppointments();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1628),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E1A2B),
        title: const Row(
          children: [
            Icon(Icons.calendar_month, color: Color(0xFF37D2E0)),
            SizedBox(width: 10),
            Text(
              'My Appointments',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: const Color(0xFF37D2E0),
          labelColor: const Color(0xFF37D2E0),
          unselectedLabelColor: Colors.white38,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: '📅 Upcoming'),
            Tab(text: '✅ Past'),
            Tab(text: '❌ Cancelled'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF37D2E0)))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchAppointments,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabCtrl,
                  children: [
                    _buildList('upcoming', true),
                    _buildList('past', false),
                    _buildList('cancelled', false),
                  ],
                ),
    );
  }

  Widget _buildList(String key, bool showActions) {
    final items = (_data?[key] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.event_available, color: Colors.white12, size: 48),
            const SizedBox(height: 12),
            Text(
              'No ${key == 'upcoming' ? 'upcoming' : key} appointments',
              style: const TextStyle(color: Colors.white38, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(JanaSpacing.md),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _buildAppointmentCard(items[i], showActions),
    );
  }

  Widget _buildAppointmentCard(Map<String, dynamic> appt, bool showActions) {
    final doctor = appt['doctor'] as Map<String, dynamic>? ?? {};
    final apptTime = DateTime.tryParse(appt['scheduledAt'] as String? ?? '');
    final docName = doctor['name'] as String? ?? 'Doctor';
    final specialty = doctor['specialty'] as String? ?? '';
    final type = appt['type'] as String? ?? 'CONSULTATION';
    final status = appt['status'] as String? ?? '';
    final apptId = appt['appointmentId'] as String? ?? '';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF112236), Color(0xFF0E1A2B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _statusColor(status).withOpacity(0.3),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 8,
          )
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Doctor row
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF37D2E0), Color(0xFF00ACC1)],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Icon(Icons.medical_services, color: Colors.white, size: 22),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        docName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        specialty,
                        style: const TextStyle(
                          color: Color(0xFF37D2E0),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 12),
            // Time row
            if (apptTime != null)
              Row(
                children: [
                  const Icon(Icons.schedule, color: Colors.white38, size: 14),
                  const SizedBox(width: 6),
                  Text(
                    '${_weekday(apptTime.weekday)}, ${apptTime.day}/${apptTime.month}/${apptTime.year} at ${_time(apptTime)}',
                    style: const TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C83FD).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      type == 'TELECONSULTATION' ? '💻 Tele' : '🏥 In-Person',
                      style: const TextStyle(
                        color: Color(0xFF7C83FD),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),

            // Action buttons
            if (showActions) ...[
              const SizedBox(height: 14),
              const Divider(color: Color(0xFF1E3A5F), height: 1),
              const SizedBox(height: 10),
              Row(
                children: [
                  // Call Doctor
                  Expanded(
                    child: _actionBtn(
                      icon: Icons.phone,
                      label: 'Call',
                      color: const Color(0xFF4CAF50),
                      onTap: () => _simulateCall(docName),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Cancel
                  Expanded(
                    child: _actionBtn(
                      icon: Icons.cancel_outlined,
                      label: 'Cancel',
                      color: const Color(0xFFFF5252),
                      onTap: () => _showCancelDialog(apptId),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _actionBtn({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  void _simulateCall(String name) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF112236),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('📞 Calling...', style: TextStyle(color: Colors.white)),
        content: Text(
          'Connecting to $name\n(Simulated call)',
          style: const TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('End Call', style: TextStyle(color: Color(0xFFFF5252))),
          )
        ],
      ),
    );
  }

  void _showCancelDialog(String apptId) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF112236),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Appointment?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'Are you sure you want to cancel this appointment? The slot will be released.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Keep', style: TextStyle(color: Color(0xFF37D2E0))),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _cancelAppointment(apptId);
            },
            child: const Text('Cancel Appointment',
                style: TextStyle(color: Color(0xFFFF5252))),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'BOOKED': return const Color(0xFF4CAF50);
      case 'CANCELLED': return const Color(0xFFFF5252);
      case 'COMPLETED': return const Color(0xFF37D2E0);
      default: return const Color(0xFF90A4AE);
    }
  }

  String _weekday(int d) =>
      const ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1];

  String _time(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}

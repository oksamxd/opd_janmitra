import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../../domain/models/jana_message.dart';
import '../../domain/models/jana_app_mode.dart';
import '../widgets/jana_conversation_list.dart';
import '../widgets/jana_quick_actions.dart';
import '../widgets/jana_option_chips.dart';
import '../../application/jana_ai_controller.dart';

// ─── BASE URL ─────────────────────────────────────────────────────────────────

String get _baseUrl {
  final host = html.window.location.hostname;
  if (host == 'localhost' || host == '127.0.0.1') return 'http://localhost:3005';
  return html.window.location.origin;
}

// ─── MODELS ───────────────────────────────────────────────────────────────────

class _Session {
  final String sessionId;
  final String? caseId;
  final String opdState;
  final String controlledBy;
  final String memberName;
  final String? severity;
  final String? doctorName;
  final DateTime updatedAt;

  _Session.fromJson(Map<String, dynamic> j)
      : sessionId = j['sessionId'],
        caseId = j['caseId'],
        opdState = j['opdState'] ?? 'NEW',
        controlledBy = j['controlledBy'] ?? 'AI',
        memberName = j['memberName'] ?? 'Member',
        severity = j['severity'],
        doctorName = j['doctorName'],
        updatedAt = DateTime.tryParse(j['updatedAt'] ?? '') ?? DateTime.now();
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

class JanaAssociateDashboard extends StatefulWidget {
  const JanaAssociateDashboard({super.key});

  @override
  State<JanaAssociateDashboard> createState() => _JanaAssociateDashboardState();
}

class _JanaAssociateDashboardState extends State<JanaAssociateDashboard> {
  // Sessions list
  List<_Session> _sessions = [];
  bool _loadingSessions = false;
  Timer? _sessionPollTimer;

  // Selected session
  _Session? _selected;
  List<JanaMessage> _chatHistory = [];
  List<JanaOption> _pendingOptions = [];
  String? _pendingType;
  bool _loadingChat = false;

  // SSE for selected session events
  html.EventSource? _eventSource;
  final Set<String> _seenEventIds = {};

  // Message input
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _chatScroll = ScrollController();
  bool _sending = false;

  // Fixed associate identity for demo
  final String _janmitraName = 'Priya Sharma';
  final String _janmitraId = '';

  @override
  void initState() {
    super.initState();
    _fetchSessions();
    _sessionPollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchSessions());
  }

  @override
  void dispose() {
    _sessionPollTimer?.cancel();
    _eventSource?.close();
    _msgCtrl.dispose();
    _chatScroll.dispose();
    super.dispose();
  }

  // ── Data Fetching ─────────────────────────────────────────────────────────

  Future<void> _fetchSessions() async {
    if (_loadingSessions) return;
    setState(() => _loadingSessions = true);
    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/context/sessions/active'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = (data['sessions'] as List)
            .map((s) => _Session.fromJson(s as Map<String, dynamic>))
            .toList();
        setState(() => _sessions = list);
      }
    } catch (_) {}
    setState(() => _loadingSessions = false);
  }

  Future<void> _selectSession(_Session s) async {
    setState(() {
      _selected = s;
      _loadingChat = true;
      _chatHistory = [];
      _pendingOptions = [];
      _pendingType = null;
    });

    _eventSource?.close();
    _seenEventIds.clear();

    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/context/sessions/${s.sessionId}/history'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final history = data['history'] as List? ?? [];
        setState(() {
          _chatHistory = history.map((m) {
            final msg = m as Map<String, dynamic>;
            final role = msg['role'] ?? 'user';
            
            // Map backend role to JanaMessageType if structured
            JanaMessageType type = JanaMessageType.text;
            if (role == 'janmitra') type = JanaMessageType.janmitra;
            
            // Handle structured assistant response if present in content or payload
            final payload = msg['payload'] as Map<String, dynamic>? ?? {};
            final typeStr = msg['type'] as String? ?? payload['type'] as String? ?? 'text';
            
            if (role == 'assistant' || role == 'jana') {
              switch (typeStr) {
                case 'slots': type = JanaMessageType.slotCard; break;
                case 'doctors': type = JanaMessageType.providerCard; break;
                case 'options': type = JanaMessageType.quickReplies; break;
              }
            }

            return JanaMessage(
              id: msg['id']?.toString() ?? DateTime.now().hashCode.toString(),
              sender: role == 'assistant' ? 'jana' : role,
              type: type,
              text: msg['content'] ?? msg['message'] ?? '',
              createdAt: DateTime.tryParse(msg['createdAt'] ?? '') ?? DateTime.now(),
              payload: payload,
            );
          }).toList();
          _loadingChat = false;
        });

        // Also inject case events (JANMITRA_MESSAGE, AI_RESPONSE) already saved
        final events = data['caseEvents'] as List? ?? [];
        for (final e in events) {
          final ev = e as Map<String, dynamic>;
          final evId = ev['event_id'] ?? ev.hashCode.toString();
          if (_seenEventIds.contains(evId)) continue;
          _seenEventIds.add(evId);

          if (ev['event_type'] == 'JANMITRA_MESSAGE') {
            final payload = ev['payload'] as Map<String, dynamic>? ?? {};
            setState(() {
              _chatHistory.add(JanaMessage(
                id: evId,
                sender: 'janmitra',
                type: JanaMessageType.janmitra,
                text: payload['message'] ?? '',
                createdAt: DateTime.tryParse(ev['created_at'] ?? '') ?? DateTime.now(),
                payload: payload,
              ));
            });
          } else if (ev['event_type'] == 'AI_RESPONSE') {
             final payload = ev['payload'] as Map<String, dynamic>? ?? {};
             final responseType = payload['type'] as String? ?? 'text';
             JanaMessageType msgType = JanaMessageType.text;
             switch (responseType) {
               case 'slots': msgType = JanaMessageType.slotCard; break;
               case 'doctors': msgType = JanaMessageType.providerCard; break;
             }

             setState(() {
               _chatHistory.add(JanaMessage(
                 id: evId,
                 sender: 'jana',
                 type: msgType,
                 text: payload['message'] ?? '',
                 createdAt: DateTime.tryParse(ev['created_at'] ?? '') ?? DateTime.now(),
                 payload: payload,
               ));
             });
          }
        }

        _scrollToBottom();
      }
    } catch (_) {
      setState(() => _loadingChat = false);
    }

    // Start SSE stream for live events
    final streamId = s.caseId ?? s.sessionId;
    _eventSource = html.EventSource('$_baseUrl/api/events/stream/$streamId');
    _eventSource!.onMessage.listen((event) {
      if (event.data == null) return;
      try {
        final list = jsonDecode(event.data as String) as List;
        for (final item in list) {
          final ev = item as Map<String, dynamic>;
          final evId = ev['event_id'] ?? '';
          if (_seenEventIds.contains(evId)) continue;
          _seenEventIds.add(evId);
          if (ev['event_type'] == 'JANMITRA_MESSAGE') {
            final payload = ev['payload'] as Map<String, dynamic>? ?? {};
            setState(() {
              _chatHistory.add(JanaMessage(
                id: evId,
                sender: 'janmitra',
                type: JanaMessageType.janmitra,
                text: payload['message'] ?? '',
                createdAt: DateTime.tryParse(ev['created_at'] ?? '') ?? DateTime.now(),
                payload: payload,
              ));
            });
            _scrollToBottom();
          } else if (ev['event_type'] == 'AI_RESPONSE') {
             final payload = ev['payload'] as Map<String, dynamic>? ?? {};
             final responseType = payload['type'] as String? ?? 'text';
             final rawOptions = payload['options'] as List<dynamic>? ?? [];
             final options = rawOptions
                 .whereType<Map<String, dynamic>>()
                 .map((o) => JanaOption.fromJson(o))
                 .toList();

             JanaMessageType msgType = JanaMessageType.text;
             switch (responseType) {
               case 'slots': msgType = JanaMessageType.slotCard; break;
               case 'doctors': msgType = JanaMessageType.providerCard; break;
             }
             setState(() {
               _pendingOptions = options;
               _pendingType = responseType;
               _chatHistory.add(JanaMessage(
                 id: evId,
                 sender: 'jana',
                 type: msgType,
                 text: payload['message'] ?? '',
                 createdAt: DateTime.tryParse(ev['created_at'] ?? '') ?? DateTime.now(),
                 payload: payload,
               ));
             });
             _scrollToBottom();
          } else {
            // Handle Clinical Milestones
            final milestoneTypes = ['CASE_CREATED', 'STEP_COMPLETED', 'TRIAGE_COMPLETED', 'APPOINTMENT_BOOKED', 'TEST_ORDERED'];
            if (milestoneTypes.contains(ev['event_type'])) {
              final payload = ev['payload'] as Map<String, dynamic>? ?? {};
              String milestoneTitle = ev['event_type'].replaceAll('_', ' ');
              if (ev['event_type'] == 'CASE_CREATED') milestoneTitle = '🏥 Case Created';
              if (ev['event_type'] == 'TRIAGE_COMPLETED') milestoneTitle = '📋 Triage Completed';
              if (ev['event_type'] == 'APPOINTMENT_BOOKED') milestoneTitle = '📅 Appointment Booked';

              setState(() {
                _chatHistory.add(JanaMessage(
                  id: evId,
                  sender: 'system',
                  type: JanaMessageType.milestone,
                  text: milestoneTitle,
                  createdAt: DateTime.tryParse(ev['created_at'] ?? '') ?? DateTime.now(),
                  payload: {'title': milestoneTitle, ...payload},
                ));
              });
              _scrollToBottom();
            }
          }

        }
      } catch (_) {}
    });
  }

  Future<void> _takeOver() async {
    if (_selected == null) return;
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/context/handoff/to-human/${_selected!.sessionId}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'reason': 'Associate took control from dashboard'}),
      );
      if (res.statusCode == 200) {
        _showSnack('✅ You are now managing this session');
        await _fetchSessions();
        final updated = _sessions.firstWhere((s) => s.sessionId == _selected!.sessionId,
            orElse: () => _selected!);
        setState(() => _selected = updated);
      }
    } catch (e) {
      _showSnack('Error: $e');
    }
  }

  Future<void> _releaseToAi() async {
    if (_selected == null) return;
    try {
      await http.post(Uri.parse('$_baseUrl/api/context/handoff/to-ai/${_selected!.sessionId}'));
      _showSnack('🤖 Control returned to Jana AI');
      await _fetchSessions();
    } catch (e) {
      _showSnack('Error: $e');
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _selected == null) return;
    setState(() => _sending = true);
    _msgCtrl.clear();

    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/context/handoff/janmitra-message/${_selected!.sessionId}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': text,
          'janmitraName': _janmitraName,
          'janmitraId': _janmitraId,
        }),
      );
      if (res.statusCode == 200) {
        setState(() {
          _chatHistory.add(JanaMessage(
            id: DateTime.now().hashCode.toString(),
            sender: 'janmitra',
            type: JanaMessageType.janmitra,
            text: text,
            createdAt: DateTime.now(),
          ));
        });
        _scrollToBottom();
      }
    } catch (_) {}

    setState(() => _sending = false);
  }

  Future<void> _sendTrigger(String triggerText) async {
    if (_selected == null) return;
    setState(() {
      _sending = true;
      _pendingOptions = [];
      _pendingType = null;
      // Local echo for the trigger itself
      _chatHistory.add(JanaMessage(
        id: 'trigger_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'janmitra',
        type: JanaMessageType.janmitra,
        text: 'Action: $triggerText',
        createdAt: DateTime.now(),
      ));
    });
    _scrollToBottom();

    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/context/handoff/janmitra-trigger/${_selected!.sessionId}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': triggerText,
          'janmitraName': _janmitraName,
          'janmitraId': _janmitraId,
        }),
      );
      if (res.statusCode == 200) {
        // Response will come back via SSE
      }
    } catch (_) {}

    setState(() => _sending = false);
  }


  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScroll.hasClients) {
        _chatScroll.animateTo(_chatScroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
      }
    });
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ── BUILD ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B1628),
      body: Row(
        children: [
          _buildSessionList(),
          const VerticalDivider(width: 1, color: Color(0xFF1E3A5F)),
          _selected == null ? _buildNoSelection() : _buildSessionDetail(),
        ],
      ),
    );
  }

  Widget _buildSessionList() {
    return SizedBox(
      width: 300,
      child: Column(
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
            decoration: const BoxDecoration(
              color: Color(0xFF0E1A2B),
              border: Border(bottom: BorderSide(color: Color(0xFFFF9800), width: 1.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Container(
                    width: 36, height: 36,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(colors: [Color(0xFFFF9800), Color(0xFFE65100)]),
                    ),
                    child: const Center(
                      child: Text('JA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('Janmitra Dashboard', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      Text('Associate Mode', style: TextStyle(color: Color(0xFFFF9800), fontSize: 11)),
                    ],
                  ),
                ]),
                const SizedBox(height: 12),
                const Text('ACTIVE SESSIONS', style: TextStyle(color: Colors.white38, fontSize: 10, letterSpacing: 1.2)),
              ],
            ),
          ),
          // Session list
          Expanded(
            child: _sessions.isEmpty
                ? const Center(child: Text('No active sessions', style: TextStyle(color: Colors.white38)))
                : ListView.builder(
                    itemCount: _sessions.length,
                    itemBuilder: (_, i) => _buildSessionTile(_sessions[i]),
                  ),
          ),
          // Refresh button
          TextButton.icon(
            onPressed: _fetchSessions,
            icon: const Icon(Icons.refresh, size: 14, color: Color(0xFF37D2E0)),
            label: const Text('Refresh', style: TextStyle(color: Color(0xFF37D2E0), fontSize: 12)),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildSessionTile(_Session s) {
    final isSelected = _selected?.sessionId == s.sessionId;
    final isHuman = s.controlledBy == 'HUMAN';
    Color severityColor = Colors.green;
    if (s.severity == 'severe') severityColor = Colors.red;
    else if (s.severity == 'moderate') severityColor = Colors.orange;

    return GestureDetector(
      onTap: () => _selectSession(s),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1A2E4A) : const Color(0xFF0E1A2B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF37D2E0) : const Color(0xFF1E3A5F),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(width: 8, height: 8,
                decoration: BoxDecoration(color: severityColor, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(s.memberName,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                  overflow: TextOverflow.ellipsis),
              ),
              if (isHuman)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF9800).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('HUMAN', style: TextStyle(color: Color(0xFFFF9800), fontSize: 9, fontWeight: FontWeight.bold)),
                ),
            ]),
            const SizedBox(height: 4),
            Text(s.opdState.replaceAll('_', ' '),
              style: const TextStyle(color: Colors.white38, fontSize: 11)),
            Text(DateFormat('HH:mm').format(s.updatedAt.toLocal()),
              style: const TextStyle(color: Colors.white24, fontSize: 10)),
          ],
        ),
      ),
    );
  }

  Widget _buildNoSelection() {
    return const Expanded(
      child: Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.support_agent, size: 64, color: Color(0xFF1E3A5F)),
          SizedBox(height: 16),
          Text('Select a session to begin', style: TextStyle(color: Colors.white38, fontSize: 14)),
        ]),
      ),
    );
  }

  Widget _buildSessionDetail() {
    final s = _selected!;
    final isHuman = s.controlledBy == 'HUMAN';

    return Expanded(
      child: Column(
        children: [
          // Session header bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            decoration: const BoxDecoration(
              color: Color(0xFF0E1A2B),
              border: Border(bottom: BorderSide(color: Color(0xFF1E3A5F))),
            ),
            child: Row(children: [
              const Icon(Icons.person_outline, color: Color(0xFF37D2E0), size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.memberName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('${s.opdState.replaceAll('_', ' ')} • ${s.controlledBy == 'HUMAN' ? '👤 Human Control' : '🤖 AI Control'}',
                      style: const TextStyle(color: Colors.white38, fontSize: 11)),
                  ],
                ),
              ),
              // Take Over / Release buttons
              if (!isHuman)
                ElevatedButton.icon(
                  onPressed: _takeOver,
                  icon: const Icon(Icons.support_agent, size: 14),
                  label: const Text('Take Over', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF9800),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                )
              else
                OutlinedButton.icon(
                  onPressed: _releaseToAi,
                  icon: const Icon(Icons.smart_toy_outlined, size: 14),
                  label: const Text('Release to AI', style: TextStyle(fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF37D2E0),
                    side: const BorderSide(color: Color(0xFF37D2E0)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
            ]),
          ),

          // Chat history
          Expanded(
            child: _loadingChat
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF37D2E0)))
                : JanaConversationList(
                    messages: _chatHistory,
                    onSendMessage: (val) => _sendTrigger(val),
                  ),
          ),


          // Quick Reply Chips
          if (_pendingOptions.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF0E1A2B),
                border: Border(top: BorderSide(color: Color(0xFF1E3A5F), width: 0.5)),
              ),
              child: JanaOptionChips(
                options: _pendingOptions,
                type: _pendingType ?? 'options',
                onSelect: (opt) => _sendTrigger(opt.value),
              ),
            ),

          // Message input (only when in human control)
          if (isHuman) _buildMessageInput(),
          if (!isHuman)
            Container(
              padding: const EdgeInsets.all(12),
              color: const Color(0xFF0E1A2B),
              child: Row(children: [
                const Icon(Icons.info_outline, color: Colors.white38, size: 14),
                const SizedBox(width: 8),
                const Text('Take over to send messages', style: TextStyle(color: Colors.white38, fontSize: 12)),
              ]),
            ),
        ],
      ),
    );
  }



  Widget _buildMessageInput() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
      decoration: const BoxDecoration(
        color: Color(0xFF0E1A2B),
        border: Border(top: BorderSide(color: Color(0xFFFF9800), width: 1)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: JanaQuickActions(
              mode: JanaAppMode.associate,
              onActionTriggered: (val) => _sendTrigger(val),
            ),
          ),
          Row(children: [

        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: const Color(0xFFFF9800).withOpacity(0.15),
            borderRadius: BorderRadius.circular(6),
          ),
          child: const Text('As Janmitra', style: TextStyle(color: Color(0xFFFF9800), fontSize: 10, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: TextField(
            controller: _msgCtrl,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Type message to member...',
              hintStyle: const TextStyle(color: Colors.white24),
              filled: true,
              fillColor: const Color(0xFF1A2E4A),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide.none,
              ),
            ),
            onSubmitted: (_) => _sendMessage(),
          ),
        ),
        const SizedBox(width: 10),
        GestureDetector(
          onTap: _sending ? null : _sendMessage,
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFFF9800), Color(0xFFE65100)]),
              borderRadius: BorderRadius.circular(10),
            ),
            child: _sending
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send, color: Colors.white, size: 18),
          ),
        ),
      ]),
    ],
  ),
);
}
}





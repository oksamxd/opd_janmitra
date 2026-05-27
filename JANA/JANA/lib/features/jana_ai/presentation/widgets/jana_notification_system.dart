import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:async';
import 'dart:html' as html;
import 'package:http/http.dart' as http;
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';

/// Notification overlay / bell system.
/// Shows in-chat notification toasts and a badge on the bell icon.
class JanaNotificationBell extends StatefulWidget {
  final String? sessionId;
  final String? memberId;

  const JanaNotificationBell({Key? key, this.sessionId, this.memberId})
      : super(key: key);

  @override
  State<JanaNotificationBell> createState() => _JanaNotificationBellState();
}

class _JanaNotificationBellState extends State<JanaNotificationBell>
    with SingleTickerProviderStateMixin {
  int _unreadCount = 0;
  List<Map<String, dynamic>> _notifications = [];
  Timer? _pollTimer;
  bool _panelOpen = false;
  late AnimationController _shakeController;
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();

  String get _baseUrl {
    final hostname = html.window.location.hostname;
    if (hostname == 'localhost' || hostname == '127.0.0.1') {
      return 'http://localhost:3005';
    }
    return html.window.location.origin;
  }

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _fetchNotifications();
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) => _fetchNotifications());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _shakeController.dispose();
    _closePanel();
    super.dispose();
  }

  void _togglePanel() {
    if (_panelOpen) {
      _closePanel();
    } else {
      _openPanel();
    }
  }

  void _openPanel() {
    _overlayEntry = _createOverlayEntry();
    Overlay.of(context).insert(_overlayEntry!);
    setState(() => _panelOpen = true);
    _markAllRead();
  }

  void _closePanel() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    if (mounted) {
      setState(() => _panelOpen = false);
    }
  }

  OverlayEntry _createOverlayEntry() {
    RenderBox renderBox = context.findRenderObject() as RenderBox;
    var size = renderBox.size;

    return OverlayEntry(
      builder: (context) => Stack(
        children: [
          // Tap-outside detector
          Positioned.fill(
            child: GestureDetector(
              onTap: _closePanel,
              behavior: HitTestBehavior.opaque,
              child: Container(color: Colors.transparent),
            ),
          ),
          Positioned(
            width: 320,
            child: CompositedTransformFollower(
              link: _layerLink,
              showWhenUnlinked: false,
              offset: Offset(-280, size.height + 8),
              child: Material(
                color: Colors.transparent,
                child: _buildNotificationPanel(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _fetchNotifications() async {
    final id = widget.sessionId;
    if (id == null) return;
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/context/notifications/session/$id'),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final notifs = (data['notifications'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
        final count = data['unreadCount'] as int? ?? 0;
        if (mounted) {
          final hadUnread = _unreadCount == 0 && count > 0;
          setState(() {
            _notifications = notifs;
            _unreadCount = count;
          });
          if (hadUnread) {
            _shakeController.forward(from: 0);
          }
          // Update overlay if open
          if (_panelOpen) {
            _overlayEntry?.markNeedsBuild();
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    final id = widget.sessionId;
    if (id == null) return;
    try {
      await http.patch(
          Uri.parse('$_baseUrl/api/context/notifications/$id/read-all'));
      await _fetchNotifications();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Bell icon
          AnimatedBuilder(
            animation: _shakeController,
            builder: (_, child) {
              final val = _shakeController.value;
              const shake = 0.05;
              final angle = val < 0.5
                  ? shake * (val / 0.5)
                  : shake * (1 - (val - 0.5) / 0.5);
              return Transform.rotate(angle: angle * 3.14, child: child);
            },
            child: IconButton(
              icon: const Icon(Icons.notifications_none_rounded),
              color: _unreadCount > 0
                  ? const Color(0xFFFF9800)
                  : JanaColors.primaryTeal,
              onPressed: _togglePanel,
              tooltip: 'Notifications',
            ),
          ),
          // Badge
          if (_unreadCount > 0)
            Positioned(
              right: 4,
              top: 4,
              child: Container(
                width: 18,
                height: 18,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF5252),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    _unreadCount > 9 ? '9+' : '$_unreadCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNotificationPanel() {
    return Material(
      elevation: 8,
      borderRadius: BorderRadius.circular(16),
      color: const Color(0xFF112236),
      child: Container(
        width: 320,
        constraints: const BoxConstraints(maxHeight: 400),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: JanaColors.primaryTeal.withOpacity(0.2),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 10),
              child: Row(
                children: [
                  const Icon(Icons.notifications, color: Color(0xFFFF9800), size: 18),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Notifications',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white38, size: 18),
                    onPressed: () => setState(() => _panelOpen = false),
                  ),
                ],
              ),
            ),
            const Divider(color: Color(0xFF1E3A5F), height: 1),
            // List
            _notifications.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(
                      child: Text(
                        '✅ All caught up!',
                        style: TextStyle(color: Colors.white38, fontSize: 13),
                      ),
                    ),
                  )
                : Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _notifications.length,
                      separatorBuilder: (_, __) =>
                          const Divider(color: Color(0xFF1E3A5F), height: 1),
                      itemBuilder: (_, i) =>
                          _buildNotifItem(_notifications[i]),
                    ),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotifItem(Map<String, dynamic> notif) {
    final isUnread = notif['status'] == 'PENDING';
    final type = notif['type'] as String? ?? '';
    final icon = _iconForType(type);

    return Container(
      color: isUnread
          ? const Color(0xFF0D2137).withOpacity(0.6)
          : Colors.transparent,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(icon, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notif['title'] as String? ?? '',
                    style: TextStyle(
                      color: isUnread ? Colors.white : Colors.white70,
                      fontWeight:
                          isUnread ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    notif['message'] as String? ?? '',
                    style: const TextStyle(color: Colors.white38, fontSize: 11),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (isUnread)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 4, left: 4),
                decoration: const BoxDecoration(
                  color: Color(0xFFFF9800),
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _iconForType(String type) {
    switch (type) {
      case 'APPOINTMENT_REMINDER': return '📅';
      case 'TEST_REMINDER': return '🔬';
      case 'FOLLOWUP_REMINDER': return '🔁';
      case 'DELIVERY_UPDATE': return '🚚';
      case 'HANDOFF': return '👨‍💼';
      default: return '🔔';
    }
  }
}

/// In-chat notification toast that pops up automatically.
class JanaNotificationToast extends StatefulWidget {
  final String title;
  final String message;
  final String type;
  final VoidCallback? onDismiss;

  const JanaNotificationToast({
    Key? key,
    required this.title,
    required this.message,
    required this.type,
    this.onDismiss,
  }) : super(key: key);

  @override
  State<JanaNotificationToast> createState() => _JanaNotificationToastState();
}

class _JanaNotificationToastState extends State<JanaNotificationToast>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _fadeAnim = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _ctrl.forward();

    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        _ctrl.reverse().then((_) => widget.onDismiss?.call());
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          margin: const EdgeInsets.all(12),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1A2744), Color(0xFF0E1A2B)],
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: const Color(0xFFFF9800).withOpacity(0.4),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 12,
              )
            ],
          ),
          child: Row(
            children: [
              Text(
                _iconForType(widget.type),
                style: const TextStyle(fontSize: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.title,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      widget.message,
                      style: const TextStyle(
                        color: Colors.white60,
                        fontSize: 11,
                      ),
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white30, size: 16),
                onPressed: () {
                  _ctrl.reverse().then((_) => widget.onDismiss?.call());
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _iconForType(String type) {
    switch (type) {
      case 'APPOINTMENT_REMINDER': return '📅';
      case 'TEST_REMINDER': return '🔬';
      case 'FOLLOWUP_REMINDER': return '🔁';
      case 'DELIVERY_UPDATE': return '🚚';
      case 'HANDOFF': return '👨‍💼';
      default: return '🔔';
    }
  }
}

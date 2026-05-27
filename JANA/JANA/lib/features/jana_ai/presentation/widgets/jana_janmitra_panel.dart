import 'package:flutter/material.dart';
import 'dart:html' as html;
import 'package:http/http.dart' as http;
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';

/// Janmitra Associate panel — lives inside JanaRightPanel when controlled_by == HUMAN.
/// This is part of the associate mode inside the Flutter app (not a separate HTML panel).
class JanaJanmitraPanel extends StatefulWidget {
  final String sessionId;
  final String janmitraName;
  final String janmitraRole;
  final Map<String, dynamic>? janmitraData;
  /// Optional callback so the parent can listen for return-to-AI events.
  final VoidCallback? onReturnToAi;

  const JanaJanmitraPanel({
    Key? key,
    required this.sessionId,
    this.janmitraName = 'Janmitra Associate',
    this.janmitraRole = 'Janmitra Associate',
    this.janmitraData,
    this.onReturnToAi,
  }) : super(key: key);

  @override
  State<JanaJanmitraPanel> createState() => _JanaJanmitraPanelState();
}

class _JanaJanmitraPanelState extends State<JanaJanmitraPanel>
    with SingleTickerProviderStateMixin {
  bool _calling = false;
  bool _loading = false;
  late AnimationController _floatController;
  late Animation<double> _floatAnim;

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
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _floatAnim = Tween<double>(begin: -4, end: 4).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _floatController.dispose();
    super.dispose();
  }

  void _simulateCall() {
    setState(() => _calling = true);
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _calling = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final initials = widget.janmitraName
        .trim()
        .split(' ')
        .map((w) => w.isNotEmpty ? w[0] : '')
        .take(2)
        .join()
        .toUpperCase();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(JanaSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: 12),

          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFFFF9800).withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFFF9800).withOpacity(0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFF9800),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'Active — Managing Session',
                  style: TextStyle(
                    color: Color(0xFFFF9800),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Floating Avatar
          AnimatedBuilder(
            animation: _floatAnim,
            builder: (_, child) => Transform.translate(
              offset: Offset(0, _floatAnim.value),
              child: child,
            ),
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF9800), Color(0xFFE65100)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFFF9800).withOpacity(0.35),
                    blurRadius: 20,
                    spreadRadius: 4,
                  )
                ],
              ),
              child: Center(
                child: Text(
                  initials.isEmpty ? 'JA' : initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Name
          Text(
            widget.janmitraName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),

          // Role badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFF37D2E0).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF37D2E0).withOpacity(0.3)),
            ),
            child: Text(
              widget.janmitraRole,
              style: const TextStyle(
                color: Color(0xFF37D2E0),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Currently managing your session',
            style: TextStyle(color: Colors.white38, fontSize: 11),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          // Divider
          const Divider(color: Color(0xFF1E3A5F)),
          const SizedBox(height: 16),

          // Capabilities
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('Janmitra can help with:',
                style: TextStyle(color: Colors.white54, fontSize: 11)),
          ),
          const SizedBox(height: 10),
          ...[
            '💬 Send chat messages on your behalf',
            '📅 Book & reschedule appointments',
            '📋 Complete healthcare workflows',
            '🔬 Trigger diagnostic tests',
          ].map((cap) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Text(cap.substring(0, 2), style: const TextStyle(fontSize: 14)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        cap.substring(2).trim(),
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              )),
          const SizedBox(height: 20),

          // Call button
          _calling ? _buildCallingUI() : _buildCallButton(),
          const SizedBox(height: 12),

          // Return to AI
          OutlinedButton.icon(
            onPressed: _loading ? null : () => widget.onReturnToAi?.call(),
            icon: _loading
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.smart_toy_outlined, size: 16),
            label: const Text('Return control to Jana AI'),
            style: OutlinedButton.styleFrom(
              foregroundColor: JanaColors.primaryTeal,
              side: BorderSide(color: JanaColors.primaryTeal.withOpacity(0.4)),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              minimumSize: const Size(double.infinity, 40),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCallButton() {
    return GestureDetector(
      onTap: _simulateCall,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 13),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF43A047), Color(0xFF1B5E20)],
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF4CAF50).withOpacity(0.3),
              blurRadius: 12,
            )
          ],
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.phone_in_talk, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text(
              '📞 Call Janmitra',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCallingUI() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 13),
      decoration: BoxDecoration(
        color: const Color(0xFF1B5E20),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF4CAF50).withOpacity(0.5)),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Color(0xFF4CAF50),
            ),
          ),
          SizedBox(width: 10),
          Text(
            'Ringing Janmitra... (Simulated)',
            style: TextStyle(
              color: Color(0xFF4CAF50),
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

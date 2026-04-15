import 'package:flutter/material.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_radius.dart';
import '../theme/jana_spacing.dart';

class JanaTextInputBar extends StatefulWidget {
  final Function(String) onSend;

  const JanaTextInputBar({Key? key, required this.onSend}) : super(key: key);

  @override
  State<JanaTextInputBar> createState() => _JanaTextInputBarState();
}

class _JanaTextInputBarState extends State<JanaTextInputBar> {
  final TextEditingController _controller = TextEditingController();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      setState(() {
        _hasText = _controller.text.trim().isNotEmpty;
      });
    });
  }

  void _submit() {
    if (_hasText) {
      widget.onSend(_controller.text);
      _controller.clear();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(JanaSpacing.sm),
      decoration: const BoxDecoration(
        color: JanaColors.cardBackground,
        border: Border(top: BorderSide(color: JanaColors.divider)),
      ),
      child: SafeArea(
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.attach_file, color: JanaColors.lightText),
              onPressed: () {}, // Optional attach
            ),
            Expanded(
              child: TextField(
                controller: _controller,
                maxLines: 4,
                minLines: 1,
                decoration: InputDecoration(
                  hintText: 'Type a message...',
                  border: OutlineInputBorder(
                    borderRadius: JanaRadius.card,
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: JanaColors.background,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: JanaSpacing.md,
                    vertical: JanaSpacing.sm,
                  ),
                ),
              ),
            ),
            const SizedBox(width: JanaSpacing.sm),
            IconButton(
              icon: Icon(
                Icons.send,
                color: _hasText ? JanaColors.primaryTeal : JanaColors.lightText,
              ),
              onPressed: _hasText ? _submit : null,
            ),
          ],
        ),
      ),
    );
  }
}

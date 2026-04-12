import 'package:flutter/material.dart';
import '../../domain/models/jana_voice_state.dart';
import '../theme/jana_colors.dart';
import '../theme/jana_spacing.dart';

class JanaVoiceDock extends StatelessWidget {
  final JanaVoiceState state;
  final VoidCallback onMicTap;

  const JanaVoiceDock({
    Key? key,
    required this.state,
    required this.onMicTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    bool isListening = state == JanaVoiceState.listening;
    bool isProcessing = state == JanaVoiceState.processing;
    
    return Container(
      padding: const EdgeInsets.all(JanaSpacing.sm),
      color: isListening ? JanaColors.softBlue : Colors.transparent,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isListening) const Expanded(child: Center(child: Text("Listening...", style: TextStyle(color: JanaColors.primaryTeal)))),
          if (isProcessing) const Center(child: CircularProgressIndicator()),
          if (!isProcessing)
            GestureDetector(
              onTap: onMicTap,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: isListening ? 80 : 60,
                height: isListening ? 80 : 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isListening ? JanaColors.errorRed : JanaColors.primaryTeal,
                  boxShadow: [
                    if (isListening)
                      BoxShadow(
                        color: JanaColors.errorRed.withOpacity(0.4),
                        blurRadius: 20,
                        spreadRadius: 5,
                      )
                  ],
                ),
                child: Icon(
                  isListening ? Icons.stop : Icons.mic,
                  color: Colors.white,
                  size: isListening ? 40 : 30,
                ),
              ),
            ),
          if (isListening) const Expanded(child: SizedBox()), // spacer for symmetry
        ],
      ),
    );
  }
}

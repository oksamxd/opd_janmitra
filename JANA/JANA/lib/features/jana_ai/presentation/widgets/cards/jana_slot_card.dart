import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaSlotCard extends StatefulWidget {
  final Map<String, dynamic> payload;
  final Function(String)? onSendMessage;

  const JanaSlotCard({
    Key? key,
    required this.payload,
    this.onSendMessage,
  }) : super(key: key);

  @override
  State<JanaSlotCard> createState() => _JanaSlotCardState();
}

class _JanaSlotCardState extends State<JanaSlotCard> {
  String? _selectedSlotValue;

  @override
  Widget build(BuildContext context) {
    // Attempt to extract options array
    final List<dynamic> rawOptions = widget.payload['options'] ?? [];
    final List<Map<String, String>> slots = rawOptions.map((o) => {
      'label': o['label']?.toString() ?? '10:00 AM',
      'value': o['value']?.toString() ?? '10:00 AM',
    }).toList();

    // Fallback if empty (e.g. for preview/testing)
    if (slots.isEmpty) {
      slots.addAll([
        {'label': '10:00 AM', 'value': '10:00 AM'},
        {'label': '10:30 AM', 'value': '10:30 AM'},
        {'label': '11:00 AM', 'value': '11:00 AM'},
        {'label': '02:00 PM', 'value': '02:00 PM'},
        {'label': '04:30 PM', 'value': '04:30 PM'},
      ]);
    }

    // Try to get a date string from payload, fallback to generic
    String dateStr = 'Pick a suitable time';
    if (widget.payload['data'] != null && widget.payload['data']['slots'] != null) {
      final List<dynamic> dataSlots = widget.payload['data']['slots'];
      if (dataSlots.isNotEmpty && dataSlots[0]['time'] != null) {
        try {
          final d = DateTime.parse(dataSlots[0]['time'].toString());
          dateStr = '${d.day}/${d.month}/${d.year}';
        } catch (_) {}
      }
    }

    return Container(
      width: 280,
      padding: const EdgeInsets.all(JanaSpacing.md),
      decoration: BoxDecoration(
        color: JanaColors.cardBackground,
        borderRadius: JanaRadius.card,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Select Time Slot', style: JanaTextStyles.header2),
          const SizedBox(height: JanaSpacing.xs),
          Text(dateStr, style: JanaTextStyles.caption),
          const SizedBox(height: JanaSpacing.md),
          Wrap(
            spacing: JanaSpacing.sm,
            runSpacing: JanaSpacing.sm,
            children: slots.map((slot) {
              final isSelected = _selectedSlotValue == slot['value'];
              return ChoiceChip(
                label: Text(slot['label']!),
                selected: isSelected,
                onSelected: (selected) {
                  setState(() {
                    _selectedSlotValue = selected ? slot['value'] : null;
                  });
                },
                selectedColor: JanaColors.softBlue,
              );
            }).toList(),
          ),
          const SizedBox(height: JanaSpacing.md),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: _selectedSlotValue != null ? JanaColors.primaryTeal : Colors.grey.shade400,
              ),
              onPressed: _selectedSlotValue != null
                  ? () {
                      widget.onSendMessage?.call(_selectedSlotValue!);
                    }
                  : null, 
              child: const Text('Confirm', style: TextStyle(color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}

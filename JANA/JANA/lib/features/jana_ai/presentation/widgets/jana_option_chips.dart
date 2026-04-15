import 'package:flutter/material.dart';
import '../../application/jana_ai_controller.dart';
import '../theme/jana_colors.dart';

/// Renders selectable option chips below the last message.
/// Supports: options, doctors, slots, date picker.
class JanaOptionChips extends StatelessWidget {
  final List<JanaOption> options;
  final String type;
  final void Function(JanaOption) onSelect;
  final void Function(DateTime)? onDateSelected;

  const JanaOptionChips({
    Key? key,
    required this.options,
    required this.type,
    required this.onSelect,
    this.onDateSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (type == 'date') {
      return _buildDatePicker(context);
    }
    return _buildChips(context);
  }

  Widget _buildChips(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: options.map((opt) => _OptionChip(option: opt, onTap: onSelect, type: type)).toList(),
      ),
    );
  }

  Widget _buildDatePicker(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
      child: ElevatedButton.icon(
        onPressed: () async {
          final now = DateTime.now();
          final picked = await showDatePicker(
            context: context,
            initialDate: now.add(const Duration(days: 1)),
            firstDate: now,
            lastDate: now.add(const Duration(days: 90)),
            helpText: 'Select appointment date',
            builder: (ctx, child) => Theme(
              data: Theme.of(ctx).copyWith(
                colorScheme: const ColorScheme.dark(
                  primary: Color(0xFF00C9A7),
                  surface: Color(0xFF1E293B),
                ),
              ),
              child: child!,
            ),
          );
          if (picked != null && onDateSelected != null) {
            onDateSelected!(picked);
          }
        },
        icon: const Icon(Icons.calendar_today_rounded, size: 18),
        label: const Text('Pick a Date'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF00C9A7),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}

class _OptionChip extends StatefulWidget {
  final JanaOption option;
  final void Function(JanaOption) onTap;
  final String type;

  const _OptionChip({required this.option, required this.onTap, required this.type});

  @override
  State<_OptionChip> createState() => _OptionChipState();
}

class _OptionChipState extends State<_OptionChip> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final isDoctor = widget.type == 'doctors';
    final isSlot = widget.type == 'slots';

    if (isDoctor) return _buildDoctorCard();
    if (isSlot) return _buildSlotCard();
    return _buildSimpleChip();
  }

  Widget _buildSimpleChip() {
    return InkWell(
      onTap: _loading ? null : () {
        setState(() => _loading = true);
        widget.onTap(widget.option);
      },
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: _loading ? const Color(0xFF00C9A7) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFF00C9A7), width: 1.5),
        ),
        child: _loading
            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(
                widget.option.label,
                style: TextStyle(
                  color: _loading ? Colors.white : const Color(0xFF00C9A7),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
      ),
    );
  }

  Widget _buildDoctorCard() {
    return InkWell(
      onTap: _loading ? null : () {
        setState(() => _loading = true);
        widget.onTap(widget.option);
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 200,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF00C9A7).withOpacity(0.5), width: 1.5),
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: const Color(0xFF00C9A7).withOpacity(0.2),
              child: const Icon(Icons.local_hospital_rounded, color: Color(0xFF00C9A7), size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.option.label.split('—').first.trim(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13), overflow: TextOverflow.ellipsis),
                  if (widget.option.label.contains('—'))
                    Text(widget.option.label.split('—').last.trim(),
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                ],
              ),
            ),
            if (_loading) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00C9A7))),
          ],
        ),
      ),
    );
  }

  Widget _buildSlotCard() {
    return InkWell(
      onTap: _loading ? null : () {
        setState(() => _loading = true);
        widget.onTap(widget.option);
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _loading ? const Color(0xFF00C9A7) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF00C9A7), width: 1.2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.access_time_rounded, size: 15, color: _loading ? Colors.white : const Color(0xFF00C9A7)),
            const SizedBox(width: 6),
            Text(widget.option.label, style: TextStyle(color: _loading ? Colors.white : Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

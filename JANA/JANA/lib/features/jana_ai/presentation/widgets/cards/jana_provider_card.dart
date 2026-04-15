import 'package:flutter/material.dart';
import '../../theme/jana_colors.dart';
import '../../theme/jana_radius.dart';
import '../../theme/jana_spacing.dart';
import '../../theme/jana_text_styles.dart';

class JanaProviderCard extends StatelessWidget {
  final Map<String, dynamic> payload;
  final Function(String)? onSendMessage;

  const JanaProviderCard({
    Key? key,
    required this.payload,
    this.onSendMessage,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final data = payload['data'] ?? {};
    final List<dynamic> doctors = data['doctors'] ?? [payload];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: doctors.map((doc) {
        final nameStr = doc['name'] != null ? doc['name'].toString() : 'Smith';
        final name = nameStr.startsWith('Dr.') ? nameStr : 'Dr. $nameStr';
        final specialty = doc['specialty'] ?? payload['specialty'] ?? 'General Physician';
        final mode = doc['mode'] ?? 'Video Consult';
        final distance = doc['distance'] ?? '2.5 km';
        final fee = doc['fee'] ?? '\$50';
        final rating = doc['rating'] ?? '4.8';
        final doctorId = doc['id'] ?? doc['value'] ?? doc['associate_id'] ?? name;

        return Container(
          width: 280,
          margin: const EdgeInsets.only(bottom: JanaSpacing.md),
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
              Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: JanaColors.softBlue,
                    child: Icon(Icons.person, color: JanaColors.primaryTeal),
                  ),
                  const SizedBox(width: JanaSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: JanaTextStyles.header2),
                        Text(specialty, style: JanaTextStyles.caption),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      const Icon(Icons.star, color: JanaColors.warningLevel1, size: 16),
                      Text(rating, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: JanaSpacing.md),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(mode, style: JanaTextStyles.caption.copyWith(color: JanaColors.primaryTeal)),
                  Text(distance, style: JanaTextStyles.caption),
                  Text(fee, style: JanaTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: JanaSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {},
                      child: const Text('View Slots'),
                    ),
                  ),
                  const SizedBox(width: JanaSpacing.sm),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: JanaColors.primaryTeal),
                      onPressed: () {
                        onSendMessage?.call(doctorId.toString());
                      },
                      child: const Text('Select', style: TextStyle(color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

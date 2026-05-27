enum JanaMessageType {
  text,
  transcript,
  quickReplies,
  providerCard,
  slotCard,
  caseProgress,
  confirmation,
  documentCard,
  alertCard,
  taskCard,
  janmitra,
  milestone,
}

class JanaMessage {
  final String id;
  final String sender;
  final JanaMessageType type;
  final String text;
  final DateTime createdAt;
  final Map<String, dynamic> payload;

  const JanaMessage({
    required this.id,
    required this.sender,
    required this.type,
    required this.text,
    required this.createdAt,
    this.payload = const {},
  });

  factory JanaMessage.fromJson(Map<String, dynamic> json) {
    return JanaMessage(
      id: json['id'] as String,
      sender: json['sender'] as String,
      type: JanaMessageType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => JanaMessageType.text,
      ),
      text: json['text'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
      payload: json['payload'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender': sender,
      'type': type.name,
      'text': text,
      'createdAt': createdAt.toIso8601String(),
      'payload': payload,
    };
  }
}

import 'package:flutter/material.dart';
import 'dart:convert';
import '../domain/models/jana_message.dart';

class JanaAiRepository {
  /// Simulates parsing a structured JSON payload from backend
  JanaMessage parseBackendResponse(String jsonString) {
    final data = json.decode(jsonString);
    // Real implementation would extract messages and generate domains
    return JanaMessage.fromJson(data);
  }
}

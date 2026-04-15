import 'package:flutter/material.dart';
import 'jana_colors.dart';

class JanaTextStyles {
  static const TextStyle header1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: JanaColors.darkText,
  );
  
  static const TextStyle header2 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: JanaColors.darkText,
  );

  static const TextStyle body = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.normal,
    color: JanaColors.darkText,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    color: JanaColors.lightText,
  );

  static const TextStyle actionButton = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: Colors.white,
  );
}

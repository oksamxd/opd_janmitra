import 'package:flutter/material.dart';

class JanaRadius {
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;

  static BorderRadius get card => BorderRadius.circular(md);
  
  static BorderRadius get bubbleLevelLeft => const BorderRadius.only(
        topLeft: Radius.circular(lg),
        topRight: Radius.circular(lg),
        bottomRight: Radius.circular(lg),
        bottomLeft: Radius.circular(0),
      );
      
  static BorderRadius get bubbleLevelRight => const BorderRadius.only(
        topLeft: Radius.circular(lg),
        topRight: Radius.circular(lg),
        bottomLeft: Radius.circular(lg),
        bottomRight: Radius.circular(0),
      );
}

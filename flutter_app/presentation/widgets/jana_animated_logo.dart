import 'package:flutter/material.dart';
import '../theme/jana_colors.dart';

class JanaAnimatedLogo extends StatefulWidget {
  final double size;
  final bool animated;

  const JanaAnimatedLogo({
    Key? key,
    this.size = 40,
    this.animated = true,
  }) : super(key: key);

  @override
  State<JanaAnimatedLogo> createState() => _JanaAnimatedLogoState();
}

class _JanaAnimatedLogoState extends State<JanaAnimatedLogo>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    _glowAnimation = Tween<double>(begin: 4.0, end: 12.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    if (widget.animated) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.size * _scaleAnimation.value,
          height: widget.size * _scaleAnimation.value,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: JanaColors.primaryTeal.withOpacity(0.4),
                blurRadius: _glowAnimation.value,
                spreadRadius: _glowAnimation.value / 2,
              ),
            ],
          ),
          child: ClipOval(
            child: Image.asset(
              'assets/images/jana_logo.png',
              fit: BoxFit.cover,
            ),
          ),
        );
      },
    );
  }
}

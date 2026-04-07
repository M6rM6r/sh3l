import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Advanced Animation Utilities for Ygy Mobile App
/// Provides micro-animations, transitions, and polished UI effects

class AnimationUtils {
  static const Duration quickDuration = Duration(milliseconds: 150);
  static const Duration normalDuration = Duration(milliseconds: 300);
  static const Duration slowDuration = Duration(milliseconds: 500);
  
  // Easing curves for different animation types
  static const Curve standardCurve = Curves.easeInOutCubic;
  static const Curve entranceCurve = Curves.easeOutCubic;
  static const Curve exitCurve = Curves.easeInCubic;
  static const Curve bounceCurve = Curves.elasticOut;
  static const Curve snapCurve = Curves.fastOutSlowIn;

  /// Button press animation with haptic feedback
  static Widget buttonPressAnimation({
    required Widget child,
    required VoidCallback onTap,
    double scaleDown = 0.95,
    Duration duration = quickDuration,
  }) {
    return AnimatedButton(
      onTap: onTap,
      scaleDown: scaleDown,
      duration: duration,
      child: child,
    );
  }

  /// Streak flame animation
  static Widget streakFlame({
    required int streak,
    required Widget child,
  }) {
    return StreakFlameAnimation(
      streak: streak,
      child: child,
    );
  }

  /// Achievement unlock confetti
  static Widget achievementUnlock({
    required bool isUnlocked,
    required Widget child,
    VoidCallback? onComplete,
  }) {
    return AchievementUnlockAnimation(
      isUnlocked: isUnlocked,
      onComplete: onComplete,
      child: child,
    );
  }

  /// Score counter animation
  static Widget scoreCounter({
    required int score,
    required Widget child,
  }) {
    return ScoreCounterAnimation(
      score: score,
      child: child,
    );
  }

  /// Game card entrance animation
  static Widget gameCardEntrance({
    required int index,
    required Widget child,
  }) {
    return GameCardEntranceAnimation(
      index: index,
      child: child,
    );
  }

  /// Brain pulse animation for home screen
  static Widget brainPulse({
    required Widget child,
  }) {
    return BrainPulseAnimation(child: child);
  }

  /// Success feedback animation
  static Widget successFeedback({
    required bool show,
    required Widget child,
  }) {
    return SuccessFeedbackAnimation(
      show: show,
      child: child,
    );
  }

  /// Error shake animation
  static Widget errorShake({
    required bool trigger,
    required Widget child,
  }) {
    return ErrorShakeAnimation(
      trigger: trigger,
      child: child,
    );
  }

  /// Page transition slide
  static PageRouteBuilder slideTransition({
    required Widget page,
    SlideDirection direction = SlideDirection.right,
  }) {
    return PageRouteBuilder(
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        var begin = _getOffset(direction);
        const end = Offset.zero;
        const curve = standardCurve;

        var tween = Tween(begin: begin, end: end).chain(CurveTween(curve: curve));
        var offsetAnimation = animation.drive(tween);

        return SlideTransition(
          position: offsetAnimation,
          child: child,
        );
      },
    );
  }

  static Offset _getOffset(SlideDirection direction) {
    switch (direction) {
      case SlideDirection.right:
        return const Offset(1.0, 0.0);
      case SlideDirection.left:
        return const Offset(-1.0, 0.0);
      case SlideDirection.up:
        return const Offset(0.0, 1.0);
      case SlideDirection.down:
        return const Offset(0.0, -1.0);
    }
  }

  /// Fade and scale transition
  static Widget fadeScaleTransition({
    required Animation<double> animation,
    required Widget child,
  }) {
    return FadeTransition(
      opacity: animation,
      child: ScaleTransition(
        scale: Tween<double>(begin: 0.8, end: 1.0).animate(
          CurvedAnimation(
            parent: animation,
            curve: entranceCurve,
          ),
        ),
        child: child,
      ),
    );
  }
}

enum SlideDirection { right, left, up, down }

// Animated Button Widget
class AnimatedButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final double scaleDown;
  final Duration duration;

  const AnimatedButton({
    Key? key,
    required this.child,
    required this.onTap,
    this.scaleDown = 0.95,
    this.duration = AnimationUtils.quickDuration,
  }) : super(key: key);

  @override
  _AnimatedButtonState createState() => _AnimatedButtonState();
}

class _AnimatedButtonState extends State<AnimatedButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.duration,
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: widget.scaleDown,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: AnimationUtils.standardCurve,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails details) {
    _controller.forward();
    HapticFeedback.lightImpact();
  }

  void _handleTapUp(TapUpDetails details) {
    _controller.reverse();
    widget.onTap();
  }

  void _handleTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: widget.child,
      ),
    );
  }
}

// Streak Flame Animation
class StreakFlameAnimation extends StatefulWidget {
  final int streak;
  final Widget child;

  const StreakFlameAnimation({
    Key? key,
    required this.streak,
    required this.child,
  }) : super(key: key);

  @override
  _StreakFlameAnimationState createState() => _StreakFlameAnimationState();
}

class _StreakFlameAnimationState extends State<StreakFlameAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    _rotationAnimation = Tween<double>(begin: -0.05, end: 0.05).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.streak < 3) {
      return widget.child;
    }

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Transform.rotate(
            angle: _rotationAnimation.value,
            child: Stack(
              children: [
                widget.child,
                if (widget.streak >= 5)
                  Positioned(
                    top: -5,
                    right: -5,
                    child: Icon(
                      Icons.local_fire_department,
                      color: Colors.orange,
                      size: 20 + (widget.streak * 0.5),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// Achievement Unlock Animation
class AchievementUnlockAnimation extends StatefulWidget {
  final bool isUnlocked;
  final Widget child;
  final VoidCallback? onComplete;

  const AchievementUnlockAnimation({
    Key? key,
    required this.isUnlocked,
    required this.child,
    this.onComplete,
  }) : super(key: key);

  @override
  _AchievementUnlockAnimationState createState() =>
      _AchievementUnlockAnimationState();
}

class _AchievementUnlockAnimationState extends State<AchievementUnlockAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.0, end: 1.5).animate(
      CurvedAnimation(
        parent: _controller,
        curve: AnimationUtils.bounceCurve,
      ),
    );

    _opacityAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.5, 1.0, curve: Curves.easeOut),
      ),
    );

    if (widget.isUnlocked) {
      _playAnimation();
    }
  }

  @override
  void didUpdateWidget(AchievementUnlockAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isUnlocked && !oldWidget.isUnlocked) {
      _playAnimation();
    }
  }

  void _playAnimation() {
    _controller.forward().then((_) {
      _controller.reset();
      widget.onComplete?.call();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (widget.isUnlocked)
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Opacity(
                opacity: _opacityAnimation.value,
                child: Transform.scale(
                  scale: _scaleAnimation.value,
                  child: const Icon(
                    Icons.emoji_events,
                    color: Colors.amber,
                    size: 100,
                  ),
                ),
              );
            },
          ),
      ],
    );
  }
}

// Score Counter Animation
class ScoreCounterAnimation extends StatefulWidget {
  final int score;
  final Widget child;

  const ScoreCounterAnimation({
    Key? key,
    required this.score,
    required this.child,
  }) : super(key: key);

  @override
  _ScoreCounterAnimationState createState() => _ScoreCounterAnimationState();
}

class _ScoreCounterAnimationState extends State<ScoreCounterAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<int> _scoreAnimation;
  int _previousScore = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _updateAnimation();
  }

  @override
  void didUpdateWidget(ScoreCounterAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.score != oldWidget.score) {
      _previousScore = oldWidget.score;
      _updateAnimation();
      _controller.forward(from: 0);
    }
  }

  void _updateAnimation() {
    _scoreAnimation = IntTween(
      begin: _previousScore,
      end: widget.score,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: AnimationUtils.standardCurve,
      ),
    );
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
        return Text(
          '${_scoreAnimation.value}',
          style: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: Color(0xFF6c63ff),
          ),
        );
      },
    );
  }
}

// Game Card Entrance Animation
class GameCardEntranceAnimation extends StatelessWidget {
  final int index;
  final Widget child;

  const GameCardEntranceAnimation({
    Key? key,
    required this.index,
    required this.child,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 400 + (index * 100)),
      curve: AnimationUtils.entranceCurve,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 30 * (1 - value)),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}

// Brain Pulse Animation
class BrainPulseAnimation extends StatefulWidget {
  final Widget child;

  const BrainPulseAnimation({Key? key, required this.child}) : super(key: key);

  @override
  _BrainPulseAnimationState createState() => _BrainPulseAnimationState();
}

class _BrainPulseAnimationState extends State<BrainPulseAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    _glowAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );
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
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Color(0xFF6c63ff).withOpacity(0.3 * _glowAnimation.value),
                  blurRadius: 30 * _glowAnimation.value,
                  spreadRadius: 10 * _glowAnimation.value,
                ),
              ],
            ),
            child: widget.child,
          ),
        );
      },
    );
  }
}

// Success Feedback Animation
class SuccessFeedbackAnimation extends StatefulWidget {
  final bool show;
  final Widget child;

  const SuccessFeedbackAnimation({
    Key? key,
    required this.show,
    required this.child,
  }) : super(key: key);

  @override
  _SuccessFeedbackAnimationState createState() =>
      _SuccessFeedbackAnimationState();
}

class _SuccessFeedbackAnimationState extends State<SuccessFeedbackAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: AnimationUtils.quickDuration,
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(
        parent: _controller,
        curve: AnimationUtils.bounceCurve,
      ),
    );

    if (widget.show) {
      _controller.forward();
    }
  }

  @override
  void didUpdateWidget(SuccessFeedbackAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.show && !oldWidget.show) {
      _controller.forward(from: 0);
    } else if (!widget.show && oldWidget.show) {
      _controller.reverse();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: widget.child,
    );
  }
}

// Error Shake Animation
class ErrorShakeAnimation extends StatefulWidget {
  final bool trigger;
  final Widget child;

  const ErrorShakeAnimation({
    Key? key,
    required this.trigger,
    required this.child,
  }) : super(key: key);

  @override
  _ErrorShakeAnimationState createState() => _ErrorShakeAnimationState();
}

class _ErrorShakeAnimationState extends State<ErrorShakeAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _offsetAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    _offsetAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -10.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -10.0, end: 10.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 10.0, end: -10.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -10.0, end: 10.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 10.0, end: 0.0), weight: 1),
    ]).animate(_controller);

    if (widget.trigger) {
      _controller.forward();
    }
  }

  @override
  void didUpdateWidget(ErrorShakeAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.trigger && !oldWidget.trigger) {
      HapticFeedback.vibrate();
      _controller.forward(from: 0);
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
      animation: _offsetAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(_offsetAnimation.value, 0),
          child: widget.child,
        );
      },
    );
  }
}

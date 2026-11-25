import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/routes/app_routes.dart';
import '../../core/services/session_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  // Swipe slider state
  double _dragPosition = 0.0;
  bool _isCompleted = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Colors.transparent,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOutCubic,
    );
    _fadeController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _onSwipeComplete() async {
    if (_isCompleted) return;
    setState(() {
      _isCompleted = true;
    });
    final isLoggedIn = await SessionService().isLoggedIn();
    if (!mounted) return;
    if (isLoggedIn) {
      Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
    } else {
      Navigator.pushReplacementNamed(context, AppRoutes.start);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final screenHeight = mediaQuery.size.height;
    final screenWidth = mediaQuery.size.width;

    if (screenWidth <= 0 || screenHeight <= 0) {
      return const Scaffold(backgroundColor: Color(0xFF0D5E79));
    }

    // Proportional dimensions directly calibrated against Figma node 10:57 (388 x 990 frame)
    final double safeTop = mediaQuery.padding.top > 0
        ? mediaQuery.padding.top + 16.0
        : 62.0;

    // Doctor photo illustration: spans full width (388 on 388 frame) with aspect ratio 587/714 (~0.822)
    final double doctorWidth = screenWidth;
    final double doctorHeight = doctorWidth / (587.0 / 714.0);
    // In Figma, doctor top is at 146px (offset 52px below Doctor App header)
    final double doctorTop = safeTop + 52.0;

    // CareID Badge: in Figma width is 268px on 388px frame (ratio 0.6907), aspect ratio 1536/1024 (1.5)
    final double badgeWidth = (screenWidth * 0.6907).clamp(240.0, 320.0);
    final double badgeHeight = badgeWidth / 1.5;
    // In Figma, badge top is at 528px (doctorTop + doctorHeight * 0.8093)
    final double badgeTop = doctorTop + (doctorHeight * 0.8093);
    final double badgeLeft = (screenWidth - badgeWidth) / 2;

    // Slider: in Figma, bottom is at 116px on 990px frame (Node 10:66)
    final double sliderBottom = (screenHeight * (116.0 / 990.0)).clamp(
      mediaQuery.padding.bottom + 60.0,
      150.0,
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0D5E79),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Exact fluid background image with teal-to-mint curves (Node 10:61)
          Positioned.fill(
            child: Image.asset(
              'assets/images/splash_background.png',
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
            ),
          ),

          // 2. Animated Content Overlay
          FadeTransition(
            opacity: _fadeAnimation,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Doctor Photo Illustration (Node 10:62)
                Positioned(
                  top: doctorTop,
                  left: 0,
                  width: doctorWidth,
                  height: doctorHeight,
                  child: Image.asset(
                    'assets/images/splash_doctor.png',
                    fit: BoxFit.contain,
                    alignment: Alignment.topCenter,
                  ),
                ),

                // 3D CareID Cloud Logo Badge Overlay (Node 10:65)
                Positioned(
                  top: badgeTop,
                  left: badgeLeft,
                  width: badgeWidth,
                  height: badgeHeight,
                  child: Image.asset(
                    'assets/images/splash_careid_badge.png',
                    fit: BoxFit.contain,
                  ),
                ),

                // Bottom Action: Interactive "Swipe to start" Slider (Node 10:66)
                Positioned(
                  left: 19.0,
                  right: 19.0,
                  bottom: sliderBottom,
                  child: _buildSwipeSlider(screenWidth - 38.0),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSwipeSlider(double totalWidth) {
    // Exact Figma specifications: h: 54px, rounded: 22px (Figma Node 10:66)
    const double sliderHeight = 54.0;
    // Thumb: 40px circle vertically centered (top: (54 - 40) / 2 = 7px) with 2px inset on left
    const double thumbSize = 40.0;
    const double paddingX = 2.0;
    const double paddingY = (sliderHeight - thumbSize) / 2; // 7.0px
    final double rawMaxDrag = totalWidth - thumbSize - (paddingX * 2);
    final double maxDrag = rawMaxDrag > 0 ? rawMaxDrag : 0.0;

    return Container(
      width: totalWidth,
      height: sliderHeight,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22.0),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            Color(0xFFA44CFF), // #a44cff
            Color(0xFF7F7CF0), // #7f7cf0
            Color(0xFFCFCDF8), // #cfcdf8
          ],
          stops: [0.0, 0.55, 1.0],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x337F7CF0),
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22.0),
          onTap: _onSwipeComplete,
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // Centered label "Swipe to start" (Node 10:70)
              Center(
                child: Text(
                  'Swipe to start',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                    letterSpacing: 0.1,
                  ),
                ),
              ),

              // Draggable Thumb Button (Node 10:67, 10:68)
              Positioned(
                left:
                    paddingX +
                    (maxDrag > 0 ? _dragPosition.clamp(0.0, maxDrag) : 0.0),
                top: paddingY,
                child: GestureDetector(
                  onHorizontalDragUpdate: (details) {
                    setState(() {
                      _dragPosition += details.delta.dx;
                      if (_dragPosition < 0) _dragPosition = 0;
                      if (_dragPosition > maxDrag) _dragPosition = maxDrag;
                    });
                  },
                  onHorizontalDragEnd: (details) {
                    if (_dragPosition >= maxDrag * 0.55) {
                      setState(() {
                        _dragPosition = maxDrag;
                      });
                      _onSwipeComplete();
                    } else {
                      setState(() {
                        _dragPosition = 0.0;
                      });
                    }
                  },
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(
                        color: const Color(0xFF6B63E8),
                        width: 1.0,
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x26000000),
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        '››',
                        style: GoogleFonts.poppins(
                          color: const Color(0xFF3A34C9),
                          fontSize: 20,
                          fontWeight: FontWeight.w400,
                          letterSpacing: -2.0,
                          height: 1.0,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

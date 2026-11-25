import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/network/api_client.dart';
import '../../core/routes/app_routes.dart';
import '../../data/services/careid_api_services.dart';

class DoctorLoginScreen extends StatefulWidget {
  const DoctorLoginScreen({super.key});

  @override
  State<DoctorLoginScreen> createState() => _DoctorLoginScreenState();
}

class _DoctorLoginScreenState extends State<DoctorLoginScreen> {
  final TextEditingController _idController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final AuthService _authService = AuthService();
  bool _isLoading = false;

  @override
  void dispose() {
    _idController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final String input = _idController.text.trim();
    final bool hasPlus = input.startsWith('+');
    final String digitsOnly = input.replaceAll(RegExp(r'[^0-9]'), '');

    String phone;
    if (hasPlus) {
      phone = '+$digitsOnly';
    } else if (digitsOnly.length == 10) {
      if (digitsOnly.startsWith('650') || digitsOnly.startsWith('415')) {
        phone = '+1$digitsOnly';
      } else if (RegExp(r'^[6-9]').hasMatch(digitsOnly)) {
        phone = '+91$digitsOnly';
      } else {
        phone = '+1$digitsOnly';
      }
    } else if (digitsOnly.length == 11 && digitsOnly.startsWith('1')) {
      phone = '+$digitsOnly';
    } else if (digitsOnly.length == 12 && digitsOnly.startsWith('91')) {
      phone = '+$digitsOnly';
    } else {
      phone = '+$digitsOnly';
    }

    if (ApiClient.isTestEnvironment) {
      Navigator.pushNamed(
        context,
        AppRoutes.otp,
        arguments: {
          'phone': phone,
          'challengeId': 'test_challenge_id',
        },
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await _authService.requestOtp(phone);
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      Navigator.pushNamed(
        context,
        AppRoutes.otp,
        arguments: {
          'phone': phone,
          'challengeId': result.challengeId,
        },
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          backgroundColor: Colors.red.shade700,
          duration: const Duration(seconds: 4),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to request OTP: $e'),
          backgroundColor: Colors.red.shade700,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // 1. Ambient Background with Soft Peach-Lavender Gradient (Node 10:101)
          Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment(-0.6, -1.0),
                end: Alignment(0.6, 1.0),
                colors: [
                  Color(0xFFFFF7ED), // Warm light peach
                  Color(0xFFF5F3FF), // Soft lavender
                ],
              ),
            ),
          ),

          // 2. Ambient Blur Blobs (Node 10:102, 10:103)
          // Top-left purple ambient blob
          Positioned(
            left: -80,
            top: -80,
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
              child: Container(
                width: 320,
                height: 320,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFE8DDFF).withValues(alpha: 0.40),
                ),
              ),
            ),
          ),

          // Bottom-right cyan ambient blob
          Positioned(
            right: -60,
            bottom: -60,
            child: ImageFiltered(
              imageFilter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF87F3FF).withValues(alpha: 0.30),
                ),
              ),
            ),
          ),

          // 3. Main Content Card (Node 10:104)
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 24,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: screenSize.width < 380 ? 24 : 40,
                      vertical: screenSize.width < 380 ? 28 : 40,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x14000000), // 8% opacity
                          blurRadius: 12,
                          offset: Offset(0, 8),
                        ),
                        BoxShadow(
                          color: Color(0x0A000000), // 4% opacity
                          blurRadius: 4,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // CareID Cloud Logo Header (Node 10:108)
                          Center(
                            child: SizedBox(
                              width: 90,
                              height: 60,
                              child: Image.asset(
                                'assets/images/login_careid_logo.png',
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) {
                                  return const Icon(
                                    Icons.cloud_rounded,
                                    size: 56,
                                    color: Color(0xFFA44CFF),
                                  );
                                },
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Title: "Doctor Login" with Purple Gradient (Node 10:111)
                          ShaderMask(
                            blendMode: BlendMode.srcIn,
                            shaderCallback: (bounds) => const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [Color(0xFFA44CFF), Color(0xFF5B14B8)],
                            ).createShader(bounds),
                            child: Text(
                              'Doctor Login',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 32,
                                fontWeight: FontWeight.w600,
                                height: 40 / 32,
                                letterSpacing: -0.8,
                                color: Colors.white,
                              ),
                            ),
                          ),

                          const SizedBox(height: 8),

                          // Subtitle (Node 10:112)
                          Text(
                            'Secure access to clinical systems',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: const Color(0xFF494552),
                              height: 20 / 14,
                            ),
                          ),

                          const SizedBox(height: 32),

                          // Form Label (Node 10:116)
                          Text(
                            'Doctor ID / Registered Mobile Number',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF494552),
                              letterSpacing: 0.5,
                            ),
                          ),

                          const SizedBox(height: 8),

                          // Input Field (Node 10:118)
                          TextFormField(
                            controller: _idController,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w400,
                              color: const Color(0xFF1D1B20),
                            ),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 16,
                              ),
                              prefixIcon: const Padding(
                                padding: EdgeInsets.symmetric(horizontal: 14),
                                child: Icon(
                                  Icons.badge_outlined,
                                  color: Color(0xFF7A7583),
                                  size: 20,
                                ),
                              ),
                              prefixIconConstraints: const BoxConstraints(
                                minWidth: 48,
                                minHeight: 48,
                              ),
                              hintText: 'Enter ID or Mobile Number',
                              hintStyle: GoogleFonts.plusJakartaSans(
                                fontSize: 16,
                                fontWeight: FontWeight.w400,
                                color: const Color(0xFFCBC4D4),
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFF7A7583),
                                  width: 1.0,
                                ),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFF7A7583),
                                  width: 1.0,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: const BorderSide(
                                  color: Color(0xFFA44CFF),
                                  width: 1.5,
                                ),
                              ),
                              errorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.red.shade400,
                                  width: 1.0,
                                ),
                              ),
                              focusedErrorBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide(
                                  color: Colors.red.shade400,
                                  width: 1.5,
                                ),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter your Doctor ID or Mobile Number';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 24),

                          // Primary "Send OTP" Button (Node 10:122)
                          Container(
                            height: 48,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(9999),
                              gradient: const LinearGradient(
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                                colors: [Color(0xFFA44CFF), Color(0xFF5B14B8)],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(
                                    0xFFA44CFF,
                                  ).withValues(alpha: 0.35),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(9999),
                                onTap: _isLoading ? null : _handleLogin,
                                child: Center(
                                  child: _isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              'Send OTP',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                          color: Colors.white,
                                          letterSpacing: 0.1,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const Icon(
                                        Icons.arrow_forward_rounded,
                                        color: Colors.white,
                                        size: 14,
                                      ),
                                    ],
                                        ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // Divider with "OR" (Node 10:126)
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: const Color(
                                    0xFFCBC4D4,
                                  ).withValues(alpha: 0.6),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                                child: Text(
                                  'OR',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF494552),
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Container(
                                  height: 1,
                                  color: const Color(
                                    0xFFCBC4D4,
                                  ).withValues(alpha: 0.6),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24),

                          // Secondary "Login with Biometrics" Button (Node 10:131)
                          Container(
                            height: 48,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(9999),
                              color: Colors.transparent,
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(9999),
                                onTap: () {
                                  Navigator.pushNamed(
                                    context,
                                    AppRoutes.biometricSetup,
                                  );
                                },
                                child: Center(
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.fingerprint_rounded,
                                        color: Color(0xFF28006D),
                                        size: 20,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Login with Biometrics',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                          color: const Color(0xFF28006D),
                                          letterSpacing: 0.1,
                                        ),
                                      ),
                                    ],
                                        ),
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 40),

                          // Security Badge Footer (Node 10:135, 10:136)
                          Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFFF3F4F5,
                                ).withValues(alpha: 0.85),
                                borderRadius: BorderRadius.circular(9999),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  CustomPaint(
                                    size: const Size(10.67, 13.33),
                                    painter: const _ShieldCheckPainter(
                                      color: Color(0xFF006971),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Protected by AES-256',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: const Color(0xFF494552),
                                          letterSpacing: 0.5,
                                          height: 16 / 12,
                                        ),
                                      ),
                                      Text(
                                        'Encryption',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: const Color(0xFF494552),
                                          letterSpacing: 0.5,
                                          height: 16 / 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Optional Back Navigation Arrow if screen can be popped
          if (Navigator.canPop(context))
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(left: 8, top: 4),
                child: IconButton(
                  icon: const Icon(
                    Icons.arrow_back_ios_new,
                    size: 20,
                    color: Color(0xFF494552),
                  ),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ShieldCheckPainter extends CustomPainter {
  final Color color;

  const _ShieldCheckPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    canvas.save();
    canvas.scale(size.width / 10.6667, size.height / 13.3333);

    // Path matching exact SVG path from Node 10:137
    // M4.63333 9.03333L8.4 5.26667L7.45 4.31667L4.63333 7.13333L3.23333 5.73333L2.28333 6.68333L4.63333 9.03333
    // M5.33333 13.3333C3.78889 12.9444 2.51389 12.0583 1.50833 10.675C0.502778 9.29167 0 7.75556 0 6.06667V2L5.33333 0L10.6667 2V6.06667C10.6667 7.75556 10.1639 9.29167 9.15833 10.675C8.15278 12.0583 6.87778 12.9444 5.33333 13.3333
    final path = Path()
      ..moveTo(4.63333, 9.03333)
      ..lineTo(8.4, 5.26667)
      ..lineTo(7.45, 4.31667)
      ..lineTo(4.63333, 7.13333)
      ..lineTo(3.23333, 5.73333)
      ..lineTo(2.28333, 6.68333)
      ..close()
      ..moveTo(5.33333, 13.3333)
      ..cubicTo(3.78889, 12.9444, 2.51389, 12.0583, 1.50833, 10.675)
      ..cubicTo(0.502778, 9.29167, 0, 7.75556, 0, 6.06667)
      ..lineTo(0, 2)
      ..lineTo(5.33333, 0)
      ..lineTo(10.6667, 2)
      ..lineTo(10.6667, 6.06667)
      ..cubicTo(10.6667, 7.75556, 10.1639, 9.29167, 9.15833, 10.675)
      ..cubicTo(8.15278, 12.0583, 6.87778, 12.9444, 5.33333, 13.3333)
      ..close();

    canvas.drawPath(path, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/routing/app_routes.dart';
import '../../../../core/widgets/care_id_bottom_nav_bar.dart';
import '../../../notifications/data/notifications_service.dart';
import '../../data/demo_patient_profile_store.dart';

/// Screen 81: Security & Privacy Controls
/// Node ID: 20:24805
class SecurityPrivacyControlsPage extends StatefulWidget {
  const SecurityPrivacyControlsPage({super.key});

  @override
  State<SecurityPrivacyControlsPage> createState() => _SecurityPrivacyControlsPageState();
}

class _SecurityPrivacyControlsPageState extends State<SecurityPrivacyControlsPage> {
  bool _faceIdEnabled = true;
  bool _ipadRevoked = false;
  bool _emailNotifications = true;
  bool _smsNotifications = true;
  bool _pushNotifications = true;
  String _profileVisibility = 'PRIVATE';
  bool _isUpdatingPrefs = false;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    if (DemoPatientProfileStore.instance.isTestMode) return;
    await DemoPatientProfileStore.instance.loadFromBackend();
    final notifRes = await NotificationsService.instance.getPreferences();
    if (!mounted) return;
    setState(() {
      _profileVisibility = DemoPatientProfileStore.instance.profileVisibility;
      if (notifRes.isSuccess && notifRes.data != null) {
        final raw = notifRes.data!;
        final prefs = raw['data'] is Map ? raw['data'] as Map : raw;
        _emailNotifications = prefs['emailEnabled'] as bool? ?? _emailNotifications;
        _smsNotifications = prefs['smsEnabled'] as bool? ?? _smsNotifications;
        _pushNotifications = prefs['pushEnabled'] as bool? ?? _pushNotifications;
      } else {
        _emailNotifications = DemoPatientProfileStore.instance.emailNotifications;
        _smsNotifications = DemoPatientProfileStore.instance.smsNotifications;
        _pushNotifications = DemoPatientProfileStore.instance.pushNotifications;
      }
    });
  }

  Future<void> _updateNotificationPrefs({
    bool? email,
    bool? sms,
    bool? push,
  }) async {
    if (_isUpdatingPrefs) return;
    final prevEmail = _emailNotifications;
    final prevSms = _smsNotifications;
    final prevPush = _pushNotifications;

    setState(() {
      if (email != null) _emailNotifications = email;
      if (sms != null) _smsNotifications = sms;
      if (push != null) _pushNotifications = push;
      _isUpdatingPrefs = true;
    });

    final res = await NotificationsService.instance.updatePreferences({
      'emailEnabled': _emailNotifications,
      'smsEnabled': _smsNotifications,
      'pushEnabled': _pushNotifications,
    });

    if (!mounted) return;
    setState(() => _isUpdatingPrefs = false);

    if (!res.isSuccess) {
      setState(() {
        _emailNotifications = prevEmail;
        _smsNotifications = prevSms;
        _pushNotifications = prevPush;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            res.errorMessage ?? 'Could not update notification preferences.',
            style: GoogleFonts.plusJakartaSans(),
          ),
          backgroundColor: const Color(0xFFBA1A1A),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Notification preferences saved.',
            style: GoogleFonts.plusJakartaSans(),
          ),
          backgroundColor: const Color(0xFF006D76),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _updateProfileVisibility(String newVisibility) async {
    if (_isUpdatingPrefs || newVisibility == _profileVisibility) return;
    final prev = _profileVisibility;
    setState(() {
      _profileVisibility = newVisibility;
      _isUpdatingPrefs = true;
    });

    final ok = await DemoPatientProfileStore.instance.updatePreferences(
      profileVisibility: newVisibility,
    );

    if (!mounted) return;
    setState(() => _isUpdatingPrefs = false);

    if (!ok) {
      setState(() => _profileVisibility = prev);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            DemoPatientProfileStore.instance.lastError ?? 'Could not update profile visibility.',
            style: GoogleFonts.plusJakartaSans(),
          ),
          backgroundColor: const Color(0xFFBA1A1A),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Profile visibility updated to $newVisibility.',
            style: GoogleFonts.plusJakartaSans(),
          ),
          backgroundColor: const Color(0xFF006D76),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _showChangePinDialog() {
    final pinController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Change Vault PIN',
          style: GoogleFonts.plusJakartaSans(
            fontWeight: FontWeight.bold,
            color: const Color(0xFF0B1C30),
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enter your new 4-digit security PIN for vault verification.',
              style: GoogleFonts.plusJakartaSans(
                color: const Color(0xFF494552),
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: pinController,
              keyboardType: TextInputType.number,
              maxLength: 4,
              obscureText: true,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                letterSpacing: 10,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                counterText: '',
                filled: true,
                fillColor: const Color(0xFFEFF4FF),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: GoogleFonts.plusJakartaSans(
                color: const Color(0xFF494552),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF28006D),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Vault PIN updated successfully!',
                    style: GoogleFonts.plusJakartaSans(),
                  ),
                  backgroundColor: const Color(0xFF006D76),
                ),
              );
            },
            child: Text(
              'Save PIN',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _revokeSession() {
    setState(() {
      _ipadRevoked = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'iPad Air session revoked.',
          style: GoogleFonts.plusJakartaSans(),
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FF),
      body: Stack(
        children: [
          // Background Gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFF8F9FF),
                    Color(0xFFFFFFFF),
                  ],
                ),
              ),
            ),
          ),

          // Main Scrollable Content
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(
                top: 72,
                left: 16,
                right: 16,
                bottom: 110,
              ),
              children: [
                // Hero Section / Status
                _buildHeroStatusBanner(),
                const SizedBox(height: 24),

                // Biometric Security Section
                _buildBiometricSecuritySection(),
                const SizedBox(height: 24),

                // PIN Management Section
                _buildPinManagementSection(),
                const SizedBox(height: 24),

                // Session Management Section
                _buildSessionManagementSection(),
                const SizedBox(height: 24),

                // Privacy Section
                _buildPrivacySection(),
                const SizedBox(height: 24),

                // Security Footer Info
                _buildFooterInfo(),
                const SizedBox(height: 16),
              ],
            ),
          ),

          // Top App Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: _buildTopAppBar(context),
          ),

          // Bottom Navigation Bar
          const Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: CareIDBottomNavBar(currentIndex: 3),
          ),
        ],
      ),
    );
  }

  Widget _buildTopAppBar(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFEFF4FF),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 1,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Container(
          height: 64,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Back Button
              InkWell(
                onTap: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  } else {
                    Navigator.of(context).pushReplacementNamed(AppRoutes.profileSettingsHub);
                  }
                },
                borderRadius: BorderRadius.circular(9999),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFFCBC4D4).withOpacity(0.3),
                    ),
                  ),
                  child: const Icon(
                    Icons.arrow_back_ios_new,
                    size: 16,
                    color: Color(0xFF28006D),
                  ),
                ),
              ),

              // Title + Badge
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Security & Privacy',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF28006D),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Image.asset(
                    'assets/images/card_id_badge.png',
                    height: 20,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const SizedBox(),
                  ),
                ],
              ),

              const SizedBox(width: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroStatusBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF28006D),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: const Color(0xFF3F1D8B),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.verified_user_rounded,
              color: Color(0xFFAB8EFD),
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Vault Protection: High',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Your biometric and session data are secured using military-grade encryption.',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    height: 1.4,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBiometricSecuritySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'BIOMETRIC SECURITY',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF494552),
              letterSpacing: 0.8,
            ),
          ),
        ),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4).withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            children: [
              // Face ID Toggle
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.face_retouching_natural_rounded,
                        size: 20,
                        color: Color(0xFF28006D),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Face ID',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0B1C30),
                            ),
                          ),
                          Text(
                            'Unlock vault using facial recognition',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              color: const Color(0xFF494552),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Transform.scale(
                      scale: 0.85,
                      child: Switch(
                        value: _faceIdEnabled,
                        activeColor: Colors.white,
                        activeTrackColor: const Color(0xFF28006D),
                        inactiveThumbColor: Colors.white,
                        inactiveTrackColor: const Color(0xFFCBC4D4),
                        onChanged: (val) {
                          setState(() {
                            _faceIdEnabled = val;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ),
              Divider(
                height: 1,
                thickness: 1,
                indent: 18,
                endIndent: 18,
                color: const Color(0xFFCBC4D4).withOpacity(0.3),
              ),
              // Fingerprint Row
              InkWell(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Stored fingerprints are synchronized.',
                        style: GoogleFonts.plusJakartaSans(),
                      ),
                    ),
                  );
                },
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF4FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.fingerprint_rounded,
                          size: 20,
                          color: Color(0xFF28006D),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Fingerprint',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF0B1C30),
                              ),
                            ),
                            Text(
                              'Manage stored fingerprints',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                color: const Color(0xFF494552),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF75F2FE),
                          borderRadius: BorderRadius.circular(9999),
                        ),
                        child: Text(
                          'Set',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF006971),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: Color(0xFF494552),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPinManagementSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'PIN MANAGEMENT',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF494552),
              letterSpacing: 0.8,
            ),
          ),
        ),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4).withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: InkWell(
            onTap: _showChangePinDialog,
            borderRadius: BorderRadius.circular(20),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF4FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.pin_outlined,
                      size: 20,
                      color: Color(0xFF28006D),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Change PIN',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF0B1C30),
                          ),
                        ),
                        Text(
                          'Last changed 3 months ago',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            color: const Color(0xFF494552),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: Color(0xFF494552),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSessionManagementSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'SESSION MANAGEMENT',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF494552),
              letterSpacing: 0.8,
            ),
          ),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4).withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            children: [
              // Device 1: iPhone 15 Pro
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF4FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFFCBC4D4).withOpacity(0.5),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.smartphone_rounded,
                      size: 22,
                      color: Color(0xFF28006D),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'iPhone 15 Pro',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF0B1C30),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF75F2FE),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'Current',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF006D76),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'London, UK • Active now',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              color: const Color(0xFF494552),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              if (!_ipadRevoked) ...[
                const SizedBox(height: 12),
                // Device 2: iPad Air
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFFCBC4D4).withOpacity(0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.tablet_mac_rounded,
                        size: 22,
                        color: Color(0xFF28006D),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'iPad Air',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF0B1C30),
                                  ),
                                ),
                                InkWell(
                                  onTap: _revokeSession,
                                  child: Text(
                                    'Revoke',
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFFBA1A1A),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Manchester, UK • 2 days ago',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                color: const Color(0xFF494552),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPrivacySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'PRIVACY',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF494552),
              letterSpacing: 0.8,
            ),
          ),
        ),

        // Download My Data Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4).withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFF75F2FE),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.file_download_outlined,
                  color: Color(0xFF006D76),
                  size: 24,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Download My Data',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF28006D),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Generate a portable JSON/PDF export of all your stored medical history and vault records.',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  height: 1.4,
                  color: const Color(0xFF494552),
                ),
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Preparing your encrypted medical vault export package...',
                        style: GoogleFonts.plusJakartaSans(),
                      ),
                      backgroundColor: const Color(0xFF006D76),
                    ),
                  );
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Request Export',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF28006D),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: Color(0xFF28006D),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Notification & Profile Visibility Controls
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4).withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildPrefSwitchRow(
                icon: Icons.email_outlined,
                title: 'Email Alerts',
                subtitle: 'Receive clinical & appointment updates via email',
                value: _emailNotifications,
                onChanged: (val) => _updateNotificationPrefs(email: val),
              ),
              Divider(
                height: 1,
                thickness: 1,
                indent: 18,
                endIndent: 18,
                color: const Color(0xFFCBC4D4).withOpacity(0.3),
              ),
              _buildPrefSwitchRow(
                icon: Icons.sms_outlined,
                title: 'SMS Alerts',
                subtitle: 'Receive OTP and urgent SMS reminders',
                value: _smsNotifications,
                onChanged: (val) => _updateNotificationPrefs(sms: val),
              ),
              Divider(
                height: 1,
                thickness: 1,
                indent: 18,
                endIndent: 18,
                color: const Color(0xFFCBC4D4).withOpacity(0.3),
              ),
              _buildPrefSwitchRow(
                icon: Icons.notifications_active_outlined,
                title: 'Push Notifications',
                subtitle: 'In-app & instant status notifications',
                value: _pushNotifications,
                onChanged: (val) => _updateNotificationPrefs(push: val),
              ),
              Divider(
                height: 1,
                thickness: 1,
                indent: 18,
                endIndent: 18,
                color: const Color(0xFFCBC4D4).withOpacity(0.3),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF4FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.visibility_outlined,
                        size: 20,
                        color: Color(0xFF28006D),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Profile Visibility',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0B1C30),
                            ),
                          ),
                          Text(
                            'Control who can view your CareID summary',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              color: const Color(0xFF494552),
                            ),
                          ),
                        ],
                      ),
                    ),
                    DropdownButton<String>(
                      value: const ['PRIVATE', 'CARE_TEAM', 'PUBLIC'].contains(_profileVisibility)
                          ? _profileVisibility
                          : 'PRIVATE',
                      underline: const SizedBox.shrink(),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF28006D),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'PRIVATE', child: Text('Private')),
                        DropdownMenuItem(value: 'CARE_TEAM', child: Text('Care Team')),
                        DropdownMenuItem(value: 'PUBLIC', child: Text('Public')),
                      ],
                      onChanged: (val) {
                        if (val != null) _updateProfileVisibility(val);
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Consent Management Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFFCBC4D4).withOpacity(0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8DDFF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.assignment_turned_in_outlined,
                  color: Color(0xFF28006D),
                  size: 24,
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Consent Management',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF28006D),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Manage third-party provider access and clinical study permissions for your health profile.',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  height: 1.4,
                  color: const Color(0xFF494552),
                ),
              ),
              const SizedBox(height: 14),
              InkWell(
                onTap: () {
                  Navigator.of(context).pushNamed(AppRoutes.manageSharedAccess);
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Manage Permissions',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF28006D),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      size: 16,
                      color: Color(0xFF28006D),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPrefSwitchRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF4FF),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: const Color(0xFF28006D)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF0B1C30),
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    color: const Color(0xFF494552),
                  ),
                ),
              ],
            ),
          ),
          Transform.scale(
            scale: 0.85,
            child: Switch(
              value: value,
              activeColor: Colors.white,
              activeTrackColor: const Color(0xFF28006D),
              inactiveThumbColor: Colors.white,
              inactiveTrackColor: const Color(0xFFCBC4D4),
              onChanged: _isUpdatingPrefs ? null : onChanged,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooterInfo() {
    return Center(
      child: Text(
        'System Version 2.4.12 • Last Security Audit: Jan 2024',
        textAlign: TextAlign.center,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 13,
          color: const Color(0xFF0B1C30).withOpacity(0.6),
        ),
      ),
    );
  }
}


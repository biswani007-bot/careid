import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../../../core/routing/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/session/session_manager.dart';
import '../../../../core/network/api_client.dart';
import '../../data/auth_service.dart';
import 'package:care_id_patient_app/features/profile/data/demo_patient_profile_store.dart';

/// Page 1: Splash Screen
/// Figma Frame: `Splash_Screen` (node-id `20:25191`)
/// Dimensions: 390 x 884
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  bool _canNavigate = false;

  @override
  void initState() {
    super.initState();
    _startInitialization();
  }

  void _startInitialization() async {
    // Branded splash display minimum timer (1500ms)
    final minSplashDuration = Future.delayed(const Duration(milliseconds: 1500));

    try {
      await SessionManager.instance.init();

      if (!SessionManager.instance.isAuthenticated) {
        // Auto-authenticate strictly during local testing/dev when explicit flag is provided
        if (kDebugMode && const bool.fromEnvironment('DEV_AUTO_AUTH', defaultValue: false)) {
          await AuthService.instance.ensureAuthenticatedSession();
        }
      }

      if (SessionManager.instance.isAuthenticated) {
        // Check if access token is expired
        if (SessionManager.instance.isAccessTokenExpired()) {
          if (!SessionManager.instance.isRefreshTokenExpired()) {
            // Attempt auto-refresh with existing valid refresh token
            await ApiClient.instance.refreshToken();
          } else {
            // Both access and refresh tokens expired -> clear invalid session
            await SessionManager.instance.clearSession();
          }
        }

        if (SessionManager.instance.isAuthenticated) {
          // Preload authoritative patient profile from local backend
          try {
            await DemoPatientProfileStore.instance.loadFromBackend();
          } catch (_) {
            // Network failure: preserve session for offline home entry
          }
        }
      }
    } catch (_) {
      // Offline fallback: keep session state
    }

    await minSplashDuration;
    _canNavigate = true;
    _navigateToNext();
  }

  void _navigateToNext() {
    if (!mounted || !_canNavigate) return;
    if (SessionManager.instance.isAuthenticated) {
      final defaultRoute = WidgetsBinding.instance.platformDispatcher.defaultRouteName;
      if (defaultRoute.isNotEmpty &&
          defaultRoute != '/' &&
          defaultRoute != '/welcome' &&
          AppRoutes.routes.containsKey(defaultRoute)) {
        Navigator.of(context).pushReplacementNamed(defaultRoute);
        return;
      }
      Navigator.of(context).pushReplacementNamed(AppRoutes.home);
    } else {
      Navigator.of(context).pushReplacementNamed(AppRoutes.welcome);
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final scale = screenSize.width / 390.0;

    return Scaffold(
      backgroundColor: Colors.white,
      body: GestureDetector(
        onTap: _navigateToNext,
        behavior: HitTestBehavior.opaque,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(
              color: AppColors.primary,
              width: 5.0,
            ),
          ),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Background Doctor Image with 25% opacity
              Opacity(
                opacity: 0.25,
                child: Image.asset(
                  'assets/images/splash_bg.png',
                  fit: BoxFit.cover,
                  alignment: const Alignment(0.0, -0.2),
                ),
              ),

              // CareID Brand Graphic Lockup & Domain Pill Badges
              // Figma position: width 427, height 284, top 453 on 884h frame (~51.2% top offset)
              Positioned(
                top: (453.0 / 884.0) * screenSize.height,
                left: 0,
                right: 0,
                child: Center(
                  child: SizedBox(
                    width: 427.0 * scale.clamp(0.85, 1.15),
                    height: 284.0 * scale.clamp(0.85, 1.15),
                    child: Image.asset(
                      'assets/images/care_id_splash_emblem.png',
                      fit: BoxFit.contain,
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

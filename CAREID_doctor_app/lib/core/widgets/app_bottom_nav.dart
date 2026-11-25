import 'package:flutter/material.dart';
import '../routes/app_routes.dart';

/// AppBottomNav — Centralized, Figma-standardized floating bottom navigation shell
/// (CAREID-AIO-FIGMA: Node 10:325, 10:1105, 10:1512, 10:3209)
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int>? onTap;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    this.onTap,
  });

  void _handleTap(BuildContext context, int index) {
    if (onTap != null) {
      onTap!(index);
      return;
    }

    if (index == currentIndex) return;

    switch (index) {
      case 0:
        Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
        break;
      case 1:
        Navigator.pushReplacementNamed(context, AppRoutes.patientDirectory);
        break;
      case 2:
        Navigator.pushReplacementNamed(context, AppRoutes.appointmentsOverview);
        break;
      case 3:
        Navigator.pushReplacementNamed(context, AppRoutes.doctorProfile);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    // Responsive bottom safe-area spacing preventing double-margin or overlap
    final double bottomSpacing = bottomInset > 0 ? bottomInset + 8 : 24.0;

    return Center(
      heightFactor: 1.0,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        margin: EdgeInsets.fromLTRB(20, 0, 20, bottomSpacing),
        height: 82,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(9999),
          border: Border.all(
            color: const Color(0x4DCBC4D4), // rgba(203,196,212,0.3)
            width: 1,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A000000), // rgba(0,0,0,0.1)
              blurRadius: 25,
              offset: Offset(0, 20),
              spreadRadius: -5,
            ),
            BoxShadow(
              color: Color(0x1A000000),
              blurRadius: 10,
              offset: Offset(0, 8),
              spreadRadius: -6,
            ),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            Row(
              children: [
                // 0: Home (Node 10:325)
                Expanded(
                  child: Center(
                    child: _buildNavItem(
                      context: context,
                      index: 0,
                      activeIcon: Icons.grid_view_rounded,
                      inactiveIcon: Icons.grid_view_rounded,
                      label: 'Home',
                    ),
                  ),
                ),

                // 1: Patients (Node 10:330)
                Expanded(
                  child: Center(
                    child: _buildNavItem(
                      context: context,
                      index: 1,
                      activeIcon: Icons.people_alt_rounded,
                      inactiveIcon: Icons.people_outline_rounded,
                      label: 'Patients',
                    ),
                  ),
                ),

                // Center Spacer for floating elevated Scan QR button
                const SizedBox(width: 44),

                // 2: Schedule (Node 10:335)
                Expanded(
                  child: Center(
                    child: _buildNavItem(
                      context: context,
                      index: 2,
                      activeIcon: Icons.calendar_today_rounded,
                      inactiveIcon: Icons.calendar_today_outlined,
                      label: 'Schedule',
                    ),
                  ),
                ),

                // 3: Profile (Node 10:340)
                Expanded(
                  child: Center(
                    child: _buildNavItem(
                      context: context,
                      index: 3,
                      activeIcon: Icons.person_rounded,
                      inactiveIcon: Icons.person_outline_rounded,
                      label: 'Profile',
                    ),
                  ),
                ),
              ],
            ),

            // Elevated Center Scan QR Button (Figma Node 10:345)
            Positioned(
              top: -24,
              child: GestureDetector(
                onTap: () {
                  Navigator.pushNamed(context, AppRoutes.cameraPermission);
                },
                behavior: HitTestBehavior.opaque,
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: const Color(0xFF5B14B8),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFF8F9FF), width: 4),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x40000000), // rgba(0,0,0,0.25)
                        blurRadius: 25,
                        offset: Offset(0, 12),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.qr_code_scanner_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required BuildContext context,
    required int index,
    required IconData activeIcon,
    required IconData inactiveIcon,
    required String label,
  }) {
    final bool isSelected = currentIndex == index;

    if (isSelected) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF76F1FF),
          borderRadius: BorderRadius.circular(9999),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                activeIcon,
                size: 18,
                color: const Color(0xFF006D76),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF006D76),
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: () => _handleTap(context, index),
      behavior: HitTestBehavior.opaque,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              inactiveIcon,
              size: 18,
              color: const Color(0xFF494552),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 10,
                fontWeight: FontWeight.w400,
                color: Color(0xFF494552),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

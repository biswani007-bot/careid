import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../routing/app_routes.dart';
import '../state/app_data_sync_manager.dart';
import '../../features/notifications/data/notifications_service.dart';

/// CareID standard notification bell button matching the Dashboard app bar design.
class CareIDNotificationButton extends StatefulWidget {
  final VoidCallback? onTap;
  final bool? hasUnread;

  const CareIDNotificationButton({
    super.key,
    this.onTap,
    this.hasUnread,
  });

  @override
  State<CareIDNotificationButton> createState() => _CareIDNotificationButtonState();
}

class _CareIDNotificationButtonState extends State<CareIDNotificationButton> {
  late bool _hasUnread;

  @override
  void initState() {
    super.initState();
    _hasUnread = widget.hasUnread ?? true;
    _checkUnread();
    AppDataSyncManager.instance.notificationsTick.addListener(_onNotificationsTick);
  }

  void _onNotificationsTick() {
    _checkUnread();
  }

  void _checkUnread() async {
    try {
      final res = await NotificationsService.instance.getUnreadCount();
      if (res.isSuccess && mounted) {
        final count = res.data ?? 0;
        setState(() {
          _hasUnread = count > 0;
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    AppDataSyncManager.instance.notificationsTick.removeListener(_onNotificationsTick);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final showBadge = widget.hasUnread ?? _hasUnread;
    return GestureDetector(
      onTap: widget.onTap ??
          () {
            Navigator.of(context).pushNamed(AppRoutes.notificationCenter);
          },
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: 40,
        height: 40,
        decoration: const BoxDecoration(
          color: Color(0xFFE5EEFF),
          shape: BoxShape.circle,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            SvgPicture.asset(
              'assets/icons/home_notification_bell.svg',
              width: 16,
              height: 20,
            ),
            if (showBadge)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFFBA1A1A),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}


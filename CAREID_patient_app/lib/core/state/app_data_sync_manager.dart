import 'package:flutter/foundation.dart';

/// Central Global Data Synchronization Bus for the CareID Patient App.
/// Propagates API mutations across modules and signals active screens to refresh.
class AppDataSyncManager extends ChangeNotifier {
  static final AppDataSyncManager _instance = AppDataSyncManager._internal();
  factory AppDataSyncManager() => _instance;
  static AppDataSyncManager get instance => _instance;

  AppDataSyncManager._internal();

  // Individual domain notifiers for fine-grained subscriptions
  final ValueNotifier<int> profileTick = ValueNotifier<int>(0);
  final ValueNotifier<int> recordsTick = ValueNotifier<int>(0);
  final ValueNotifier<int> appointmentsTick = ValueNotifier<int>(0);
  final ValueNotifier<int> insuranceTick = ValueNotifier<int>(0);
  final ValueNotifier<int> notificationsTick = ValueNotifier<int>(0);
  final ValueNotifier<int> familyTick = ValueNotifier<int>(0);

  /// Signals that the patient profile was mutated and consumers must update
  void notifyProfileUpdated() {
    profileTick.value++;
    notifyListeners();
  }

  /// Signals that medical/dental/vision records changed (created, updated, deleted, favorited)
  void notifyRecordsUpdated() {
    recordsTick.value++;
    notifyListeners();
  }

  /// Signals that appointments changed (booked, rescheduled, cancelled)
  void notifyAppointmentsUpdated() {
    appointmentsTick.value++;
    notifyListeners();
  }

  /// Signals that insurance data changed (scanned, confirmed, policy created/deleted)
  void notifyInsuranceUpdated() {
    insuranceTick.value++;
    notifyListeners();
  }

  /// Signals that notifications were read or preferences changed
  void notifyNotificationsUpdated() {
    notificationsTick.value++;
    notifyListeners();
  }

  /// Signals that family care data changed (invitation sent, accepted, rejected)
  void notifyFamilyUpdated() {
    familyTick.value++;
    notifyListeners();
  }

  /// Forces global refresh across all domain subscribers
  void invalidateAndRefreshAll() {
    profileTick.value++;
    recordsTick.value++;
    appointmentsTick.value++;
    insuranceTick.value++;
    notificationsTick.value++;
    familyTick.value++;
    notifyListeners();
  }
}

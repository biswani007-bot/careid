import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/state/app_data_sync_manager.dart';
import 'patient_profile_service.dart';

/// Patient profile and identity details model.
class PatientProfile {
  final String fullName;
  final String firstName;
  final String lastName;
  final String dateOfBirth;
  final String gender;
  final String bloodGroup;
  final String mobile;
  final String email;
  final String address;
  final String avatarAsset;
  final String patientId;
  final String ciNumber;
  final bool isIceActive;
  final bool isInsuranceActive;

  const PatientProfile({
    required this.fullName,
    this.firstName = 'Sarah',
    this.lastName = 'Jenkins',
    required this.dateOfBirth,
    required this.gender,
    required this.bloodGroup,
    required this.mobile,
    required this.email,
    required this.address,
    this.avatarAsset = 'assets/images/bfd7567e81ca7834f0c16f9b7bd9f27a17ef5ae1.png',
    this.patientId = '#HV-920512',
    this.ciNumber = 'CI-882-0911',
    this.isIceActive = true,
    this.isInsuranceActive = true,
  });

  PatientProfile copyWith({
    String? fullName,
    String? firstName,
    String? lastName,
    String? dateOfBirth,
    String? gender,
    String? bloodGroup,
    String? mobile,
    String? email,
    String? address,
    String? avatarAsset,
    String? patientId,
    String? ciNumber,
    bool? isIceActive,
    bool? isInsuranceActive,
  }) {
    return PatientProfile(
      fullName: fullName ?? this.fullName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      bloodGroup: bloodGroup ?? this.bloodGroup,
      mobile: mobile ?? this.mobile,
      email: email ?? this.email,
      address: address ?? this.address,
      avatarAsset: avatarAsset ?? this.avatarAsset,
      patientId: patientId ?? this.patientId,
      ciNumber: ciNumber ?? this.ciNumber,
      isIceActive: isIceActive ?? this.isIceActive,
      isInsuranceActive: isInsuranceActive ?? this.isInsuranceActive,
    );
  }
}

/// Centralized patient profile state management store.
/// Retains values across screen transitions and navigation, syncs with backend APIs,
/// and notifies AppDataSyncManager on successful mutations.
class DemoPatientProfileStore extends ChangeNotifier {
  static final DemoPatientProfileStore _instance = DemoPatientProfileStore._internal();
  factory DemoPatientProfileStore() => _instance;
  static DemoPatientProfileStore get instance => _instance;

  DemoPatientProfileStore._internal();

  PatientProfile _currentProfile = const PatientProfile(
    fullName: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    mobile: '',
    email: '',
    address: '',
    avatarAsset: 'assets/images/bfd7567e81ca7834f0c16f9b7bd9f27a17ef5ae1.png',
    patientId: '',
    ciNumber: '',
  );

  bool _isLoading = false;
  bool _isSaving = false;
  String? _lastError;
  bool isTestMode = false;

  // Extended clinical, dashboard & preference fields from /patients/me/full & /patients/me/dashboard
  List<String> _knownAllergies = const [];
  List<String> _chronicConditions = const [];
  String _emergencyContactName = '';
  String _emergencyContactRelationship = '';
  String _emergencyContactPhone = '';
  String _healthCardNumber = '';
  String _healthCardStatus = '';
  String _healthCardQrPayload = '';
  String _insuranceProvider = '';
  String _insurancePolicyNumber = '';
  String _insuranceStatus = '';
  int _totalRecordsCount = 0;
  int _medicalRecordsCount = 0;
  int _dentalRecordsCount = 0;
  int _visionRecordsCount = 0;
  int _unreadNotificationsCount = 0;
  String _memberSince = '';
  String _profileVisibility = 'PRIVATE';
  bool _emailNotifications = true;
  bool _smsNotifications = true;
  bool _pushNotifications = true;

  PatientProfile get currentProfile => _currentProfile;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get lastError => _lastError;

  List<String> get knownAllergies => List.unmodifiable(_knownAllergies);
  List<String> get chronicConditions => List.unmodifiable(_chronicConditions);
  String get emergencyContactName => _emergencyContactName;
  String get emergencyContactRelationship => _emergencyContactRelationship;
  String get emergencyContactPhone => _emergencyContactPhone;
  String get healthCardNumber => _healthCardNumber;
  String get healthCardStatus => _healthCardStatus;
  String get healthCardQrPayload => _healthCardQrPayload;
  String get insuranceProvider => _insuranceProvider;
  String get insurancePolicyNumber => _insurancePolicyNumber;
  String get insuranceStatus => _insuranceStatus;
  int get totalRecordsCount => _totalRecordsCount;
  int get medicalRecordsCount => _medicalRecordsCount;
  int get dentalRecordsCount => _dentalRecordsCount;
  int get visionRecordsCount => _visionRecordsCount;
  int get unreadNotificationsCount => _unreadNotificationsCount;
  String get memberSince => _memberSince;
  String get profileVisibility => _profileVisibility;
  bool get emailNotifications => _emailNotifications;
  bool get smsNotifications => _smsNotifications;
  bool get pushNotifications => _pushNotifications;

  // Convenience reactive getters
  String get fullName => _currentProfile.fullName;
  String get firstName => _currentProfile.firstName;
  String get lastName => _currentProfile.lastName;
  String get dateOfBirth => _currentProfile.dateOfBirth;
  String get gender => _currentProfile.gender;
  String get bloodGroup => _currentProfile.bloodGroup;
  String get mobile => _currentProfile.mobile;
  String get email => _currentProfile.email;
  String get address => _currentProfile.address;
  String get avatarAsset => _currentProfile.avatarAsset;
  String get patientId => _currentProfile.patientId;
  String get ciNumber => _currentProfile.ciNumber;
  bool get isIceActive => _currentProfile.isIceActive;
  bool get isInsuranceActive => _currentProfile.isInsuranceActive;

  /// Loads profile from live backend if session is active
  Future<bool> loadProfile({bool forceRefresh = false}) async {
    return await loadFromBackend();
  }

  /// Alias for refreshProfile
  Future<bool> refreshProfile() async {
    return await loadFromBackend();
  }

  /// Pulls live patient profile from backend and updates centralized state
  Future<bool> loadFromBackend() async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await PatientProfileService.instance.getFullProfile();
      if (res.isSuccess && res.data != null) {
        var map = res.data!;
        if (map['data'] is Map) {
          map = Map<String, dynamic>.from(map['data'] as Map);
        }
        final firstName = map['firstName']?.toString() ?? '';
        final lastName = map['lastName']?.toString() ?? '';
        final fullName = '$firstName $lastName'.trim();
        final rawDob = map['dateOfBirth']?.toString() ?? _currentProfile.dateOfBirth;
        
        // Format DOB to DD/MM/YYYY if in YYYY-MM-DD or ISO timestamp
        final cleanDobRaw = rawDob.split('T').first.trim();
        String dob = cleanDobRaw;
        if (cleanDobRaw.contains('-')) {
          final parts = cleanDobRaw.split('-');
          if (parts.length == 3) {
            dob = '${parts[2].padLeft(2, '0')}/${parts[1].padLeft(2, '0')}/${parts[0]}';
          }
        }

        // Format Gender
        String gender = map['gender']?.toString() ?? _currentProfile.gender;
        if (gender.toUpperCase() == 'FEMALE') gender = 'Female';
        if (gender.toUpperCase() == 'MALE') gender = 'Male';

        // Format Blood Group
        String bloodGroup = map['bloodGroup']?.toString() ?? _currentProfile.bloodGroup;
        if (bloodGroup == 'O_POSITIVE') bloodGroup = 'O+';
        if (bloodGroup == 'O_NEGATIVE') bloodGroup = 'O-';
        if (bloodGroup == 'A_POSITIVE') bloodGroup = 'A+';
        if (bloodGroup == 'A_NEGATIVE') bloodGroup = 'A-';
        if (bloodGroup == 'B_POSITIVE') bloodGroup = 'B+';
        if (bloodGroup == 'B_NEGATIVE') bloodGroup = 'B-';
        if (bloodGroup == 'AB_POSITIVE') bloodGroup = 'AB+';
        if (bloodGroup == 'AB_NEGATIVE') bloodGroup = 'AB-';

        final phone = map['phone']?.toString() ?? _currentProfile.mobile;
        final email = map['email']?.toString() ?? _currentProfile.email;
        final id = map['id']?.toString() ?? _currentProfile.patientId;
        final patientNum = map['patientNumber']?.toString() ?? '#HV-${id.substring(0, id.length > 8 ? 8 : id.length).toUpperCase()}';

        String address = _currentProfile.address;
        if (map['currentAddress'] is Map) {
          final addr = map['currentAddress'] as Map;
          final line1 = addr['line1']?.toString() ?? '';
          final city = addr['city']?.toString() ?? '';
          final state = addr['state']?.toString() ?? '';
          final combined = [line1, city, state].where((s) => s.isNotEmpty).join(', ');
          if (combined.isNotEmpty) address = combined;
        } else if (map['addresses'] is List && (map['addresses'] as List).isNotEmpty) {
          final addr = (map['addresses'] as List).first;
          if (addr is Map) {
            final line1 = addr['line1']?.toString() ?? '';
            final city = addr['city']?.toString() ?? '';
            final combined = [line1, city].where((s) => s.isNotEmpty).join(', ');
            if (combined.isNotEmpty) address = combined;
          }
        }

        final photoUrl = map['photoUrl']?.toString();
        final avatar = (photoUrl != null && photoUrl.isNotEmpty) ? photoUrl : _currentProfile.avatarAsset;

        if (map['knownAllergies'] is List) {
          _knownAllergies = (map['knownAllergies'] as List)
              .map((e) => e.toString())
              .where((e) => e.trim().isNotEmpty)
              .toList();
        }
        if (map['chronicConditions'] is List) {
          _chronicConditions = (map['chronicConditions'] as List)
              .map((e) => e.toString())
              .where((e) => e.trim().isNotEmpty)
              .toList();
        }
        if (map['profileVisibility'] != null) {
          _profileVisibility = map['profileVisibility'].toString();
        }
        if (map['emailNotifications'] is bool) {
          _emailNotifications = map['emailNotifications'] as bool;
        }
        if (map['smsNotifications'] is bool) {
          _smsNotifications = map['smsNotifications'] as bool;
        }
        if (map['pushNotifications'] is bool) {
          _pushNotifications = map['pushNotifications'] as bool;
        }
        if (map['createdAt'] != null) {
          final parsedCreated = DateTime.tryParse(map['createdAt'].toString());
          if (parsedCreated != null) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            _memberSince = '${months[parsedCreated.month - 1]} ${parsedCreated.year}';
          }
        }

        _currentProfile = _currentProfile.copyWith(
          fullName: fullName.isNotEmpty ? fullName : _currentProfile.fullName,
          firstName: firstName.isNotEmpty ? firstName : _currentProfile.firstName,
          lastName: lastName.isNotEmpty ? lastName : _currentProfile.lastName,
          dateOfBirth: dob,
          gender: gender,
          bloodGroup: bloodGroup,
          mobile: phone,
          email: email,
          address: address,
          patientId: patientNum,
          ciNumber: 'CI-${id.substring(0, id.length > 3 ? 3 : id.length).toUpperCase()}-${id.substring(id.length > 4 ? id.length - 4 : 0).toUpperCase()}',
          avatarAsset: avatar,
        );

        await loadDashboardFromBackend(notify: false);

        _isLoading = false;
        notifyListeners();
        AppDataSyncManager.instance.notifyProfileUpdated();
        return true;
      }
    } catch (e) {
      _lastError = e.toString();
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  /// Updates basic profile demographics on backend and synchronizes globally
  Future<ApiResponse<dynamic>> updateBasicDetails({
    required String firstName,
    required String lastName,
    required String dateOfBirth,
    required String gender,
    required String bloodGroup,
  }) async {
    _isLoading = true;
    notifyListeners();

    // Standardize DOB to YYYY-MM-DD for backend
    String backendDob = dateOfBirth;
    if (dateOfBirth.contains('/')) {
      final parts = dateOfBirth.split('/');
      if (parts.length == 3) {
        backendDob = '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}';
      }
    }

    // Standardize gender
    final backendGender = gender.toUpperCase();

    // Standardize blood group
    String backendBlood = bloodGroup;
    if (bloodGroup == 'O+') backendBlood = 'O_POSITIVE';
    if (bloodGroup == 'O-') backendBlood = 'O_NEGATIVE';
    if (bloodGroup == 'A+') backendBlood = 'A_POSITIVE';
    if (bloodGroup == 'A-') backendBlood = 'A_NEGATIVE';
    if (bloodGroup == 'B+') backendBlood = 'B_POSITIVE';
    if (bloodGroup == 'B-') backendBlood = 'B_NEGATIVE';
    if (bloodGroup == 'AB+') backendBlood = 'AB_POSITIVE';
    if (bloodGroup == 'AB-') backendBlood = 'AB_NEGATIVE';

    final res = await PatientProfileService.instance.updateBasicDetails(
      firstName: firstName,
      lastName: lastName,
      dateOfBirth: backendDob,
      gender: backendGender,
      bloodGroup: backendBlood,
    );

    if (res.isSuccess) {
      // Authoritative reload to guarantee persistence parity
      await loadFromBackend();
      _isLoading = false;
      return res;
    }

    _isLoading = false;
    _lastError = res.errorMessage;
    notifyListeners();
    return res;
  }

  /// Updates contact details on backend and synchronizes globally
  Future<ApiResponse<dynamic>> updateContactDetails({
    required String email,
    required String phone,
    String prefContactMethod = 'EMAIL',
  }) async {
    _isLoading = true;
    notifyListeners();

    final cleanPhone = phone.replaceAll(RegExp(r'\s+'), '');
    final res = await PatientProfileService.instance.updateContactDetails(
      email: email,
      phone: cleanPhone,
    );

    if (res.isSuccess) {
      await loadFromBackend();
      _isLoading = false;
      return res;
    }

    _isLoading = false;
    _lastError = res.errorMessage;
    notifyListeners();
    return res;
  }

  /// Updates residential address on backend and synchronizes globally
  Future<ApiResponse<dynamic>> updateAddress({
    required String line1,
    String? line2,
    String? city,
    String? state,
    String? postalCode,
    String? country,
  }) async {
    _isLoading = true;
    notifyListeners();

    final res = await PatientProfileService.instance.updateAddress(
      line1: line1,
      line2: line2,
      city: city,
      state: state,
      postalCode: postalCode,
      country: country,
    );

    if (res.isSuccess) {
      await loadFromBackend();
      _isLoading = false;
      return res;
    }

    _isLoading = false;
    _lastError = res.errorMessage;
    notifyListeners();
    return res;
  }

  /// Updates profile photo on backend and synchronizes globally
  Future<ApiResponse<dynamic>> updateProfilePhoto({String? photoUrl}) async {
    _isLoading = true;
    notifyListeners();

    final res = await PatientProfileService.instance.uploadPhoto(photoUrl: photoUrl);
    if (res.isSuccess) {
      await loadFromBackend();
      _isLoading = false;
      return res;
    }

    _isLoading = false;
    _lastError = res.errorMessage;
    notifyListeners();
    return res;
  }

  /// Centralized atomic save method for all profile sections
  Future<bool> saveCompleteProfile(PatientProfile profile) async {
    if (_isSaving) return false;

    // Fast-path for unit tests to bypass external network calls
    if (isTestMode) {
      _currentProfile = profile;
      _lastError = null;
      notifyListeners();
      AppDataSyncManager.instance.notifyProfileUpdated();
      return true;
    }

    _isSaving = true;
    _lastError = null;
    notifyListeners();

    final previousProfile = _currentProfile;
    final names = profile.fullName.trim().split(' ');
    final firstName = names.isNotEmpty ? names.first : 'Sarah';
    final lastName = names.length > 1 ? names.sublist(1).join(' ') : 'Jenkins';

    // Standardize DOB to YYYY-MM-DD for backend
    String backendDob = profile.dateOfBirth;
    if (profile.dateOfBirth.contains('/')) {
      final parts = profile.dateOfBirth.split('/');
      if (parts.length == 3) {
        backendDob = '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}';
      }
    }

    // Standardize gender
    final backendGender = profile.gender.toUpperCase();

    // Standardize blood group
    String backendBlood = profile.bloodGroup;
    if (profile.bloodGroup == 'O+') backendBlood = 'O_POSITIVE';
    if (profile.bloodGroup == 'O-') backendBlood = 'O_NEGATIVE';
    if (profile.bloodGroup == 'A+') backendBlood = 'A_POSITIVE';
    if (profile.bloodGroup == 'A-') backendBlood = 'A_NEGATIVE';
    if (profile.bloodGroup == 'B+') backendBlood = 'B_POSITIVE';
    if (profile.bloodGroup == 'B-') backendBlood = 'B_NEGATIVE';
    if (profile.bloodGroup == 'AB+') backendBlood = 'AB_POSITIVE';
    if (profile.bloodGroup == 'AB-') backendBlood = 'AB_NEGATIVE';

    try {
      // Stage 1: Update basic demographics
      final basicRes = await PatientProfileService.instance.updateBasicDetails(
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: backendDob,
        gender: backendGender,
        bloodGroup: backendBlood,
      );

      if (!basicRes.isSuccess) {
        _currentProfile = previousProfile;
        _isSaving = false;
        _lastError = basicRes.errorMessage ?? 'Failed to update basic profile details';
        notifyListeners();
        return false;
      }

      // Stage 2: Update contact details
      final cleanPhone = profile.mobile.replaceAll(RegExp(r'\s+'), '');
      final contactRes = await PatientProfileService.instance.updateContactDetails(
        email: profile.email,
        phone: cleanPhone,
      );

      if (!contactRes.isSuccess) {
        _currentProfile = previousProfile;
        _isSaving = false;
        _lastError = contactRes.errorMessage ?? 'Failed to update contact details';
        notifyListeners();
        return false;
      }

      // Stage 3: Update residential address
      final addressParts = profile.address.split(',').map((s) => s.trim()).toList();
      final line1 = addressParts.isNotEmpty ? addressParts[0] : profile.address;
      final city = addressParts.length > 1 ? addressParts[1] : 'San Francisco';
      final state = addressParts.length > 2 ? addressParts[2] : 'CA';

      final addressRes = await PatientProfileService.instance.updateAddress(
        line1: line1,
        city: city,
        state: state,
      );

      if (!addressRes.isSuccess) {
        _currentProfile = previousProfile;
        _isSaving = false;
        _lastError = addressRes.errorMessage ?? 'Failed to update address';
        notifyListeners();
        return false;
      }

      // Stage 4: Authoritative reload from backend to ensure persistence parity
      final reloadSuccess = await loadFromBackend();
      if (!reloadSuccess) {
        // Fall back to updated profile if reload fails but updates succeeded
        _currentProfile = profile;
      }

      _isSaving = false;
      _lastError = null;
      notifyListeners();
      AppDataSyncManager.instance.notifyProfileUpdated();
      return true;
    } catch (e) {
      _currentProfile = previousProfile;
      _isSaving = false;
      _lastError = 'Profile update error: ${e.toString()}';
      notifyListeners();
      return false;
    }
  }

  /// In-memory update retained for backwards compatibility
  void updateProfile(PatientProfile profile) {
    _currentProfile = profile;
    notifyListeners();
    AppDataSyncManager.instance.notifyProfileUpdated();
    saveCompleteProfile(profile);
  }

  /// Fetches aggregated patient dashboard data via GET /patients/me/dashboard
  Future<bool> loadDashboardFromBackend({bool notify = true}) async {
    try {
      final dashRes = await PatientProfileService.instance.getDashboard();
      if (dashRes.isSuccess && dashRes.data != null) {
        final dash = dashRes.data!;

        if (dash['healthCard'] is Map) {
          final hc = dash['healthCard'] as Map;
          _healthCardNumber = hc['cardNumber']?.toString() ?? _healthCardNumber;
          _healthCardStatus = hc['status']?.toString() ?? _healthCardStatus;
          _healthCardQrPayload = hc['qrPayload']?.toString() ?? _healthCardQrPayload;
          if (_healthCardNumber.isNotEmpty) {
            _currentProfile = _currentProfile.copyWith(ciNumber: _healthCardNumber);
          }
        }

        if (dash['activeInsurance'] is Map) {
          final ins = dash['activeInsurance'] as Map;
          _insuranceProvider = ins['providerName']?.toString() ?? _insuranceProvider;
          _insurancePolicyNumber = ins['policyNumber']?.toString() ?? _insurancePolicyNumber;
          _insuranceStatus = ins['verificationStatus']?.toString() ?? _insuranceStatus;
          _currentProfile = _currentProfile.copyWith(isInsuranceActive: true);
        }

        if (dash['emergencyContact'] is Map) {
          final ec = dash['emergencyContact'] as Map;
          _emergencyContactName = ec['name']?.toString() ?? '';
          _emergencyContactRelationship = ec['relationship']?.toString() ?? '';
          _emergencyContactPhone = ec['phone']?.toString() ?? '';
          _currentProfile = _currentProfile.copyWith(
            isIceActive: _emergencyContactName.isNotEmpty,
          );
        }

        if (dash['recordCounts'] is Map) {
          final rc = dash['recordCounts'] as Map;
          _totalRecordsCount = (rc['total'] as num?)?.toInt() ?? 0;
          _medicalRecordsCount = (rc['medical'] as num?)?.toInt() ?? 0;
          _dentalRecordsCount = (rc['dental'] as num?)?.toInt() ?? 0;
          _visionRecordsCount = (rc['vision'] as num?)?.toInt() ?? 0;
        }

        _unreadNotificationsCount =
            (dash['unreadNotificationsCount'] as num?)?.toInt() ?? _unreadNotificationsCount;

        if (notify) {
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      _lastError = e.toString();
    }
    return false;
  }

  /// Updates profile privacy/notification preferences via PATCH /patients/me/preferences
  Future<bool> updatePreferences({
    bool? emailNotifications,
    bool? smsNotifications,
    bool? pushNotifications,
    String? profileVisibility,
  }) async {
    final res = await PatientProfileService.instance.updatePreferences(
      emailNotifications: emailNotifications,
      smsNotifications: smsNotifications,
      pushNotifications: pushNotifications,
      profileVisibility: profileVisibility,
    );
    if (res.isSuccess) {
      if (emailNotifications != null) _emailNotifications = emailNotifications;
      if (smsNotifications != null) _smsNotifications = smsNotifications;
      if (pushNotifications != null) _pushNotifications = pushNotifications;
      if (profileVisibility != null) _profileVisibility = profileVisibility;
      notifyListeners();
      AppDataSyncManager.instance.notifyProfileUpdated();
      return true;
    }
    _lastError = res.errorMessage ?? 'Failed to update preferences';
    return false;
  }

  /// Clears profile upon logout
  void clearProfile() {
    resetToDefault();
  }

  void resetToDefault() {
    _knownAllergies = const [];
    _chronicConditions = const [];
    _emergencyContactName = '';
    _emergencyContactRelationship = '';
    _emergencyContactPhone = '';
    _healthCardNumber = '';
    _healthCardStatus = '';
    _healthCardQrPayload = '';
    _insuranceProvider = '';
    _insurancePolicyNumber = '';
    _insuranceStatus = '';
    _totalRecordsCount = 0;
    _medicalRecordsCount = 0;
    _dentalRecordsCount = 0;
    _visionRecordsCount = 0;
    _unreadNotificationsCount = 0;
    _memberSince = '';
    _profileVisibility = 'PRIVATE';
    _emailNotifications = true;
    _smsNotifications = true;
    _pushNotifications = true;
    _currentProfile = const PatientProfile(
      fullName: 'Sarah Jenkins',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      dateOfBirth: '12/05/1992',
      gender: 'Female',
      bloodGroup: 'O+',
      mobile: '+1 234 567 890',
      email: 'sarah.j@email.com',
      address: '425 Clinical Way, Suite 200',
      avatarAsset: 'assets/images/bfd7567e81ca7834f0c16f9b7bd9f27a17ef5ae1.png',
      patientId: '#HV-920512',
      ciNumber: 'CI-882-0911',
    );
    notifyListeners();
    AppDataSyncManager.instance.notifyProfileUpdated();
  }
}

/// Type alias for modern architectural references
typedef PatientProfileStore = DemoPatientProfileStore;

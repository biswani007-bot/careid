import '../domain/models/appointment_models.dart';
import 'appointments_service.dart';
import '../../../../core/state/app_data_sync_manager.dart';

/// Authoritative, API-backed Appointments Repository for CareID Patient App.
/// Handles dynamic synchronization with GET /appointments, POST /appointments,
/// PATCH /appointments/:id/reschedule, and PATCH /appointments/:id/cancel.
class AppointmentsRepository {
  AppointmentsRepository._();
  static final AppointmentsRepository instance = AppointmentsRepository._();

  static bool isTestMode = false;
  bool get isTestModeInstance => isTestMode;

  final List<Doctor> _doctors = [
    const Doctor(
      id: '9f4e74e5-a872-4a54-b089-a354b0e37e60',
      name: 'Dr. Sarah Jenkins, MD',
      specialty: 'Cardiology & Internal Medicine',
      category: 'Medical',
      clinic: 'Mount Sinai Hospital • Building B, Room 402',
      address: '1190 5th Ave, Suite 400, New York, NY 10029',
      rating: 4.9,
      reviewsCount: 128,
      yearsExperience: 14,
      patientsCount: '4.8k+',
      successRate: '99%',
      isVerified: true,
      isPrimary: true,
      avatarAsset: 'assets/images/doctor_sarah_jenkins.png',
      bio:
          'Board-certified cardiologist specializing in preventive cardiology, cardiovascular diagnostics, and heart failure management at Mount Sinai.',
      education: [
        'Harvard Medical School — MD with Honors',
        'Stanford University Medical Center — Cardiology Fellowship',
      ],
      languages: ['English', 'Spanish', 'French'],
      acceptedInsurances: [
        'Blue Cross Blue Shield',
        'Aetna Choice POS II',
        'Cigna Open Access Plus',
        'UnitedHealthcare Choice',
        'Medicare Part B',
      ],
      copayAmount: r'$35 Copay',
    ),
    const Doctor(
      id: 'doc_1',
      name: 'Dr. Julian Vance, DDS',
      specialty: 'Restorative Dentistry & Orthodontics',
      category: 'Dental',
      clinic: 'City Dental Care • Metro Pavilion',
      address: '452 Lexington Ave, Floor 8, New York, NY 10017',
      rating: 4.9,
      reviewsCount: 128,
      yearsExperience: 12,
      patientsCount: '3.2k+',
      successRate: '99%',
      isVerified: true,
      isPrimary: false,
      avatarAsset: 'assets/images/doctor_julian_vance.png',
      bio:
          'Specialist in restorative dentistry, smile makeovers, and orthodontic care with over a decade of clinical experience.',
      education: [
        'NYU College of Dentistry — DDS',
        'Columbia University — Orthodontics Fellowship',
      ],
      languages: ['English', 'Spanish'],
      acceptedInsurances: [
        'Delta Dental',
        'MetLife Dental',
        'Cigna Dental',
        'Guardian',
      ],
      copayAmount: r'$25 Copay',
    ),
    const Doctor(
      id: 'doc_3',
      name: 'Dr. Laura Zhao, OD',
      specialty: 'Optometry & Retinal Diagnostics',
      category: 'Vision',
      clinic: 'VisionCare Eye Specialists',
      address: '780 3rd Ave, Suite 1200, New York, NY 10017',
      rating: null,
      reviewsCount: 0,
      yearsExperience: 8,
      patientsCount: '1.9k+',
      successRate: '98%',
      isVerified: true,
      isPrimary: false,
      avatarAsset: 'assets/images/doctor_laura_zhao.png',
      bio:
          'Specializes in comprehensive eye examinations, glaucoma management, and advanced retinal OCT tomography imaging.',
      education: [
        'SUNY College of Optometry — OD',
        'Bascom Palmer Eye Institute — Retinal Diagnostics Residency',
      ],
      languages: ['English', 'Mandarin'],
      acceptedInsurances: [
        'VSP Vision Care',
        'EyeMed',
        'Davis Vision',
        'Blue Cross Blue Shield',
      ],
      copayAmount: r'$20 Copay',
    ),
  ];

  final List<ConsultationOption> _consultationOptions = const [
    ConsultationOption(
      id: 'in_person',
      title: 'In-Person Consultation',
      description:
          'Comprehensive in-clinic physical examination, diagnostics, and vital checks.',
      duration: '45 min',
      price: r'$120',
      iconSvg: 'assets/icons/book_type_in_person.svg',
    ),
    ConsultationOption(
      id: 'telehealth',
      title: 'Telehealth Video Visit',
      description:
          'Virtual consultation via high-definition encrypted CareID portal from home.',
      duration: '30 min',
      price: r'$75',
      iconSvg: 'assets/icons/video_camera.svg',
    ),
    ConsultationOption(
      id: 'follow_up',
      title: 'Follow-Up Review',
      description:
          'Quick review of lab results, medication adjustments, or test feedback.',
      duration: '20 min',
      price: r'$50',
      iconSvg: 'assets/icons/clock_timer.svg',
    ),
  ];

  List<PatientAppointment> _appointments = [];
  List<Doctor> _supplementalDoctors = [];
  bool _isSyncing = false;
  String? _lastDoctorsError;
  String? _lastAppointmentsError;

  bool get isSyncing => _isSyncing;
  String? get lastDoctorsError => _lastDoctorsError;
  String? get lastAppointmentsError => _lastAppointmentsError;

  List<Doctor> getDoctors({String category = 'All', String query = ''}) {
    final combined = <Doctor>[..._doctors];
    final existingIds = combined.map((d) => d.id).toSet();
    for (final doc in _supplementalDoctors) {
      if (!existingIds.contains(doc.id)) {
        combined.add(doc);
        existingIds.add(doc.id);
      }
    }
    return combined.where((doc) {
      final matchesCategory = (category == 'All' || doc.category == category);
      final matchesQuery = query.isEmpty ||
          doc.name.toLowerCase().contains(query.toLowerCase()) ||
          doc.specialty.toLowerCase().contains(query.toLowerCase()) ||
          doc.clinic.toLowerCase().contains(query.toLowerCase());
      return matchesCategory && matchesQuery;
    }).toList();
  }

  Doctor? getDoctorById(String id) {
    final all = getDoctors();
    try {
      return all.firstWhere((d) => d.id == id);
    } catch (_) {
      return all.isNotEmpty ? all.first : null;
    }
  }

  List<ConsultationOption> getConsultationOptions() => _consultationOptions;

  List<PatientAppointment> getAppointments({AppointmentStatus? status}) {
    _ensureInitialAppointments();
    if (status == null) return _appointments;
    return _appointments.where((a) => a.status == status).toList();
  }

  PatientAppointment? getAppointmentById(String id) {
    _ensureInitialAppointments();
    try {
      return _appointments.firstWhere((a) => a.id == id);
    } catch (_) {
      return _appointments.isNotEmpty ? _appointments.first : null;
    }
  }

  /// Cancels an appointment on backend via PATCH /appointments/:id/cancel,
  /// then re-fetches authoritative list from GET /appointments.
  Future<bool> cancelAppointment(String id, {String? reason}) async {
    _ensureInitialAppointments();
    
    // Optimistic local update
    final idx = _appointments.indexWhere((a) => a.id == id);
    if (idx != -1) {
      final old = _appointments[idx];
      _appointments[idx] = old.copyWith(status: AppointmentStatus.cancelled);
      AppDataSyncManager.instance.notifyAppointmentsUpdated();
    }

    if (!isTestMode && !id.startsWith('#APT-') && !id.startsWith('CR-') && !id.startsWith('app_')) {
      final res = await AppointmentsService.instance.cancelAppointment(
        id,
        reason: reason ?? 'Cancelled by patient from CareID app',
      );
      if (!res.isSuccess) {
        return false;
      }
    }

    // Refresh authoritative state from backend
    await syncWithBackend();
    return true;
  }

  /// Reschedules an appointment on backend via PATCH /appointments/:id/reschedule,
  /// then re-fetches authoritative list from GET /appointments.
  Future<bool> rescheduleAppointment(
    String id, {
    required String newDate,
    required String newStartTime,
  }) async {
    if (!isTestMode && !id.startsWith('#APT-') && !id.startsWith('CR-') && !id.startsWith('app_')) {
      final res = await AppointmentsService.instance.rescheduleAppointment(
        id,
        newDate: newDate,
        newStartTime: newStartTime,
      );
      if (!res.isSuccess) {
        return false;
      }
    }

    await syncWithBackend();
    return true;
  }

  /// Books a new appointment via POST /appointments,
  /// then re-fetches authoritative list from GET /appointments.
  Future<bool> bookAppointment({
    required String doctorProfileId,
    required String appointmentDate,
    required String startTime,
    int durationMinutes = 15,
    String? type,
  }) async {
    if (!isTestMode) {
      final res = await AppointmentsService.instance.bookAppointment(
        doctorProfileId: doctorProfileId,
        appointmentDate: appointmentDate,
        startTime: startTime,
        durationMinutes: durationMinutes,
        type: type ?? 'IN_PERSON',
      );
      if (!res.isSuccess) {
        return false;
      }
    }

    await syncWithBackend();
    return true;
  }

  void addAppointment(PatientAppointment appointment) {
    _appointments.insert(0, appointment);
    AppDataSyncManager.instance.notifyAppointmentsUpdated();
  }

  /// Queries live backend for doctors and appointments via GET /doctors and GET /appointments
  Future<void> syncWithBackend() async {
    _isSyncing = true;
    try {
      final docRes = await AppointmentsService.instance.getDoctors();
      if (docRes.isSuccess && docRes.data != null) {
        _supplementalDoctors = List.from(docRes.data!);
        _lastDoctorsError = null;
      } else {
        _lastDoctorsError = docRes.errorMessage;
      }

      final appRes = await AppointmentsService.instance.getMyAppointments();
      if (appRes.isSuccess && appRes.data != null) {
        _appointments = List.from(appRes.data!);
        _lastAppointmentsError = null;
        AppDataSyncManager.instance.notifyAppointmentsUpdated();
      } else {
        _lastAppointmentsError = appRes.errorMessage;
      }
    } catch (e) {
      _lastDoctorsError = e.toString();
      _lastAppointmentsError = e.toString();
    } finally {
      _isSyncing = false;
    }
  }

  void _ensureInitialAppointments() {
    if (!isTestMode) return;
    if (_appointments.isEmpty) {
      _appointments = [
        PatientAppointment(
          id: '#APT-88204-NY',
          doctor: _doctors[0],
          consultationType: _consultationOptions[0],
          appointmentDate: DateTime.now().add(const Duration(days: 3)),
          timeSlot: '09:45 AM',
          duration: '45 min',
          status: AppointmentStatus.upcoming,
          patientName: 'Sarah Jenkins',
          careIdNumber: 'CID #8472-9901',
          reasonForVisit:
              'Routine cardiovascular checkup and lipid panel analysis.',
          copay: r'$35.00',
          insuranceName: 'Blue Cross Blue Shield • PPO Gold',
          vaultRecordsSynced: 5,
          qrPassRef: 'APT-88204',
        ),
        PatientAppointment(
          id: '#APT-77192-NY',
          doctor: _doctors[1],
          consultationType: _consultationOptions[0],
          appointmentDate: DateTime.now().add(const Duration(days: 15)),
          timeSlot: '02:30 PM',
          duration: '30 min',
          status: AppointmentStatus.upcoming,
          patientName: 'Sarah Jenkins',
          careIdNumber: 'CID #8472-9901',
          reasonForVisit:
              'Bi-annual dental hygiene cleaning and oral prophylaxis.',
          copay: r'$25.00',
          insuranceName: 'Delta Dental Premier',
          vaultRecordsSynced: 3,
          qrPassRef: 'APT-77192',
        ),
        PatientAppointment(
          id: '#APT-66102-NY',
          doctor: _doctors[2],
          consultationType: _consultationOptions[0],
          appointmentDate: DateTime.now().subtract(const Duration(days: 42)),
          timeSlot: '11:00 AM',
          duration: '45 min',
          status: AppointmentStatus.completed,
          patientName: 'Sarah Jenkins',
          careIdNumber: 'CID #8472-9901',
          reasonForVisit: 'Annual comprehensive vision exam & retinal check.',
          copay: r'$20.00',
          insuranceName: 'VSP Vision Care',
          vaultRecordsSynced: 2,
          qrPassRef: 'APT-66102',
        ),
        PatientAppointment(
          id: '#APT-44112-NY',
          doctor: _doctors[0],
          consultationType: _consultationOptions[0],
          appointmentDate: DateTime.now().subtract(const Duration(days: 120)),
          timeSlot: '10:00 AM',
          duration: '30 min',
          status: AppointmentStatus.cancelled,
          patientName: 'Sarah Jenkins',
          careIdNumber: 'CID #8472-9901',
          reasonForVisit: 'Routine consultation.',
          copay: r'$35.00',
          insuranceName: 'Blue Cross Blue Shield',
          vaultRecordsSynced: 1,
          qrPassRef: 'APT-44112',
        ),
      ];
    }
  }
}

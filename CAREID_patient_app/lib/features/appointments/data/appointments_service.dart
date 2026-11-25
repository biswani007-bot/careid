import '../../../core/network/api_client.dart';
import '../domain/models/appointment_models.dart';

class AppointmentsService {
  static final AppointmentsService _instance = AppointmentsService._internal();
  factory AppointmentsService() => _instance;
  static AppointmentsService get instance => _instance;

  AppointmentsService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Fetches doctors from GET /doctors
  Future<ApiResponse<List<Doctor>>> getDoctors() async {
    final response = await _client.get('/doctors');
    if (response.isSuccess) {
      final List<Doctor> doctors = [];
      dynamic list = response.data;
      if (list is Map && list['data'] is List) {
        list = list['data'];
      }

      if (list is List) {
        for (final item in list) {
          if (item is Map) {
            final name = item['fullName']?.toString() ?? item['name']?.toString() ?? 'Dr. Specialist';
            final specialty = item['primarySpecialization']?.toString() ?? item['specialty']?.toString() ?? item['department']?.toString() ?? 'General Medicine';
            final clinic = item['facility'] is Map ? item['facility']['name']?.toString() ?? 'CareID Medical Pavilion' : (item['hospital']?.toString() ?? item['clinic']?.toString() ?? 'CareID Medical Pavilion');
            final rating = (item['rating'] as num?)?.toDouble() ?? 4.9;
            final years = (item['yearsOfExperience'] as num?)?.toInt() ?? (item['experienceYears'] as num?)?.toInt() ?? 10;
            final id = item['id']?.toString() ?? 'doc_${doctors.length + 1}';

            String category = 'Medical';
            final practiceType = item['clinicalPracticeType']?.toString().toUpperCase() ?? '';
            if (practiceType.contains('VETERINARY') || specialty.toLowerCase().contains('vet')) {
              category = 'Veterinary';
            } else if (specialty.toLowerCase().contains('dent')) {
              category = 'Dental';
            } else if (specialty.toLowerCase().contains('opt') ||
                specialty.toLowerCase().contains('vision') ||
                specialty.toLowerCase().contains('eye')) {
              category = 'Vision';
            }

            doctors.add(Doctor(
              id: id,
              name: name,
              specialty: specialty,
              category: category,
              clinic: clinic,
              address: '1190 5th Ave, Suite 400, New York, NY 10029',
              rating: rating,
              reviewsCount: 128,
              yearsExperience: years,
              patientsCount: '3.4k+',
              successRate: '99%',
              isVerified: true,
              isPrimary: doctors.isEmpty,
              avatarAsset: 'assets/images/doctor_sarah_jenkins.png',
              bio: 'Board-certified specialist with extensive clinical expertise.',
              education: const ['Harvard Medical School — MD', 'Residency in Internal Medicine'],
              languages: const ['English', 'Spanish'],
              acceptedInsurances: const ['Blue Cross Blue Shield', 'Aetna', 'Cigna'],
              copayAmount: r'$35 Copay',
            ));
          }
        }
      }

      return ApiResponse.success(response.statusCode, doctors);
    }

    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load doctors');
  }

  /// Fetches patient appointments from GET /appointments or GET /appointments/patient/my-appointments
  Future<ApiResponse<List<PatientAppointment>>> getMyAppointments() async {
    ApiResponse<dynamic> response = await _client.get('/appointments');
    if (!response.isSuccess) {
      response = await _client.get('/appointments/patient/my-appointments');
    }

    if (response.isSuccess) {
      final List<PatientAppointment> appointments = [];
      dynamic list = response.data;
      if (list is Map && list['data'] is List) {
        list = list['data'];
      }

      if (list is List) {
        for (final item in list) {
          if (item is Map) {
            final id = item['id']?.toString() ?? 'app_${appointments.length + 1}';
            
            // Extract doctor details
            String doctorName = 'Dr. Specialist';
            String specialty = 'General Medicine';
            String clinic = 'Mount Sinai Hospital • Building B';
            
            if (item['doctor'] is Map) {
              final docMap = item['doctor'] as Map;
              final fn = docMap['firstName']?.toString() ?? '';
              final ln = docMap['lastName']?.toString() ?? '';
              doctorName = '$fn $ln'.trim();
              if (doctorName.isEmpty) doctorName = 'Dr. Specialist';
              specialty = docMap['specialization']?.toString() ?? specialty;
            } else if (item['doctorName'] != null) {
              doctorName = item['doctorName'].toString();
            } else if (item['doctor'] != null) {
              doctorName = item['doctor'].toString();
            }

            if (item['facility'] is Map) {
              final fac = item['facility'] as Map;
              clinic = fac['name']?.toString() ?? clinic;
            }

            final dateStr = item['appointmentDate']?.toString() ?? item['date']?.toString();
            DateTime date = DateTime.now().add(const Duration(days: 3));
            if (dateStr != null) {
              date = DateTime.tryParse(dateStr) ?? date;
            }

            final timeSlot = item['startTime']?.toString() ?? item['time']?.toString() ?? item['timeSlot']?.toString() ?? '10:30 AM';
            final statusStr = item['status']?.toString().toUpperCase() ?? 'UPCOMING';

            AppointmentStatus status = AppointmentStatus.upcoming;
            if (statusStr.contains('COMPLET')) {
              status = AppointmentStatus.completed;
            } else if (statusStr.contains('CANCEL')) {
              status = AppointmentStatus.cancelled;
            }

            String category = 'Medical';
            final practiceType = item['clinicalPracticeType']?.toString().toUpperCase() ?? '';
            if (practiceType.contains('VETERINARY') || specialty.toLowerCase().contains('vet')) {
              category = 'Veterinary';
            } else if (specialty.toLowerCase().contains('dent')) {
              category = 'Dental';
            } else if (specialty.toLowerCase().contains('opt') ||
                specialty.toLowerCase().contains('vision') ||
                specialty.toLowerCase().contains('eye')) {
              category = 'Vision';
            }

            String patientName = 'Patient';
            String careIdNumber = '';
            if (item['patient'] is Map) {
              final pMap = item['patient'] as Map;
              final pfn = pMap['firstName']?.toString() ?? '';
              final pln = pMap['lastName']?.toString() ?? '';
              patientName = '$pfn $pln'.trim();
              if (patientName.isEmpty) patientName = pMap['fullName']?.toString() ?? 'Patient';
              careIdNumber = pMap['mrn']?.toString() ?? pMap['patientNumber']?.toString() ?? '';
            }

            appointments.add(PatientAppointment(
              id: id,
              doctor: Doctor(
                id: (item['doctor'] is Map ? item['doctor']['id']?.toString() : null) ?? 'doc_api',
                name: doctorName,
                specialty: specialty,
                category: category,
                clinic: clinic,
                address: '1190 5th Ave, Suite 400, New York, NY 10029',
                rating: 4.9,
                reviewsCount: 128,
                yearsExperience: 14,
                patientsCount: '4.8k+',
                successRate: '99%',
                isVerified: true,
                isPrimary: appointments.isEmpty,
                avatarAsset: 'assets/images/doctor_sarah_jenkins.png',
                bio: 'Board-certified specialist practicing at $clinic.',
                education: const ['Harvard Medical School — MD'],
                languages: const ['English', 'Spanish'],
                acceptedInsurances: const ['Blue Cross Blue Shield'],
                copayAmount: r'$35 Copay',
              ),
              consultationType: const ConsultationOption(
                id: 'in_person',
                title: 'In-Person Consultation',
                description: 'Clinical examination and consultation',
                duration: '45 min',
                price: r'$120.00',
                iconSvg: 'assets/icons/book_type_in_person.svg',
              ),
              appointmentDate: date,
              timeSlot: timeSlot,
              status: status,
              patientName: patientName.isNotEmpty ? patientName : 'Patient',
              careIdNumber: careIdNumber.isNotEmpty ? careIdNumber : 'CID #${id.substring(0, id.length > 8 ? 8 : id.length).toUpperCase()}',
              reasonForVisit: item['reason']?.toString() ?? 'Cardiovascular Checkup & Echo Review',
              copay: r'$35.00',
              insuranceName: 'Blue Cross Blue Shield • PPO Gold',
              vaultRecordsSynced: 5,
              qrPassRef: 'KP-2026-${id.substring(0, id.length > 4 ? 4 : id.length).toUpperCase()}',
            ));
          }
        }
      }

      return ApiResponse.success(response.statusCode, appointments);
    }

    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load appointments');
  }

  /// Formats any 12-hour or informal time string to strict 24-hour HH:mm required by backend DTO
  static String formatTo24Hour(String timeStr) {
    final trimmed = timeStr.trim();
    final match24 = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(trimmed);
    if (match24 != null) {
      final h = int.parse(match24.group(1)!);
      final m = match24.group(2)!;
      return '${h.toString().padLeft(2, '0')}:$m';
    }
    final match12 = RegExp(r'^(\d{1,2}):(\d{2})\s*([AP]M)?$', caseSensitive: false).firstMatch(trimmed);
    if (match12 != null) {
      int h = int.parse(match12.group(1)!);
      final m = match12.group(2)!;
      final period = match12.group(3)?.toUpperCase();
      if (period == 'PM' && h < 12) h += 12;
      if (period == 'AM' && h == 12) h = 0;
      return '${h.toString().padLeft(2, '0')}:$m';
    }
    return '09:00';
  }

  /// Books a new appointment via POST /appointments
  Future<ApiResponse<dynamic>> bookAppointment({
    required String doctorProfileId,
    required String appointmentDate,
    required String startTime,
    int durationMinutes = 15,
    String? type,
  }) async {
    final body = {
      'doctorProfileId': doctorProfileId,
      'appointmentDate': appointmentDate,
      'startTime': formatTo24Hour(startTime),
      'durationMinutes': durationMinutes,
      ...?type == null ? null : {'type': type},
    };
    return await _client.post('/appointments', body: body);
  }

  /// Fetches schedules from GET /schedules (optionally filtered by doctorProfileId)
  Future<ApiResponse<List<Map<String, dynamic>>>> getSchedules({
    String? doctorProfileId,
  }) async {
    final query = (doctorProfileId != null && doctorProfileId.isNotEmpty)
        ? '?doctorProfileId=${Uri.encodeQueryComponent(doctorProfileId)}'
        : '';
    final response = await _client.get('/schedules$query');
    if (response.isSuccess) {
      dynamic list = response.data;
      if (list is Map && list['data'] is List) {
        list = list['data'];
      }
      if (list is List) {
        var parsed = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        if (doctorProfileId != null && doctorProfileId.isNotEmpty) {
          final filtered = parsed
              .where((s) => s['doctorProfileId']?.toString() == doctorProfileId)
              .toList();
          if (filtered.isNotEmpty) {
            parsed = filtered;
          }
        }
        return ApiResponse.success(response.statusCode, parsed);
      }
      return ApiResponse.success(response.statusCode, []);
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load schedules',
    );
  }

  /// Fetches slots for a schedule from GET /schedules/:id/slots
  /// DEF-02: Always passes both fromDate=YYYY-MM-DD and toDate=YYYY-MM-DD query params.
  Future<ApiResponse<List<Map<String, dynamic>>>> getScheduleSlots(
    String scheduleId, {
    required String fromDate,
    required String toDate,
  }) async {
    final path =
        '/schedules/$scheduleId/slots?fromDate=${Uri.encodeQueryComponent(fromDate)}&toDate=${Uri.encodeQueryComponent(toDate)}';
    final response = await _client.get(path);
    if (response.isSuccess) {
      dynamic list = response.data;
      if (list is Map && list['data'] is List) {
        list = list['data'];
      }
      if (list is List) {
        final parsed = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        return ApiResponse.success(response.statusCode, parsed);
      }
      return ApiResponse.success(response.statusCode, []);
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load schedule slots',
    );
  }

  /// Reschedules an existing appointment via PUT /appointments/:id/reschedule
  Future<ApiResponse<dynamic>> rescheduleAppointment(
    String appointmentId, {
    required String newDate,
    required String newStartTime,
  }) async {
    final body = {
      'appointmentDate': newDate,
      'startTime': formatTo24Hour(newStartTime),
    };
    return await _client.put('/appointments/$appointmentId/reschedule', body: body);
  }

  /// Cancels an appointment via PUT /appointments/:id/cancel
  Future<ApiResponse<dynamic>> cancelAppointment(
    String appointmentId, {
    String? reason,
  }) async {
    final body = {
      'cancellationReason': reason ?? 'Patient request',
    };
    return await _client.put('/appointments/$appointmentId/cancel', body: body);
  }
}


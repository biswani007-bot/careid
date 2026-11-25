/// Model representing an attachment on a health record.
class RecordAttachment {
  final String name;
  final String meta;
  final bool isPdf;

  const RecordAttachment({
    required this.name,
    required this.meta,
    this.isPdf = true,
  });
}

/// Model representing the full details of a health record,
/// following the Record Details reference layout.
class RecordDetailData {
  final String title;
  final String category;
  final String recordType;
  final String serviceDate;
  final String lastAccessed;
  final String patientName;
  final String patientId;
  final String primaryDiagnosis;
  final String providerName;
  final String providerLicense;
  final String providerSpecialty;
  final String providerSubSpecialty;
  final String providerInitials;
  final String providerClinic;
  final String providerSuite;
  final String previewImage;
  final String previewTag;
  final String previewBadge;
  final String previewExportTag;
  final String previewCode;
  final List<RecordAttachment> attachments;
  final String doctorObservations;
  final String observationsDate;
  final String verificationId;
  final String id;

  String get recordDate => serviceDate;
  String get hospital => providerClinic;
  String get doctorName => providerName;

  const RecordDetailData({
    required this.title,
    required this.category,
    required this.recordType,
    required this.serviceDate,
    required this.lastAccessed,
    required this.patientName,
    required this.patientId,
    required this.primaryDiagnosis,
    required this.providerName,
    required this.providerLicense,
    required this.providerSpecialty,
    required this.providerSubSpecialty,
    required this.providerInitials,
    required this.providerClinic,
    required this.providerSuite,
    required this.previewImage,
    required this.previewTag,
    required this.previewBadge,
    required this.previewExportTag,
    required this.previewCode,
    required this.attachments,
    required this.doctorObservations,
    required this.observationsDate,
    this.verificationId = '#VIS-512-094',
    this.id = '',
  });

  /// Factory corresponding directly to Screenshot 2 (Dental X-Ray).
  factory RecordDetailData.dentalXRay({String? patientName}) {
    return RecordDetailData(
      title: 'Dental X-Ray',
      category: 'Dental',
      recordType: 'Dental Record',
      serviceDate: 'Oct 04, 2023',
      lastAccessed: 'Oct 18, 2023 • 11:20 AM',
      patientName: patientName ?? 'Sarah Jenkins',
      patientId: 'CID-8472-9901',
      primaryDiagnosis: 'Routine Dental Examination',
      providerName: 'Dr. Michael Vance',
      providerLicense: 'Lic. #OD- 7721',
      providerSpecialty: 'Dental Care Specialists',
      providerSubSpecialty: 'Dentist & Orthodontist',
      providerInitials: 'MV',
      providerClinic: 'Metro Eye Pavilion',
      providerSuite: 'Suite 210, Metro Eye Pavilion',
      previewImage: 'assets/images/dental_panoramic_xray.png',
      previewTag: 'PDF Report • 2.4 MB',
      previewBadge: 'Care ID',
      previewExportTag: 'HIGH-RES OCT EXPORT',
      previewCode: 'P-78102',
      attachments: const [
        RecordAttachment(
          name: 'Dental X-Ray Observations.pdf',
          meta: '3.1 MB • Official Diagnostic Document',
          isPdf: true,
        ),
        RecordAttachment(
          name: 'Dental X-Ray.jpg',
          meta: '1.4 MB • High Resolution Scan',
          isPdf: false,
        ),
      ],
      doctorObservations:
          '“Routine panoramic X-ray taken for annual check-up. No significant abnormalities noted in the jaw structure or tooth alignment. Patient advised to continue regular flossing.”',
      observationsDate: 'Oct 05, 2023',
      verificationId: 'ID: #VIS-512-094',
    );
  }

  /// Factory for Full Blood Count Analysis record.
  factory RecordDetailData.fullBloodCount({String? patientName}) {
    return RecordDetailData(
      title: 'Full Blood Count Analysis',
      category: 'Lab Report',
      recordType: 'Diagnostic Lab Report',
      serviceDate: 'Oct 24, 2023',
      lastAccessed: 'Oct 24, 2023 • 02:45 PM',
      patientName: patientName ?? 'Sarah Jenkins',
      patientId: 'CID-8472-9901',
      primaryDiagnosis: 'Complete Blood Count & Metabolic Panel',
      providerName: 'Dr. Sarah Chen',
      providerLicense: 'Lic. #MD- 4819',
      providerSpecialty: "St. Mary's General Hospital",
      providerSubSpecialty: 'Clinical Pathologist & Hematologist',
      providerInitials: 'SC',
      providerClinic: "St. Mary's Diagnostic Wing",
      providerSuite: "Suite 405, St. Mary's General Hospital",
      previewImage: 'assets/images/scan_report_camera_sample.png',
      previewTag: 'PDF Report • 2.4 MB',
      previewBadge: 'Care ID',
      previewExportTag: 'VERIFIED LAB EXPORT',
      previewCode: 'LAB-90412',
      attachments: const [
        RecordAttachment(
          name: 'Full Blood Count Analysis.pdf',
          meta: '2.4 MB • Official Diagnostic Document',
          isPdf: true,
        ),
        RecordAttachment(
          name: 'Biomarker_Panel_Breakdown.pdf',
          meta: '1.2 MB • Complete Chemistry Results',
          isPdf: true,
        ),
      ],
      doctorObservations:
          '“Erythrocyte count, platelet distribution, and hemoglobin levels are within expected reference ranges. Mild vitamin D deficiency noted. Advised routine follow-up in 6 months.”',
      observationsDate: 'Oct 24, 2023',
      verificationId: 'ID: #LAB-881-204',
    );
  }

  /// Factory for Chronic Allergy Prescription.
  factory RecordDetailData.chronicAllergy({String? patientName}) {
    return RecordDetailData(
      title: 'Chronic Allergy Prescription',
      category: 'Prescription',
      recordType: 'Pharmacy Prescription',
      serviceDate: 'Sep 30, 2023',
      lastAccessed: 'Sep 30, 2023 • 10:15 AM',
      patientName: patientName ?? 'Sarah Jenkins',
      patientId: 'CID-8472-9901',
      primaryDiagnosis: 'Seasonal Allergic Rhinitis',
      providerName: 'Dr. Marcus Thorne',
      providerLicense: 'Lic. #MD- 6204',
      providerSpecialty: 'City Healthcare Clinic',
      providerSubSpecialty: 'Allergist & Immunologist',
      providerInitials: 'MT',
      providerClinic: 'City Healthcare Clinic',
      providerSuite: 'Suite 102, City Healthcare Clinic',
      previewImage: 'assets/images/prescription_attachment_sample.png',
      previewTag: 'Rx Document • 1.1 MB',
      previewBadge: 'Care ID',
      previewExportTag: 'E-PRESCRIPTION VERIFIED',
      previewCode: 'RX-44821',
      attachments: const [
        RecordAttachment(
          name: 'Chronic Allergy Prescription.pdf',
          meta: '1.1 MB • Official E-Prescription',
          isPdf: true,
        ),
      ],
      doctorObservations:
          '“Patient presented with allergic rhinitis symptoms. Cetirizine 10mg daily and Fluticasone nasal spray prescribed for 30 days. Avoid known seasonal allergen triggers.”',
      observationsDate: 'Sep 30, 2023',
      verificationId: 'ID: #RX-104-582',
    );
  }

  /// Factory constructed dynamically from live backend API JSON (GET /records).
  factory RecordDetailData.fromBackendJson(Map<String, dynamic> json, {String? patientName}) {
    final title = json['title']?.toString() ?? 'Clinical Health Record';
    final subCat = json['subCategory']?.toString() ?? '';
    final rawCat = json['category']?.toString() ?? 'Medical';
    String category = rawCat;
    if (subCat.toUpperCase() == 'CONSULTATION') {
      category = 'Consultation';
    } else if (rawCat.toUpperCase() == 'GENERAL_MEDICAL') {
      category = 'Medical';
    } else if (rawCat.toUpperCase().contains('DENT')) {
      category = 'Dental';
    } else if (rawCat.toUpperCase().contains('OPT') || rawCat.toUpperCase().contains('VIS')) {
      category = 'Vision';
    }

    final recordType = json['recordType']?.toString() ??
        (subCat.isNotEmpty ? subCat : 'Clinical Record');

    final encounters = json['encounters'] is List ? json['encounters'] as List : const [];
    final firstEncounter = encounters.isNotEmpty && encounters.first is Map
        ? encounters.first as Map
        : null;

    final rawDate = firstEncounter?['encounterDate']?.toString() ??
        json['date']?.toString() ??
        json['createdAt']?.toString() ??
        '';
    final serviceDate = rawDate.isNotEmpty ? rawDate.split('T').first : 'Recent';

    final doctor = firstEncounter?['providerName']?.toString() ??
        json['attendingDoctor']?.toString() ??
        json['doctor']?.toString() ??
        'Attending Clinician';

    final clinic = firstEncounter?['facilityName']?.toString() ??
        json['facilityName']?.toString() ??
        'CareID Partner Clinic';

    final diagnoses = json['diagnoses'] is List ? json['diagnoses'] as List : const [];
    final firstDiag = diagnoses.isNotEmpty && diagnoses.first is Map
        ? diagnoses.first as Map
        : null;
    final diagnosis = firstDiag?['description']?.toString() ??
        json['chiefComplaint']?.toString() ??
        json['diagnosis']?.toString() ??
        json['summary']?.toString() ??
        'Clinical Evaluation';

    final notesParts = <String>[];
    if (json['clinicalNotes'] != null && json['clinicalNotes'].toString().trim().isNotEmpty) {
      notesParts.add(json['clinicalNotes'].toString().trim());
    }
    if (json['treatmentPlan'] != null && json['treatmentPlan'].toString().trim().isNotEmpty) {
      notesParts.add('Plan: ${json['treatmentPlan'].toString().trim()}');
    }
    final observations = notesParts.isNotEmpty
        ? notesParts.join('\n\n')
        : (json['observations']?.toString() ?? 'Clinical record verified in CareID Vault.');

    final rawAttachments = json['attachments'];
    final List<RecordAttachment> attachments = [];
    if (rawAttachments is List && rawAttachments.isNotEmpty) {
      for (final att in rawAttachments) {
        if (att is Map) {
          final originalName = att['originalName']?.toString() ??
              att['filename']?.toString() ??
              'Attachment.pdf';
          final mime = att['mimeType']?.toString() ?? 'application/pdf';
          final isPdf = mime.contains('pdf') || originalName.toLowerCase().endsWith('.pdf');
          final sizeBytes = (att['fileSize'] as num?)?.toInt() ??
              (att['size'] as num?)?.toInt() ??
              0;
          final sizeStr = sizeBytes > 0
              ? (sizeBytes > 1024 * 1024
                  ? '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB'
                  : '${(sizeBytes / 1024).ceil()} KB')
              : 'Verified';
          attachments.add(
            RecordAttachment(
              name: originalName,
              meta: '$sizeStr • CareID Certified Clinical Asset',
              isPdf: isPdf,
            ),
          );
        }
      }
    }

    if (attachments.isEmpty) {
      attachments.add(
        const RecordAttachment(
          name: 'Clinical_Record_Summary.pdf',
          meta: 'Encrypted Patient Document',
          isPdf: true,
        ),
      );
    }

    final initials = doctor
        .split(' ')
        .where((s) => s.isNotEmpty && !s.contains('.'))
        .take(2)
        .map((s) => s[0])
        .join()
        .toUpperCase();
    final rawId = json['id']?.toString() ?? '';
    final shortId = rawId.isNotEmpty
        ? rawId.substring(0, rawId.length > 10 ? 10 : rawId.length).toUpperCase()
        : 'REC-2026';

    return RecordDetailData(
      title: title,
      category: category,
      recordType: recordType,
      serviceDate: serviceDate,
      lastAccessed: 'Synced',
      patientName: patientName ?? 'Patient',
      patientId: json['patientProfileId']?.toString() ??
          json['patientId']?.toString() ??
          '',
      primaryDiagnosis: diagnosis,
      providerName: doctor,
      providerLicense: 'CareID Verified Provider',
      providerSpecialty: recordType,
      providerSubSpecialty: json['status']?.toString() ?? 'Clinical Record',
      providerInitials: initials.isNotEmpty ? initials : 'MD',
      providerClinic: clinic,
      providerSuite: clinic,
      previewImage: 'assets/images/dental_panoramic_xray.png',
      previewTag: 'Clinical Record',
      previewBadge: 'Care ID',
      previewExportTag: 'AUTHENTICATED CLINICAL EXPORT',
      previewCode: shortId,
      attachments: attachments,
      doctorObservations: observations,
      observationsDate: serviceDate,
      verificationId: 'ID: #$shortId',
      id: rawId,
    );
  }

  /// Factory constructed read-only from GET /patients/:id/prescriptions item.
  factory RecordDetailData.fromPrescriptionJson(
    Map<String, dynamic> json, {
    String? patientName,
  }) {
    final items = json['items'] is List ? json['items'] as List : const [];
    final firstItem = items.isNotEmpty && items.first is Map ? items.first as Map : null;
    final drugName = firstItem?['drugName']?.toString() ?? 'Prescribed Medication';
    final dosage = firstItem?['dosage']?.toString() ?? '';
    final frequency = firstItem?['frequency']?.toString() ?? '';
    final title = dosage.isNotEmpty ? '$drugName ($dosage)' : drugName;
    final rawDate = json['prescribedAt']?.toString() ?? json['createdAt']?.toString() ?? '';
    final serviceDate = rawDate.isNotEmpty ? rawDate.split('T').first : 'Recent';
    final doctor = json['doctorName']?.toString().trim() ?? 'Attending Physician';
    final safeDoctor = (doctor == 'Dr.' || doctor.isEmpty) ? 'Prescribing Clinician' : doctor;
    final rawId = json['id']?.toString() ?? '';
    final shortId = rawId.isNotEmpty
        ? rawId.substring(0, rawId.length > 8 ? 8 : rawId.length).toUpperCase()
        : 'RX-2026';

    return RecordDetailData(
      title: title,
      category: 'Prescription',
      recordType: 'Electronic Prescription',
      serviceDate: serviceDate,
      lastAccessed: 'Synced',
      patientName: patientName ?? 'Patient',
      patientId: json['patientProfileId']?.toString() ?? '',
      primaryDiagnosis: json['diagnosisCode']?.toString() ?? 'Active Medication Regimen',
      providerName: safeDoctor,
      providerLicense: 'Status: ${json['status']?.toString() ?? 'ACTIVE'}',
      providerSpecialty: frequency.isNotEmpty ? frequency : 'As directed',
      providerSubSpecialty: json['collected'] == true ? 'Collected' : 'Pending Pickup',
      providerInitials: 'RX',
      providerClinic: 'CareID Pharmacy Network',
      providerSuite: 'Read-Only Prescription Record',
      previewImage: 'assets/images/prescription_attachment_sample.png',
      previewTag: 'Rx Document',
      previewBadge: 'Care ID',
      previewExportTag: 'E-PRESCRIPTION (READ ONLY)',
      previewCode: 'RX-$shortId',
      attachments: [
        RecordAttachment(
          name: 'Prescription_$shortId.pdf',
          meta: 'Official E-Prescription Record',
          isPdf: true,
        ),
      ],
      doctorObservations:
          json['notes']?.toString() ?? '$drugName $dosage • $frequency',
      observationsDate: serviceDate,
      verificationId: 'ID: #RX-$shortId',
      id: rawId,
    );
  }

  /// Factory constructed read-only from GET /referrals item.
  factory RecordDetailData.fromReferralJson(
    Map<String, dynamic> json, {
    String? patientName,
  }) {
    final refNum = json['referralNumber']?.toString() ?? 'REF';
    final specialty = json['specialtyRequired']?.toString() ?? 'Specialist Consultation';
    final refDoc = json['referringDoctor'] is Map ? json['referringDoctor'] as Map : null;
    final recFac = json['receivingFacility'] is Map ? json['receivingFacility'] as Map : null;
    final doctorName = refDoc?['fullName']?.toString() ?? 'Referring Clinician';
    final facilityName = recFac?['name']?.toString() ?? 'Receiving Medical Center';
    final rawDate = json['createdAt']?.toString() ?? '';
    final serviceDate = rawDate.isNotEmpty ? rawDate.split('T').first : 'Recent';
    final rawId = json['id']?.toString() ?? '';
    final shortId = rawId.isNotEmpty
        ? rawId.substring(0, rawId.length > 8 ? 8 : rawId.length).toUpperCase()
        : refNum;

    return RecordDetailData(
      title: 'Referral: $specialty ($refNum)',
      category: 'Referral',
      recordType: json['referralType']?.toString() ?? 'SPECIALIST_CONSULTATION',
      serviceDate: serviceDate,
      lastAccessed: 'Synced',
      patientName: patientName ?? 'Patient',
      patientId: json['patientId']?.toString() ?? '',
      primaryDiagnosis: json['reasonForReferral']?.toString() ?? 'Specialist Evaluation',
      providerName: doctorName,
      providerLicense: 'Status: ${json['status']?.toString() ?? 'SUBMITTED'}',
      providerSpecialty: specialty,
      providerSubSpecialty: 'Priority: ${json['priority']?.toString() ?? 'ROUTINE'}',
      providerInitials: 'RF',
      providerClinic: facilityName,
      providerSuite: facilityName,
      previewImage: 'assets/images/dental_panoramic_xray.png',
      previewTag: 'Specialist Referral',
      previewBadge: 'Care ID',
      previewExportTag: 'REFERRAL RECORD (READ ONLY)',
      previewCode: refNum,
      attachments: [
        RecordAttachment(
          name: 'Referral_$refNum.pdf',
          meta: 'CareID Clinical Referral Summary',
          isPdf: true,
        ),
      ],
      doctorObservations:
          json['clinicalSummary']?.toString() ?? 'Specialist referral submitted.',
      observationsDate: serviceDate,
      verificationId: 'ID: #$refNum ($shortId)',
      id: rawId,
    );
  }
}



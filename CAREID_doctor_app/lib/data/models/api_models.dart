// CAREID DOCTOR APPLICATION — AUTHORITATIVE API MODELS
// Generated strictly according to Postman collection & backend response structures.

// ==========================================
// 1. AUTHENTICATION & SESSION MODELS
// ==========================================

class OtpRequestResult {
  final String challengeId;
  final String message;

  OtpRequestResult({required this.challengeId, required this.message});

  factory OtpRequestResult.fromJson(Map<String, dynamic> json) {
    return OtpRequestResult(
      challengeId: json['challengeId'] ?? '',
      message: json['message'] ?? '',
    );
  }
}

class OtpVerifyResult {
  final String accessToken;
  final String refreshToken;
  final String? expiresIn;

  OtpVerifyResult({
    required this.accessToken,
    required this.refreshToken,
    this.expiresIn,
  });

  factory OtpVerifyResult.fromJson(Map<String, dynamic> json) {
    return OtpVerifyResult(
      accessToken: json['accessToken'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
      expiresIn: json['expiresIn']?.toString(),
    );
  }
}

class UserMe {
  final String id;
  final String phone;
  final String status;
  final List<String> roles;
  final List<String> permissions;

  UserMe({
    required this.id,
    required this.phone,
    required this.status,
    required this.roles,
    required this.permissions,
  });

  factory UserMe.fromJson(Map<String, dynamic> json) {
    return UserMe(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      permissions: (json['permissions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class ActiveSession {
  final String id;
  final String? ipAddress;
  final String? userAgent;
  final String? createdAt;
  final String? lastActiveAt;
  final bool isCurrent;

  ActiveSession({
    required this.id,
    this.ipAddress,
    this.userAgent,
    this.createdAt,
    this.lastActiveAt,
    this.isCurrent = false,
  });

  factory ActiveSession.fromJson(Map<String, dynamic> json) {
    return ActiveSession(
      id: json['id'] ?? '',
      ipAddress: json['ipAddress'],
      userAgent: json['userAgent'],
      createdAt: json['createdAt'],
      lastActiveAt: json['lastActiveAt'],
      isCurrent: json['isCurrent'] ?? false,
    );
  }
}

// ==========================================
// 2. DOCTOR PROFILE & REGISTRY MODELS
// ==========================================

class DoctorProfile {
  final String id;
  final String userId;
  final String fullName;
  final String? gender;
  final String? dateOfBirth;
  final String? professionalSummary;
  final int? yearsOfExperience;
  final String primarySpecialization;
  final List<String> secondarySpecializations;
  final String? medicalCouncil;
  final String? registrationNumber;
  final String? licenseNumber;
  final String? providerIdentifier;
  final String verificationStatus;
  final String? department;
  final List<String> languagesSpoken;
  final String? createdAt;

  DoctorProfile({
    required this.id,
    required this.userId,
    required this.fullName,
    this.gender,
    this.dateOfBirth,
    this.professionalSummary,
    this.yearsOfExperience,
    required this.primarySpecialization,
    this.secondarySpecializations = const [],
    this.medicalCouncil,
    this.registrationNumber,
    this.licenseNumber,
    this.providerIdentifier,
    required this.verificationStatus,
    this.department,
    this.languagesSpoken = const [],
    this.createdAt,
  });

  factory DoctorProfile.fromJson(Map<String, dynamic> json) {
    return DoctorProfile(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      fullName: json['fullName'] ?? 'Dr. Vance',
      gender: json['gender'],
      dateOfBirth: json['dateOfBirth'],
      professionalSummary: json['professionalSummary'],
      yearsOfExperience: json['yearsOfExperience'] as int?,
      primarySpecialization: json['primarySpecialization'] ?? 'General Medicine',
      secondarySpecializations: (json['secondarySpecializations'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      medicalCouncil: json['medicalCouncil'],
      registrationNumber: json['registrationNumber'],
      licenseNumber: json['licenseNumber'],
      providerIdentifier: json['providerIdentifier'],
      verificationStatus: json['verificationStatus'] ?? 'PENDING',
      department: json['department'],
      languagesSpoken: (json['languagesSpoken'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      createdAt: json['createdAt'],
    );
  }
}

class DoctorDocumentItem {
  final String id;
  final String documentType;
  final String? medicalAttachmentId;
  final String verificationStatus;
  final String? createdAt;

  DoctorDocumentItem({
    required this.id,
    required this.documentType,
    this.medicalAttachmentId,
    required this.verificationStatus,
    this.createdAt,
  });

  factory DoctorDocumentItem.fromJson(Map<String, dynamic> json) {
    return DoctorDocumentItem(
      id: json['id'] ?? '',
      documentType: json['documentType'] ?? 'DOCUMENT',
      medicalAttachmentId: json['medicalAttachmentId'],
      verificationStatus: json['verificationStatus'] ?? 'PENDING',
      createdAt: json['createdAt'],
    );
  }
}

class DoctorStats {
  final int totalDoctors;
  final int verifiedDoctors;
  final int pendingDoctors;
  final int suspendedDoctors;

  DoctorStats({
    required this.totalDoctors,
    required this.verifiedDoctors,
    required this.pendingDoctors,
    required this.suspendedDoctors,
  });

  factory DoctorStats.fromJson(Map<String, dynamic> json) {
    return DoctorStats(
      totalDoctors: json['totalDoctors'] ?? 0,
      verifiedDoctors: json['verifiedDoctors'] ?? 0,
      pendingDoctors: json['pendingDoctors'] ?? 0,
      suspendedDoctors: json['suspendedDoctors'] ?? 0,
    );
  }
}

// ==========================================
// 3. FACILITY MODELS
// ==========================================

class FacilityItem {
  final String id;
  final String name;
  final String? legalName;
  final String? facilityCode;
  final String? facilityType;
  final String? streetAddress;
  final String? city;
  final String? phone;

  FacilityItem({
    required this.id,
    required this.name,
    this.legalName,
    this.facilityCode,
    this.facilityType,
    this.streetAddress,
    this.city,
    this.phone,
  });

  factory FacilityItem.fromJson(Map<String, dynamic> json) {
    return FacilityItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      legalName: json['legalName'],
      facilityCode: json['facilityCode'],
      facilityType: json['facilityType'],
      streetAddress: json['streetAddress'],
      city: json['city'],
      phone: json['phone'],
    );
  }
}

class FacilityDepartment {
  final String id;
  final String name;
  final String? code;

  FacilityDepartment({required this.id, required this.name, this.code});

  factory FacilityDepartment.fromJson(Map<String, dynamic> json) {
    return FacilityDepartment(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      code: json['code'],
    );
  }
}

// ==========================================
// 4. ENTERPRISE QR & HEALTH CARDS
// ==========================================

class QrVerificationResult {
  final bool isValid;
  final String status;
  final String entityType;
  final String entityId;
  final String? ownerId;
  final String? scannedAt;
  final String? failureReason;

  QrVerificationResult({
    required this.isValid,
    required this.status,
    required this.entityType,
    required this.entityId,
    this.ownerId,
    this.scannedAt,
    this.failureReason,
  });

  factory QrVerificationResult.fromJson(Map<String, dynamic> json) {
    return QrVerificationResult(
      isValid: json['isValid'] == true,
      status: json['status'] ?? 'INVALID',
      entityType: json['entityType'] ?? 'UNKNOWN',
      entityId: json['entityId'] ?? '',
      ownerId: json['ownerId'],
      scannedAt: json['scannedAt'],
      failureReason: json['failureReason'],
    );
  }
}

class HealthCardItem {
  final String id;
  final String patientProfileId;
  final String cardNumber;
  final String status;
  final bool emergencyFlag;
  final String? issuedAt;
  final String? expiresAt;

  HealthCardItem({
    required this.id,
    required this.patientProfileId,
    required this.cardNumber,
    required this.status,
    this.emergencyFlag = false,
    this.issuedAt,
    this.expiresAt,
  });

  factory HealthCardItem.fromJson(Map<String, dynamic> json) {
    return HealthCardItem(
      id: json['id'] ?? '',
      patientProfileId: json['patientProfileId'] ?? '',
      cardNumber: json['cardNumber'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      emergencyFlag: json['emergencyFlag'] ?? false,
      issuedAt: json['issuedAt'],
      expiresAt: json['expiresAt'],
    );
  }
}

// ==========================================
// 5. APPOINTMENTS & SCHEDULES
// ==========================================

class AppointmentModel {
  final String id;
  final String? appointmentNumber;
  final String? patientProfileId;
  final String? doctorProfileId;
  final String? facilityId;
  final String appointmentDate;
  final String startTime;
  final String endTime;
  final int durationMinutes;
  final String type;
  final String status;
  final String? reason;
  final String? notes;
  final Map<String, dynamic>? patientProfile;
  final Map<String, dynamic>? doctorProfile;
  final Map<String, dynamic>? facility;

  AppointmentModel({
    required this.id,
    this.appointmentNumber,
    this.patientProfileId,
    this.doctorProfileId,
    this.facilityId,
    required this.appointmentDate,
    required this.startTime,
    required this.endTime,
    this.durationMinutes = 15,
    required this.type,
    required this.status,
    this.reason,
    this.notes,
    this.patientProfile,
    this.doctorProfile,
    this.facility,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: json['id'] ?? '',
      appointmentNumber: json['appointmentNumber'],
      patientProfileId: json['patientProfileId'],
      doctorProfileId: json['doctorProfileId'],
      facilityId: json['facilityId'],
      appointmentDate: json['appointmentDate']?.toString() ?? '',
      startTime: json['startTime'] ?? '09:00',
      endTime: json['endTime'] ?? '09:30',
      durationMinutes: json['durationMinutes'] ?? 15,
      type: json['type'] ?? 'IN_PERSON',
      status: json['status'] ?? 'SCHEDULED',
      reason: json['reason'],
      notes: json['notes'],
      patientProfile: json['patientProfile'] as Map<String, dynamic>?,
      doctorProfile: json['doctorProfile'] as Map<String, dynamic>?,
      facility: json['facility'] as Map<String, dynamic>?,
    );
  }
}

// ==========================================
// 6. REFERRALS & CARE COORDINATION
// ==========================================

class ReferralModel {
  final String id;
  final String? referralNumber;
  final String patientId;
  final String referringDoctorId;
  final String referringFacilityId;
  final String? receivingDoctorId;
  final String receivingFacilityId;
  final String priority;
  final String referralType;
  final String status;
  final String reasonForReferral;
  final String? clinicalSummary;
  final String? specialtyRequired;
  final String? expiresAt;
  final String? createdAt;

  ReferralModel({
    required this.id,
    this.referralNumber,
    required this.patientId,
    required this.referringDoctorId,
    required this.referringFacilityId,
    this.receivingDoctorId,
    required this.receivingFacilityId,
    required this.priority,
    required this.referralType,
    required this.status,
    required this.reasonForReferral,
    this.clinicalSummary,
    this.specialtyRequired,
    this.expiresAt,
    this.createdAt,
  });

  factory ReferralModel.fromJson(Map<String, dynamic> json) {
    return ReferralModel(
      id: json['id'] ?? '',
      referralNumber: json['referralNumber'],
      patientId: json['patientId'] ?? '',
      referringDoctorId: json['referringDoctorId'] ?? '',
      referringFacilityId: json['referringFacilityId'] ?? '',
      receivingDoctorId: json['receivingDoctorId'],
      receivingFacilityId: json['receivingFacilityId'] ?? '',
      priority: json['priority'] ?? 'ROUTINE',
      referralType: json['referralType'] ?? 'SPECIALIST_CONSULTATION',
      status: json['status'] ?? 'SUBMITTED',
      reasonForReferral: json['reasonForReferral'] ?? '',
      clinicalSummary: json['clinicalSummary'],
      specialtyRequired: json['specialtyRequired'],
      expiresAt: json['expiresAt'],
      createdAt: json['createdAt'],
    );
  }
}

class ReferralStats {
  final int totalReferrals;
  final int pendingTriageCount;
  final int acceptedCount;
  final int completedCount;
  final double avgCompletionTimeHours;

  ReferralStats({
    required this.totalReferrals,
    required this.pendingTriageCount,
    required this.acceptedCount,
    required this.completedCount,
    required this.avgCompletionTimeHours,
  });

  factory ReferralStats.fromJson(Map<String, dynamic> json) {
    return ReferralStats(
      totalReferrals: json['totalReferrals'] ?? 0,
      pendingTriageCount: json['pendingTriageCount'] ?? 0,
      acceptedCount: json['acceptedCount'] ?? 0,
      completedCount: json['completedCount'] ?? 0,
      avgCompletionTimeHours: (json['avgCompletionTimeHours'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

// ==========================================
// 7. NOTIFICATIONS & ALERTS
// ==========================================

class NotificationItem {
  final String id;
  final String? title;
  final String message;
  final String? notificationType;
  final String? channel;
  final String status;
  final String? createdAt;

  NotificationItem({
    required this.id,
    this.title,
    required this.message,
    this.notificationType,
    this.channel,
    required this.status,
    this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] ?? '',
      title: json['title'] ?? 'CareID Notification',
      message: json['message'] ?? '',
      notificationType: json['notificationType'] ?? 'ALERT',
      channel: json['channel'] ?? 'IN_APP',
      status: json['status'] ?? 'SENT',
      createdAt: json['createdAt'],
    );
  }
}

class NotificationPreferencesModel {
  final String? id;
  final String? userId;
  final bool emailEnabled;
  final bool smsEnabled;
  final bool pushEnabled;
  final bool inAppEnabled;

  NotificationPreferencesModel({
    this.id,
    this.userId,
    required this.emailEnabled,
    required this.smsEnabled,
    required this.pushEnabled,
    required this.inAppEnabled,
  });

  factory NotificationPreferencesModel.fromJson(Map<String, dynamic> json) {
    return NotificationPreferencesModel(
      id: json['id'],
      userId: json['userId'],
      emailEnabled: json['emailEnabled'] ?? true,
      smsEnabled: json['smsEnabled'] ?? true,
      pushEnabled: json['pushEnabled'] ?? true,
      inAppEnabled: json['inAppEnabled'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
        'emailEnabled': emailEnabled,
        'smsEnabled': smsEnabled,
        'pushEnabled': pushEnabled,
        'inAppEnabled': inAppEnabled,
      };
}

// ==========================================
// 8. OCR & DOCUMENT EXTRACTION
// ==========================================

class OcrJobItem {
  final String id;
  final String? medicalAttachmentId;
  final String documentType;
  final String status;
  final double? overallConfidence;
  final String? confidenceLevel;
  final List<OcrExtractedField> extractedFields;
  final String? createdAt;

  OcrJobItem({
    required this.id,
    this.medicalAttachmentId,
    required this.documentType,
    required this.status,
    this.overallConfidence,
    this.confidenceLevel,
    this.extractedFields = const [],
    this.createdAt,
  });

  factory OcrJobItem.fromJson(Map<String, dynamic> json) {
    final fields = (json['extractedFields'] as List<dynamic>?)
            ?.map((e) => OcrExtractedField.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    return OcrJobItem(
      id: json['id'] ?? '',
      medicalAttachmentId: json['medicalAttachmentId'],
      documentType: json['documentType'] ?? 'LAB_REPORT',
      status: json['status'] ?? 'COMPLETED',
      overallConfidence: (json['overallConfidence'] as num?)?.toDouble(),
      confidenceLevel: json['confidenceLevel'],
      extractedFields: fields,
      createdAt: json['createdAt'],
    );
  }
}

class OcrExtractedField {
  final String id;
  final String fieldName;
  final String fieldValue;
  final double confidence;
  final String validationStatus;
  final bool requiresReview;

  OcrExtractedField({
    required this.id,
    required this.fieldName,
    required this.fieldValue,
    required this.confidence,
    required this.validationStatus,
    this.requiresReview = false,
  });

  factory OcrExtractedField.fromJson(Map<String, dynamic> json) {
    return OcrExtractedField(
      id: json['id'] ?? '',
      fieldName: json['fieldName'] ?? '',
      fieldValue: json['fieldValue'] ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      validationStatus: json['validationStatus'] ?? 'VALIDATED',
      requiresReview: json['requiresReview'] ?? false,
    );
  }
}

// ==========================================
// 9. SUPPORT TICKETS & PETS
// ==========================================

class SupportTicketItem {
  final String id;
  final String subject;
  final String description;
  final String status;
  final String priority;
  final String? createdAt;

  SupportTicketItem({
    required this.id,
    required this.subject,
    required this.description,
    required this.status,
    required this.priority,
    this.createdAt,
  });

  factory SupportTicketItem.fromJson(Map<String, dynamic> json) {
    return SupportTicketItem(
      id: json['id'] ?? '',
      subject: json['subject'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'OPEN',
      priority: json['priority'] ?? 'MEDIUM',
      createdAt: json['createdAt'],
    );
  }
}

class PetItem {
  final String id;
  final String name;
  final String species;
  final String? breed;
  final int? age;
  final String? ownerId;
  final String? microchipNumber;

  PetItem({
    required this.id,
    required this.name,
    required this.species,
    this.breed,
    this.age,
    this.ownerId,
    this.microchipNumber,
  });

  factory PetItem.fromJson(Map<String, dynamic> json) {
    return PetItem(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      species: json['species'] ?? 'Canine',
      breed: json['breed'],
      age: json['age'] as int?,
      ownerId: json['ownerId'],
      microchipNumber: json['microchipNumber'],
    );
  }
}

// ==========================================
// 12. MEDICAL RECORD & ATTACHMENT MODELS
// ==========================================

class MedicalRecordModel {
  final String id;
  final String patientProfileId;
  final String? doctorProfileId;
  final String? facilityId;
  final String recordType;
  final String title;
  final String? description;
  final String? diagnosis;
  final String? icd10Code;
  final String? notes;
  final String status;
  final String? recordedAt;
  final String? createdAt;
  final List<AttachmentModel> attachments;
  final List<MedicalRecordAddendumModel> addenda;

  MedicalRecordModel({
    required this.id,
    required this.patientProfileId,
    this.doctorProfileId,
    this.facilityId,
    required this.recordType,
    required this.title,
    this.description,
    this.diagnosis,
    this.icd10Code,
    this.notes,
    required this.status,
    this.recordedAt,
    this.createdAt,
    this.attachments = const [],
    this.addenda = const [],
  });

  factory MedicalRecordModel.fromJson(Map<String, dynamic> json) {
    var rawAttachments = json['attachments'];
    List<AttachmentModel> parsedAttachments = [];
    if (rawAttachments is List) {
      parsedAttachments = rawAttachments
          .map((a) => AttachmentModel.fromJson(a as Map<String, dynamic>))
          .toList();
    }

    var rawAddenda = json['addenda'];
    List<MedicalRecordAddendumModel> parsedAddenda = [];
    if (rawAddenda is List) {
      parsedAddenda = rawAddenda
          .map((a) => MedicalRecordAddendumModel.fromJson(a as Map<String, dynamic>))
          .toList();
    }

    return MedicalRecordModel(
      id: json['id']?.toString() ?? '',
      patientProfileId: json['patientProfileId']?.toString() ?? '',
      doctorProfileId: json['doctorProfileId']?.toString(),
      facilityId: json['facilityId']?.toString(),
      recordType: json['recordType']?.toString() ?? json['type']?.toString() ?? 'GENERAL',
      title: json['title']?.toString() ?? 'Medical Record',
      description: json['description']?.toString(),
      diagnosis: json['diagnosis']?.toString(),
      icd10Code: json['icd10Code']?.toString(),
      notes: json['notes']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
      recordedAt: json['recordedAt']?.toString() ?? json['recordDate']?.toString(),
      createdAt: json['createdAt']?.toString(),
      attachments: parsedAttachments,
      addenda: parsedAddenda,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'patientProfileId': patientProfileId,
      if (doctorProfileId != null) 'doctorProfileId': doctorProfileId,
      if (facilityId != null) 'facilityId': facilityId,
      'recordType': recordType,
      'title': title,
      if (description != null) 'description': description,
      if (diagnosis != null) 'diagnosis': diagnosis,
      if (icd10Code != null) 'icd10Code': icd10Code,
      if (notes != null) 'notes': notes,
      'status': status,
      if (recordedAt != null) 'recordedAt': recordedAt,
    };
  }
}

class AttachmentModel {
  final String id;
  final String? medicalRecordId;
  final String fileName;
  final String fileType;
  final int fileSize;
  final String s3Key;
  final String? downloadUrl;
  final String? uploadedAt;

  AttachmentModel({
    required this.id,
    this.medicalRecordId,
    required this.fileName,
    required this.fileType,
    required this.fileSize,
    required this.s3Key,
    this.downloadUrl,
    this.uploadedAt,
  });

  factory AttachmentModel.fromJson(Map<String, dynamic> json) {
    return AttachmentModel(
      id: json['id']?.toString() ?? '',
      medicalRecordId: json['medicalRecordId']?.toString(),
      fileName: json['fileName']?.toString() ?? 'attachment',
      fileType: json['fileType']?.toString() ?? json['mimeType']?.toString() ?? 'application/octet-stream',
      fileSize: (json['fileSize'] as num?)?.toInt() ?? 0,
      s3Key: json['s3Key']?.toString() ?? json['url']?.toString() ?? '',
      downloadUrl: json['downloadUrl']?.toString() ?? json['url']?.toString(),
      uploadedAt: json['uploadedAt']?.toString() ?? json['createdAt']?.toString(),
    );
  }
}

class MedicalRecordAddendumModel {
  final String id;
  final String medicalRecordId;
  final String authorDoctorId;
  final String note;
  final String reason;
  final String createdAt;

  MedicalRecordAddendumModel({
    required this.id,
    required this.medicalRecordId,
    required this.authorDoctorId,
    required this.note,
    required this.reason,
    required this.createdAt,
  });

  factory MedicalRecordAddendumModel.fromJson(Map<String, dynamic> json) {
    return MedicalRecordAddendumModel(
      id: json['id']?.toString() ?? '',
      medicalRecordId: json['medicalRecordId']?.toString() ?? '',
      authorDoctorId: json['authorDoctorId']?.toString() ?? '',
      note: json['note']?.toString() ?? '',
      reason: json['reason']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}

// ==========================================
// 13. PHASE 3 SPECIALIZED MODELS (DENTAL, VISION, LAB, RX, CHAT, SHARE)
// ==========================================

class DentalRecordModel {
  final String id;
  final String patientId;
  final String toothNumber; // FDI 11-48
  final String surface; // M, D, O, B, L
  final String procedureCode; // CDT D0120 etc.
  final String procedureName;
  final String diagnosis;
  final String status;
  final String? date;
  final String? notes;

  DentalRecordModel({
    required this.id,
    required this.patientId,
    required this.toothNumber,
    required this.surface,
    required this.procedureCode,
    required this.procedureName,
    required this.diagnosis,
    required this.status,
    this.date,
    this.notes,
  });

  factory DentalRecordModel.fromJson(Map<String, dynamic> json) {
    return DentalRecordModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? '',
      toothNumber: json['toothNumber']?.toString() ?? '',
      surface: json['surface']?.toString() ?? '',
      procedureCode: json['procedureCode']?.toString() ?? '',
      procedureName: json['procedureName']?.toString() ?? '',
      diagnosis: json['diagnosis']?.toString() ?? '',
      status: json['status']?.toString() ?? 'COMPLETED',
      date: json['date']?.toString(),
      notes: json['notes']?.toString(),
    );
  }
}

class VisionRecordModel {
  final String id;
  final String patientId;
  final String date;
  // Right Eye (OD)
  final double odSphere;
  final double odCylinder;
  final int odAxis;
  final String odVcu;
  // Left Eye (OS)
  final double osSphere;
  final double osCylinder;
  final int osAxis;
  final String osVcu;
  final double? intraocularPressure;
  final String? notes;

  VisionRecordModel({
    required this.id,
    required this.patientId,
    required this.date,
    required this.odSphere,
    required this.odCylinder,
    required this.odAxis,
    required this.odVcu,
    required this.osSphere,
    required this.osCylinder,
    required this.osAxis,
    required this.osVcu,
    this.intraocularPressure,
    this.notes,
  });

  factory VisionRecordModel.fromJson(Map<String, dynamic> json) {
    return VisionRecordModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      odSphere: (json['odSphere'] as num?)?.toDouble() ?? 0.0,
      odCylinder: (json['odCylinder'] as num?)?.toDouble() ?? 0.0,
      odAxis: (json['odAxis'] as num?)?.toInt() ?? 0,
      odVcu: json['odVcu']?.toString() ?? '20/20',
      osSphere: (json['osSphere'] as num?)?.toDouble() ?? 0.0,
      osCylinder: (json['osCylinder'] as num?)?.toDouble() ?? 0.0,
      osAxis: (json['osAxis'] as num?)?.toInt() ?? 0,
      osVcu: json['osVcu']?.toString() ?? '20/20',
      intraocularPressure: (json['intraocularPressure'] as num?)?.toDouble(),
      notes: json['notes']?.toString(),
    );
  }
}

class LaboratoryReportModel {
  final String id;
  final String patientId;
  final String testName;
  final String panelName;
  final String status; // NORMAL, ABNORMAL, CRITICAL
  final String value;
  final String unit;
  final String referenceRange;
  final String date;
  final String? labName;

  LaboratoryReportModel({
    required this.id,
    required this.patientId,
    required this.testName,
    required this.panelName,
    required this.status,
    required this.value,
    required this.unit,
    required this.referenceRange,
    required this.date,
    this.labName,
  });

  factory LaboratoryReportModel.fromJson(Map<String, dynamic> json) {
    return LaboratoryReportModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? '',
      testName: json['testName']?.toString() ?? '',
      panelName: json['panelName']?.toString() ?? '',
      status: json['status']?.toString() ?? 'NORMAL',
      value: json['value']?.toString() ?? '',
      unit: json['unit']?.toString() ?? '',
      referenceRange: json['referenceRange']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      labName: json['labName']?.toString(),
    );
  }
}

class PrescriptionSubmissionModel {
  final String patientProfileId;
  final String? notes;
  final List<Map<String, dynamic>> items;

  PrescriptionSubmissionModel({
    required this.patientProfileId,
    this.notes,
    required this.items,
  });

  Map<String, dynamic> toJson() {
    return {
      'patientProfileId': patientProfileId,
      if (notes != null) 'notes': notes,
      'items': items,
    };
  }
}

class DrugInteractionResultModel {
  final String severity; // HIGH, MODERATE, LOW, NONE
  final String medicationA;
  final String medicationB;
  final String description;
  final String clinicalRecommendation;

  DrugInteractionResultModel({
    required this.severity,
    required this.medicationA,
    required this.medicationB,
    required this.description,
    required this.clinicalRecommendation,
  });

  factory DrugInteractionResultModel.fromJson(Map<String, dynamic> json) {
    return DrugInteractionResultModel(
      severity: json['severity']?.toString() ?? 'LOW',
      medicationA: json['medicationA']?.toString() ?? '',
      medicationB: json['medicationB']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      clinicalRecommendation: json['clinicalRecommendation']?.toString() ?? '',
    );
  }
}

class PatientConversationModel {
  final String id;
  final String patientId;
  final String patientName;
  final String lastMessage;
  final String lastMessageTime;
  final int unreadCount;

  PatientConversationModel({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.unreadCount,
  });

  factory PatientConversationModel.fromJson(Map<String, dynamic> json) {
    return PatientConversationModel(
      id: json['id']?.toString() ?? '',
      patientId: json['patientId']?.toString() ?? '',
      patientName: json['patientName']?.toString() ?? 'Patient',
      lastMessage: json['lastMessage']?.toString() ?? '',
      lastMessageTime: json['lastMessageTime']?.toString() ?? '',
      unreadCount: (json['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class DirectMessageModel {
  final String id;
  final String conversationId;
  final String senderId;
  final String senderRole;
  final String text;
  final String timestamp;
  final bool isFromMe;

  DirectMessageModel({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.senderRole,
    required this.text,
    required this.timestamp,
    required this.isFromMe,
  });

  factory DirectMessageModel.fromJson(Map<String, dynamic> json) {
    return DirectMessageModel(
      id: json['id']?.toString() ?? '',
      conversationId: json['conversationId']?.toString() ?? '',
      senderId: json['senderId']?.toString() ?? '',
      senderRole: json['senderRole']?.toString() ?? 'DOCTOR',
      text: json['text']?.toString() ?? '',
      timestamp: json['timestamp']?.toString() ?? '',
      isFromMe: json['isFromMe'] == true,
    );
  }
}

class RecordShareGrantModel {
  final String id;
  final String medicalRecordId;
  final String recipientDoctorId;
  final String recipientName;
  final String permissions; // READ_ONLY, FULL
  final String expiresAt;
  final String status; // ACTIVE, REVOKED, EXPIRED

  RecordShareGrantModel({
    required this.id,
    required this.medicalRecordId,
    required this.recipientDoctorId,
    required this.recipientName,
    required this.permissions,
    required this.expiresAt,
    required this.status,
  });

  factory RecordShareGrantModel.fromJson(Map<String, dynamic> json) {
    return RecordShareGrantModel(
      id: json['id']?.toString() ?? '',
      medicalRecordId: json['medicalRecordId']?.toString() ?? '',
      recipientDoctorId: json['recipientDoctorId']?.toString() ?? '',
      recipientName: json['recipientName']?.toString() ?? 'Doctor',
      permissions: json['permissions']?.toString() ?? 'READ_ONLY',
      expiresAt: json['expiresAt']?.toString() ?? '',
      status: json['status']?.toString() ?? 'ACTIVE',
    );
  }
}


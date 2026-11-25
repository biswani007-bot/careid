import '../../../core/network/api_client.dart';
import '../presentation/models/record_detail_data.dart';

class HealthRecordsService {
  static final HealthRecordsService _instance = HealthRecordsService._internal();
  factory HealthRecordsService() => _instance;
  static HealthRecordsService get instance => _instance;

  HealthRecordsService._internal();

  final ApiClient _client = ApiClient.instance;
  static bool isTestMode = false;
  bool get isTestModeInstance => isTestMode;

  /// Fetches clinical records from GET /records
  Future<ApiResponse<List<RecordDetailData>>> getRecords({String? patientName}) async {
    if (isTestMode) {
      return ApiResponse.success(200, [
        RecordDetailData.fullBloodCount(),
        RecordDetailData.chronicAllergy(),
      ]);
    }
    final response = await _client.get('/records');
    if (response.isSuccess) {
      final List<RecordDetailData> records = [];
      dynamic listData;
      if (response.data is List) {
        listData = response.data;
      } else if (response.data is Map && response.data['data'] is List) {
        listData = response.data['data'];
      }

      if (listData is List) {
        for (final item in listData) {
          if (item is Map) {
            records.add(RecordDetailData.fromBackendJson(
              Map<String, dynamic>.from(item),
              patientName: patientName,
            ));
          }
        }
      }

      return ApiResponse.success(response.statusCode, records);
    }

    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load records from backend',
      [],
    );
  }

  /// Fetches single record by ID
  Future<ApiResponse<RecordDetailData>> getRecordById(String id, {String? patientName}) async {
    final response = await _client.get('/records/$id');
    if (response.isSuccess && response.data is Map) {
      final record = RecordDetailData.fromBackendJson(
        Map<String, dynamic>.from(response.data as Map),
        patientName: patientName,
      );
      return ApiResponse.success(response.statusCode, record);
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Record not found');
  }

  /// Fetches a pre-signed download URL for an attachment
  Future<ApiResponse<String>> getAttachmentPresignedUrl(String attachmentId) async {
    final response = await _client.get('/attachments/$attachmentId/download-url');
    if (response.isSuccess && response.data is Map) {
      final url = response.data['downloadUrl'] ?? response.data['url'];
      if (url != null) return ApiResponse.success(response.statusCode, url.toString());
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Download URL not available');
  }

  /// Fetches dental category records
  Future<ApiResponse<List<RecordDetailData>>> getDentalRecords({String? patientName}) async {
    if (isTestMode) {
      return ApiResponse.success(200, []);
    }
    final response = await _client.get('/records/dental');
    if (response.isSuccess) {
      return _parseRecordsList(response, patientName: patientName, fallbackCategory: 'Dental');
    }
    // Fallback to filtering all records
    final allRes = await getRecords(patientName: patientName);
    if (allRes.isSuccess && allRes.data != null) {
      final filtered = allRes.data!.where((r) => r.category.toLowerCase().contains('dent')).toList();
      return ApiResponse.success(allRes.statusCode, filtered);
    }
    return response.mapEmptyList();
  }

  /// Fetches vision category records
  Future<ApiResponse<List<RecordDetailData>>> getVisionRecords({String? patientName}) async {
    if (isTestMode) {
      return ApiResponse.success(200, []);
    }
    final response = await _client.get('/records/vision');
    if (response.isSuccess) {
      return _parseRecordsList(response, patientName: patientName, fallbackCategory: 'Vision');
    }
    // Fallback to filtering all records
    final allRes = await getRecords(patientName: patientName);
    if (allRes.isSuccess && allRes.data != null) {
      final filtered = allRes.data!.where((r) =>
        r.category.toLowerCase().contains('opt') ||
        r.category.toLowerCase().contains('vis') ||
        r.category.toLowerCase().contains('eye')
      ).toList();
      return ApiResponse.success(allRes.statusCode, filtered);
    }
    return response.mapEmptyList();
  }

  /// Read-only fetch of patient prescriptions via GET /patients/:patientId/prescriptions
  Future<ApiResponse<List<RecordDetailData>>> getPatientPrescriptions(
    String patientProfileId, {
    String? patientName,
  }) async {
    if (isTestMode || patientProfileId.isEmpty) {
      return ApiResponse.success(200, []);
    }
    final response = await _client.get('/patients/$patientProfileId/prescriptions');
    if (response.isSuccess) {
      dynamic listData = response.data;
      if (listData is Map && listData['data'] is List) {
        listData = listData['data'];
      }
      final list = <RecordDetailData>[];
      if (listData is List) {
        for (final item in listData) {
          if (item is Map) {
            list.add(
              RecordDetailData.fromPrescriptionJson(
                Map<String, dynamic>.from(item),
                patientName: patientName,
              ),
            );
          }
        }
      }
      return ApiResponse.success(response.statusCode, list);
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load prescriptions',
      [],
    );
  }

  /// Read-only fetch of clinical referrals via GET /referrals
  Future<ApiResponse<List<RecordDetailData>>> getReferrals({String? patientName}) async {
    if (isTestMode) {
      return ApiResponse.success(200, []);
    }
    final response = await _client.get('/referrals');
    if (response.isSuccess) {
      dynamic listData = response.data;
      if (listData is Map && listData['data'] is List) {
        listData = listData['data'];
      }
      final list = <RecordDetailData>[];
      if (listData is List) {
        for (final item in listData) {
          if (item is Map) {
            list.add(
              RecordDetailData.fromReferralJson(
                Map<String, dynamic>.from(item),
                patientName: patientName,
              ),
            );
          }
        }
      }
      return ApiResponse.success(response.statusCode, list);
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load referrals',
      [],
    );
  }

  /// Fetches favorite records
  Future<ApiResponse<List<RecordDetailData>>> getFavoriteRecords({String? patientName}) async {
    final response = await _client.get('/records/favorites');
    if (response.isSuccess) {
      return _parseRecordsList(response, patientName: patientName);
    }
    return response.mapEmptyList();
  }

  /// Toggles favorite status on a record
  Future<ApiResponse<dynamic>> toggleFavorite(String recordId, bool isFavorite) async {
    if (isFavorite) {
      return await _client.post('/records/$recordId/favorite');
    } else {
      return await _client.delete('/records/$recordId/favorite');
    }
  }

  /// Initiates sharing a record
  Future<ApiResponse<dynamic>> shareRecord(String recordId, {Map<String, dynamic>? options}) async {
    return await _client.post('/records/$recordId/share', body: options ?? {});
  }

  /// Exports clinical records as PDF
  Future<ApiResponse<List<int>>> exportRecordsPdf({String? recordId}) async {
    final path = recordId != null ? '/records/$recordId/export' : '/records/export?format=PDF';
    return await _client.downloadBytes(path);
  }

  /// Creates a new medical record via POST /records
  Future<ApiResponse<Map<String, dynamic>>> createRecord({
    required String title,
    String? category,
    String? recordType,
    String? chiefComplaint,
    String? clinicalNotes,
    String? treatmentPlan,
    String? attendingDoctor,
    String? facilityName,
    String? date,
  }) async {
    final body = <String, dynamic>{
      'title': title,
      if (category != null) 'category': category,
      if (recordType != null) 'subCategory': recordType,
      if (chiefComplaint != null) 'chiefComplaint': chiefComplaint,
      if (clinicalNotes != null) 'clinicalNotes': clinicalNotes,
      if (treatmentPlan != null) 'treatmentPlan': treatmentPlan,
      if (attendingDoctor != null || facilityName != null || date != null)
        'encounter': {
          if (attendingDoctor != null) 'providerName': attendingDoctor,
          if (facilityName != null) 'facilityName': facilityName,
          if (date != null) 'encounterDate': date,
        },
    };

    final response = await _client.post('/records', body: body);
    if (response.isSuccess && response.data is Map) {
      return ApiResponse.success(response.statusCode, Map<String, dynamic>.from(response.data as Map));
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to create record');
  }

  /// Updates an existing medical record via PUT /records/:id
  Future<ApiResponse<Map<String, dynamic>>> updateRecord(String recordId, Map<String, dynamic> data) async {
    final response = await _client.put('/records/$recordId', body: data);
    if (response.isSuccess && response.data is Map) {
      return ApiResponse.success(response.statusCode, Map<String, dynamic>.from(response.data as Map));
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to update record');
  }

  /// Soft deletes a medical record via DELETE /records/:id
  Future<ApiResponse<dynamic>> deleteRecord(String recordId) async {
    return await _client.delete('/records/$recordId');
  }

  /// Uploads attachment to an existing record via POST /records/:id/attachments
  Future<ApiResponse<Map<String, dynamic>>> uploadRecordAttachment({
    required String recordId,
    required List<int> fileBytes,
    required String fileName,
    String category = 'LAB_RESULT',
    String? mimeType,
  }) async {
    final response = await _client.uploadMultipart(
      '/records/$recordId/attachments',
      fields: {'category': category},
      fileBytes: fileBytes,
      fileField: 'file',
      filename: fileName,
      mimeType: mimeType ?? (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    );

    if (response.isSuccess && response.data is Map) {
      return ApiResponse.success(response.statusCode, Map<String, dynamic>.from(response.data as Map));
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to upload attachment');
  }

  /// Atomically creates record and uploads attachment via POST /records/upload
  Future<ApiResponse<Map<String, dynamic>>> uploadRecordDirect({
    required String title,
    required List<int> fileBytes,
    required String fileName,
    String? category,
    String? recordType,
    String? doctorName,
    String? facilityName,
    String? notes,
  }) async {
    final response = await _client.uploadMultipart(
      '/records/upload',
      fields: {
        'title': title,
        if (category != null) 'category': category,
        if (recordType != null) 'recordType': recordType,
        if (doctorName != null) 'doctorName': doctorName,
        if (facilityName != null) 'facilityName': facilityName,
        if (notes != null) 'notes': notes,
      },
      fileBytes: fileBytes,
      fileField: 'file',
      filename: fileName,
      mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    );

    if (response.isSuccess && response.data is Map) {
      return ApiResponse.success(response.statusCode, Map<String, dynamic>.from(response.data as Map));
    }
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to upload record with file');
  }

  ApiResponse<List<RecordDetailData>> _parseRecordsList(
    ApiResponse<dynamic> response, {
    String? patientName,
    String? fallbackCategory,
  }) {
    final List<RecordDetailData> records = [];
    dynamic listData = response.data;
    if (listData is Map && listData['data'] is List) {
      listData = listData['data'];
    }

    if (listData is List) {
      for (final item in listData) {
        if (item is Map) {
          records.add(RecordDetailData.fromBackendJson(
            Map<String, dynamic>.from(item),
            patientName: patientName,
          ));
        }
      }
    }
    return ApiResponse.success(response.statusCode, records);
  }
}

extension ApiResponseListExt on ApiResponse<dynamic> {
  ApiResponse<List<RecordDetailData>> mapEmptyList() {
    return ApiResponse<List<RecordDetailData>>(
      statusCode: statusCode,
      data: const [],
      isSuccess: isSuccess,
      errorMessage: errorMessage,
    );
  }
}


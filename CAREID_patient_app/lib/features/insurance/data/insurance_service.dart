import '../../../core/network/api_client.dart';
import '../../../core/session/session_manager.dart';

class InsuranceService {
  static final InsuranceService _instance = InsuranceService._internal();
  factory InsuranceService() => _instance;
  static InsuranceService get instance => _instance;

  InsuranceService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Fetches insurance cards for patient via GET /patients/:patientId/insurance-cards
  Future<ApiResponse<List<Map<String, dynamic>>>> getInsuranceCards({String? patientId}) async {
    final pid = patientId ?? SessionManager.instance.patientId;
    final response = await _client.get('/patients/$pid/insurance-cards');
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
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load insurance cards', []);
  }

  /// Fetches insurance policies via GET /insurance/policies
  Future<ApiResponse<List<Map<String, dynamic>>>> getPolicies() async {
    final response = await _client.get('/insurance/policies');
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
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Failed to load policies', []);
  }

  /// Adds a new insurance policy card via POST /patients/:patientId/insurance-cards
  Future<ApiResponse<dynamic>> createInsuranceCard(Map<String, dynamic> policyData, {String? patientId}) async {
    final pid = patientId ?? SessionManager.instance.patientId;
    return await _client.post('/patients/$pid/insurance-cards', body: policyData);
  }

  /// Scans insurance card image directly via POST /insurance/ocr (multipart form-data)
  Future<ApiResponse<Map<String, dynamic>>> scanInsuranceCard({
    required List<int> fileBytes,
    required String filename,
    String mimeType = 'image/png',
  }) async {
    final response = await _client.uploadMultipart(
      '/insurance/ocr',
      fileField: 'file',
      fileBytes: fileBytes,
      filename: filename,
      mimeType: mimeType,
    );

    if (response.isSuccess) {
      dynamic data = response.data;
      if (data is Map && data['data'] is Map) {
        data = data['data'];
      }
      if (data is Map) {
        return ApiResponse.success(response.statusCode, Map<String, dynamic>.from(data));
      }
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to process insurance card OCR',
      {},
    );
  }

  /// Submits an attachment for OCR processing via POST /ocr/jobs
  Future<ApiResponse<dynamic>> submitOcrJob({
    required String attachmentId,
    String documentType = 'INSURANCE_CARD',
  }) async {
    final body = {
      'medicalAttachmentId': attachmentId,
      'documentType': documentType,
    };
    return await _client.post('/ocr/jobs', body: body);
  }

  /// Gets OCR job status and details via GET /ocr/jobs/:id
  Future<ApiResponse<dynamic>> getOcrJob(String jobId) async {
    return await _client.get('/ocr/jobs/$jobId');
  }

  /// Gets OCR extracted fields via GET /ocr/jobs/:id/fields
  Future<ApiResponse<dynamic>> getOcrJobFields(String jobId) async {
    return await _client.get('/ocr/jobs/$jobId/fields');
  }

  /// Gets OCR structured JSON output via GET /ocr/jobs/:id/json
  Future<ApiResponse<dynamic>> getOcrJobJson(String jobId) async {
    return await _client.get('/ocr/jobs/$jobId/json');
  }

  /// Gets OCR raw extracted text via GET /ocr/jobs/:id/text
  Future<ApiResponse<dynamic>> getOcrJobText(String jobId) async {
    return await _client.get('/ocr/jobs/$jobId/text');
  }

  /// Confirms extracted OCR insurance data and saves/updates policy via POST /insurance/ocr/confirm
  Future<ApiResponse<dynamic>> confirmOcrScan({
    required String ocrId,
    required String providerName,
    required String policyNumber,
    String? coverageDetails,
  }) async {
    final body = {
      'ocrId': ocrId,
      'confirmedData': {
        'providerName': providerName,
        'policyNumber': policyNumber,
        'coverageDetails': coverageDetails ?? 'Comprehensive Health Coverage',
      },
    };
    return await _client.post('/insurance/ocr/confirm', body: body);
  }

  /// Fetches insurance OCR record by ID via GET /insurance/ocr/:id
  Future<ApiResponse<dynamic>> getOcrRecord(String ocrId) async {
    return await _client.get('/insurance/ocr/$ocrId');
  }

  /// Deletes an insurance policy via DELETE /insurance/policies/:id
  Future<ApiResponse<dynamic>> deletePolicy(String policyId) async {
    return await _client.delete('/insurance/policies/$policyId');
  }

  /// Deletes an insurance card via DELETE /insurance/cards/:id
  Future<ApiResponse<dynamic>> deleteInsuranceCard(String cardId) async {
    return await _client.delete('/insurance/cards/$cardId');
  }

  List<Map<String, dynamic>> _extractMapList(dynamic raw) {
    dynamic cur = raw;
    while (cur is Map && cur['data'] != null && cur['data'] != cur) {
      cur = cur['data'];
    }
    if (cur is List) {
      return cur.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
    }
    return [];
  }

  /// Read-only fetch of treatment offers via GET /patients/treatment-offers (PA-09)
  Future<ApiResponse<List<Map<String, dynamic>>>> getTreatmentOffers() async {
    final response = await _client.get('/patients/treatment-offers');
    if (response.isSuccess) {
      return ApiResponse.success(response.statusCode, _extractMapList(response.data));
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load treatment offers',
      [],
    );
  }

  /// Read-only fetch of financing options via GET /financing/options (PA-10)
  Future<ApiResponse<List<Map<String, dynamic>>>> getFinancingOptions() async {
    final response = await _client.get('/financing/options');
    if (response.isSuccess) {
      return ApiResponse.success(response.statusCode, _extractMapList(response.data));
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load financing options',
      [],
    );
  }

  /// Read-only fetch of financing offers via GET /financing/offers (PA-10)
  Future<ApiResponse<List<Map<String, dynamic>>>> getFinancingOffers() async {
    final response = await _client.get('/financing/offers');
    if (response.isSuccess) {
      return ApiResponse.success(response.statusCode, _extractMapList(response.data));
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load financing offers',
      [],
    );
  }

  /// Read-only fetch of patient financing applications via GET /financing/applications (PA-10)
  Future<ApiResponse<List<Map<String, dynamic>>>> getFinancingApplications() async {
    final response = await _client.get('/financing/applications');
    if (response.isSuccess) {
      return ApiResponse.success(response.statusCode, _extractMapList(response.data));
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load financing applications',
      [],
    );
  }

  /// Read-only fetch of patient security consents via GET /security/consents/active (PA-11)
  Future<ApiResponse<List<Map<String, dynamic>>>> getSecurityConsents() async {
    var response = await _client.get('/security/consents/active');
    if (!response.isSuccess) {
      response = await _client.get('/security/consents');
    }
    if (response.isSuccess) {
      return ApiResponse.success(response.statusCode, _extractMapList(response.data));
    }
    return ApiResponse.error(
      response.statusCode,
      response.errorMessage ?? 'Failed to load consents',
      [],
    );
  }
}


import '../../../core/network/api_client.dart';

class FamilyService {
  static final FamilyService _instance = FamilyService._internal();
  factory FamilyService() => _instance;
  static FamilyService get instance => _instance;

  FamilyService._internal();

  final ApiClient _client = ApiClient.instance;

  /// Fetches family members from GET /family/members
  Future<ApiResponse<List<Map<String, dynamic>>>> getMembers() async {
    final response = await _client.get('/family/members');
    return _parseListResponse(response);
  }

  /// Fetches family invitations from GET /family/invitations
  Future<ApiResponse<List<Map<String, dynamic>>>> getInvitations() async {
    final response = await _client.get('/family/invitations');
    return _parseListResponse(response);
  }

  /// Fetches family consents from GET /family/consents
  Future<ApiResponse<List<Map<String, dynamic>>>> getConsents() async {
    final response = await _client.get('/family/consents');
    return _parseListResponse(response);
  }

  /// Fetches family dependents from GET /family/dependents
  Future<ApiResponse<List<Map<String, dynamic>>>> getDependents() async {
    final response = await _client.get('/family/dependents');
    return _parseListResponse(response);
  }

  /// Sends a family invitation via POST /family/invitations
  Future<ApiResponse<dynamic>> createInvitation({
    required String phone,
    required String relationship,
    String? inviteeName,
    String? relationshipType,
  }) async {
    final body = {
      'inviteePhone': phone,
      'relationship': relationship,
      if (inviteeName != null) 'inviteeName': inviteeName,
      if (relationshipType != null) 'relationshipType': relationshipType,
    };
    return await _client.post('/family/invitations', body: body);
  }

  /// Resends a family invitation via POST /family/invitations/:id/resend
  Future<ApiResponse<dynamic>> resendInvitation(String invitationId) async {
    return await _client.post('/family/invitations/$invitationId/resend');
  }

  /// Removes an active family member via DELETE /family/members/:id
  Future<ApiResponse<dynamic>> removeFamilyMember(String memberId) async {
    return await _client.delete('/family/members/$memberId');
  }

  /// Accepts a family invitation via POST /family/invitations/:id/accept
  Future<ApiResponse<dynamic>> acceptInvitation(String invitationId) async {
    return await _client.post('/family/invitations/$invitationId/accept');
  }

  /// Rejects a family invitation via POST /family/invitations/:id/reject
  Future<ApiResponse<dynamic>> rejectInvitation(String invitationId) async {
    return await _client.post('/family/invitations/$invitationId/reject');
  }

  /// Cancels or revokes a family invitation via DELETE /family/invitations/:id
  Future<ApiResponse<dynamic>> cancelInvitation(String invitationId) async {
    return await _client.delete('/family/invitations/$invitationId');
  }

  ApiResponse<List<Map<String, dynamic>>> _parseListResponse(ApiResponse<dynamic> response) {
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
    return ApiResponse.error(response.statusCode, response.errorMessage ?? 'Request failed', []);
  }
}


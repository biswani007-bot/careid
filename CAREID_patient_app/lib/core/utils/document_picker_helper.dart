import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';

class PickedDocument {
  final Uint8List bytes;
  final String name;
  final String path;
  final String mimeType;
  final int size;

  const PickedDocument({
    required this.bytes,
    required this.name,
    required this.path,
    required this.mimeType,
    required this.size,
  });
}

class DocumentPickerResult {
  final PickedDocument? document;
  final bool isCancelled;
  final String? errorMessage;

  const DocumentPickerResult({
    this.document,
    this.isCancelled = false,
    this.errorMessage,
  });

  bool get isSuccess => document != null && errorMessage == null;
}

class DocumentPickerHelper {
  DocumentPickerHelper._();
  static final DocumentPickerHelper instance = DocumentPickerHelper._();

  final ImagePicker _picker = ImagePicker();

  /// Test fixture injection hook exclusively for automated tests.
  /// In real app runtime, this is null.
  static PickedDocument? testDocumentFixture;

  static const int maxInsuranceFileSizeBytes = 10 * 1024 * 1024; // 10 MB
  static const int maxMedicalFileSizeBytes = 15 * 1024 * 1024;   // 15 MB

  static const Set<String> allowedExtensions = {
    'png',
    'jpg',
    'jpeg',
    'webp',
    'pdf',
  };

  /// Picks an image via device camera
  Future<DocumentPickerResult> captureFromCamera({
    int maxSizeBytes = maxInsuranceFileSizeBytes,
  }) async {
    // Security enforcement: test fixtures are completely disabled in release builds
    if (!kReleaseMode && testDocumentFixture != null) {
      return DocumentPickerResult(document: testDocumentFixture);
    }

    try {
      final XFile? file = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 92,
        maxWidth: 2400,
        maxHeight: 2400,
      );

      if (file == null) {
        // User cancelled capture
        return const DocumentPickerResult(isCancelled: true);
      }

      return await _processXFile(file, maxSizeBytes);
    } on PlatformException catch (pe) {
      if (pe.code == 'camera_access_denied' || pe.code.toLowerCase().contains('denied')) {
        return const DocumentPickerResult(
          errorMessage: 'Camera permission was denied. Please allow camera access in device settings.',
        );
      }
      return DocumentPickerResult(errorMessage: 'Camera error: ${pe.message ?? pe.code}');
    } catch (e) {
      return DocumentPickerResult(errorMessage: 'Unable to capture document: $e');
    }
  }

  /// Picks an image via device gallery
  Future<DocumentPickerResult> pickFromGallery({
    int maxSizeBytes = maxInsuranceFileSizeBytes,
  }) async {
    // Security enforcement: test fixtures are completely disabled in release builds
    if (!kReleaseMode && testDocumentFixture != null) {
      return DocumentPickerResult(document: testDocumentFixture);
    }

    try {
      final XFile? file = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 95,
      );

      if (file == null) {
        // User cancelled selection
        return const DocumentPickerResult(isCancelled: true);
      }

      return await _processXFile(file, maxSizeBytes);
    } on PlatformException catch (pe) {
      if (pe.code.toLowerCase().contains('denied') || pe.code.toLowerCase().contains('permission')) {
        return const DocumentPickerResult(
          errorMessage: 'Gallery access permission was denied. Please allow photo access in device settings.',
        );
      }
      return DocumentPickerResult(errorMessage: 'Gallery error: ${pe.message ?? pe.code}');
    } catch (e) {
      return DocumentPickerResult(errorMessage: 'Unable to select document from gallery: $e');
    }
  }

  Future<DocumentPickerResult> _processXFile(XFile file, int maxSizeBytes) async {
    final fileName = file.name.isNotEmpty ? file.name : 'document_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final ext = fileName.split('.').last.toLowerCase();

    if (!allowedExtensions.contains(ext)) {
      return DocumentPickerResult(
        errorMessage: 'Unsupported document format ($ext). Please select a PNG, JPG, or WEBP image.',
      );
    }

    final bytes = await file.readAsBytes();
    if (bytes.length > maxSizeBytes) {
      final mbLimit = (maxSizeBytes / (1024 * 1024)).toStringAsFixed(0);
      return DocumentPickerResult(
        errorMessage: 'File size exceeds maximum allowable limit of ${mbLimit}MB.',
      );
    }

    final mimeType = _resolveMimeType(ext);

    return DocumentPickerResult(
      document: PickedDocument(
        bytes: bytes,
        name: fileName,
        path: file.path,
        mimeType: mimeType,
        size: bytes.length,
      ),
    );
  }

  String _resolveMimeType(String ext) {
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  /// Securely removes temporary cached picker files after memory loading
  static Future<void> cleanupFile(String? path) async {
    if (path == null || path.isEmpty) return;
    try {
      final f = File(path);
      if (await f.exists()) {
        await f.delete();
      }
    } catch (_) {}
  }
}


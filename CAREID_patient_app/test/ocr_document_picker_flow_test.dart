import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:care_id_patient_app/core/utils/document_picker_helper.dart';
import 'package:care_id_patient_app/features/insurance/presentation/pages/insurance_ocr_processing_page.dart';
import 'package:care_id_patient_app/features/records/presentation/pages/ocr_processing_report_page.dart';

void main() {
  group('DocumentPickerHelper & Validation Tests', () {
    tearDown(() {
      DocumentPickerHelper.testDocumentFixture = null;
    });

    test('DocumentPickerHelper allowed extensions contains required formats', () {
      expect(DocumentPickerHelper.allowedExtensions.contains('png'), isTrue);
      expect(DocumentPickerHelper.allowedExtensions.contains('jpg'), isTrue);
      expect(DocumentPickerHelper.allowedExtensions.contains('jpeg'), isTrue);
      expect(DocumentPickerHelper.allowedExtensions.contains('webp'), isTrue);
      expect(DocumentPickerHelper.allowedExtensions.contains('pdf'), isTrue);
      expect(DocumentPickerHelper.allowedExtensions.contains('exe'), isFalse);
    });

    test('DocumentPickerHelper max file sizes adhere to specifications', () {
      expect(DocumentPickerHelper.maxInsuranceFileSizeBytes, equals(10 * 1024 * 1024));
      expect(DocumentPickerHelper.maxMedicalFileSizeBytes, equals(15 * 1024 * 1024));
    });

    test('DocumentPickerHelper returns test fixture when injected', () async {
      final dummyBytes = Uint8List.fromList([1, 2, 3, 4, 5]);
      DocumentPickerHelper.testDocumentFixture = PickedDocument(
        bytes: dummyBytes,
        name: 'test_card.png',
        path: '/tmp/test_card.png',
        mimeType: 'image/png',
        size: dummyBytes.length,
      );

      final result = await DocumentPickerHelper.instance.captureFromCamera();
      expect(result.isSuccess, isTrue);
      expect(result.isCancelled, isFalse);
      expect(result.errorMessage, isNull);
      expect(result.document, isNotNull);
      expect(result.document!.name, equals('test_card.png'));
      expect(result.document!.bytes, equals(dummyBytes));
    });

    test('DocumentPickerResult correctly computes isSuccess', () {
      const cancelled = DocumentPickerResult(isCancelled: true);
      expect(cancelled.isSuccess, isFalse);

      const errored = DocumentPickerResult(errorMessage: 'Camera permission denied');
      expect(errored.isSuccess, isFalse);

      final success = DocumentPickerResult(
        document: PickedDocument(
          bytes: Uint8List(10),
          name: 'doc.jpg',
          path: '/path/doc.jpg',
          mimeType: 'image/jpeg',
          size: 10,
        ),
      );
      expect(success.isSuccess, isTrue);
    });
  });

  group('OCR Pages Graceful No-Document State Tests', () {
    testWidgets('InsuranceOcrProcessingPage renders No Document Selected when args are empty', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 900));

      await tester.pumpWidget(
        const MaterialApp(
          home: InsuranceOcrProcessingPage(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Document Selected'), findsOneWidget);
      expect(find.text('Capture Insurance Card'), findsOneWidget);
      expect(find.byIcon(Icons.document_scanner_outlined), findsOneWidget);
    });

    testWidgets('OcrProcessingReportPage renders No Document Selected when args are empty', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 900));

      await tester.pumpWidget(
        const MaterialApp(
          home: OcrProcessingReportPage(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('No Document Selected'), findsOneWidget);
      expect(find.text('Capture Medical Report'), findsOneWidget);
      expect(find.byIcon(Icons.document_scanner_outlined), findsOneWidget);
    });
  });
}

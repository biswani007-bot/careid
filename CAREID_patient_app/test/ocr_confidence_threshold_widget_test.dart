import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:care_id_patient_app/features/insurance/presentation/pages/insurance_extraction_results_page.dart';

void main() {
  group('InsuranceExtractionResultsPage - Confidence Threshold Branch Tests', () {
    testWidgets('Renders LOW CONFIDENCE warning badge when confidence < 0.70', (tester) async {
      await tester.binding.setSurfaceSize(const Size(500, 1200));

      final lowConfidenceData = {
        'ocrId': 'test-low-conf-ocr-uuid',
        'confidence': 0.1242, // Genuinely low confidence (12.4%)
        'engine': 'PP-OCRv4-Mobile-CPU',
        'isSimulated': false,
        'providerName': 'Blue Shield Health (Uncertain)',
        'policyNumber': 'BS-??-9912',
        'coverageDetails': 'Copay \$20',
        'memberName': 'Sarah lyyo',
        'memberId': 'PT-0004',
        'groupNumber': 'GRP-UNKNOWN',
      };

      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: (settings) {
            return MaterialPageRoute(
              settings: RouteSettings(
                name: '/insurance/extraction-results',
                arguments: lowConfidenceData,
              ),
              builder: (_) => const InsuranceExtractionResultsPage(),
            );
          },
        ),
      );
      await tester.pumpAndSettle();

      // 1. Assert Low Confidence warning icon and text are rendered
      expect(find.byIcon(Icons.warning_amber_rounded), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsNothing);
      expect(find.text('Low Confidence (12.4%) • Manual Review Recommended'), findsOneWidget);

      // 2. Assert manual review action button is available
      expect(find.text('Edit manually'), findsOneWidget);
      expect(find.text('Discard scan'), findsOneWidget);

      // 3. Assert extracted fields are displayed and editable
      expect(find.text('Insurance Provider'), findsOneWidget);
      expect(find.text('Blue Shield Health (Uncertain)'), findsOneWidget);
      expect(find.text('BS-??-9912'), findsAtLeastNWidgets(1));
    });

    testWidgets('Renders HIGH CONFIDENCE success badge when confidence >= 0.70', (tester) async {
      await tester.binding.setSurfaceSize(const Size(500, 1200));

      final highConfidenceData = {
        'ocrId': 'test-high-conf-ocr-uuid',
        'confidence': 0.9801, // High confidence (98.0%)
        'engine': 'PP-OCRv4-Mobile-CPU',
        'isSimulated': false,
        'providerName': 'Blue Shield Premier Health',
        'policyNumber': 'BS-88492019',
        'coverageDetails': 'Office \$20, Specialist \$40',
        'memberName': 'Sarah lyyo',
        'memberId': 'PT-CAREID-2026-0004',
        'groupNumber': 'GRP-998877',
      };

      await tester.pumpWidget(
        MaterialApp(
          onGenerateRoute: (settings) {
            return MaterialPageRoute(
              settings: RouteSettings(
                name: '/insurance/extraction-results',
                arguments: highConfidenceData,
              ),
              builder: (_) => const InsuranceExtractionResultsPage(),
            );
          },
        ),
      );
      await tester.pumpAndSettle();

      // 1. Assert High Confidence success icon and text are rendered
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.byIcon(Icons.warning_amber_rounded), findsNothing);
      expect(find.text('High Confidence (98.0%) • PP-OCRv4-Mobile-CPU'), findsOneWidget);

      // 2. Assert membership details rendered
      expect(find.text('Blue Shield Premier Health'), findsOneWidget);
      expect(find.text('BS-88492019'), findsAtLeastNWidgets(1));
    });
  });
}

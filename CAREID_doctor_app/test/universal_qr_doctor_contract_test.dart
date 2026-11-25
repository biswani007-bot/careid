import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:careid_doctor/core/routes/app_routes.dart';
import 'package:careid_doctor/features/qr_scan/qr_error_screen.dart';
import 'package:careid_doctor/features/qr_scan/qr_processing_screen.dart';

void main() {
  Widget createTestWidget({
    required String qrData,
  }) {
    return MaterialApp(
      routes: {
        AppRoutes.qrProcessing: (context) => QrProcessingScreen(
          autoNavigate: true,
          qrData: qrData,
        ),
        AppRoutes.qrVerificationSuccess: (context) =>
            const Scaffold(body: Text('Verification Success Screen')),
        AppRoutes.qrError: (context) => const QrErrorScreen(),
      },
      home: QrProcessingScreen(
        autoNavigate: true,
        qrData: qrData,
      ),
    );
  }

  group('Universal Health Card QR — Doctor App Contract Test', () {
    testWidgets('Doctor App decodes canonical JSON QR payload format', (WidgetTester tester) async {
      final canonicalPayload = jsonEncode({
        'v': '1.0',
        'type': 'CAREID_HEALTH_CARD',
        'token': 'HVQR-9596203EE8FF1D57',
        'cardNumber': 'HC-CAREID-2026-0004',
        'patientId': '787e5187-7859-4320-bb1a-465a57dd086a',
      });

      await tester.pumpWidget(createTestWidget(qrData: canonicalPayload));
      expect(find.text('Verifying Secure QR'), findsOneWidget);
    });

    testWidgets('Doctor App handles raw Enterprise QR Token string (HVQR-XXXXXXXX)', (WidgetTester tester) async {
      const enterpriseToken = 'HVQR-9596203EE8FF1D57';

      await tester.pumpWidget(createTestWidget(qrData: enterpriseToken));
      expect(find.text('Verifying Secure QR'), findsOneWidget);
    });

    testWidgets('Doctor App handles legacy Card Number string (HC-CAREID-...)', (WidgetTester tester) async {
      const cardNumber = 'HC-CAREID-2026-0004';

      await tester.pumpWidget(createTestWidget(qrData: cardNumber));
      expect(find.text('Verifying Secure QR'), findsOneWidget);
    });

    testWidgets('Security check: Expired enterprise token in crafted JSON does not bypass to card number', (WidgetTester tester) async {
      final craftedPayload = jsonEncode({
        'v': '1.0',
        'type': 'CAREID_HEALTH_CARD',
        'token': 'HVQR-EXPIRED-TOKEN-000',
        'cardNumber': 'HC-CAREID-2026-0004',
        'patientId': 'spoofed-patient-id',
      });

      await tester.pumpWidget(createTestWidget(qrData: craftedPayload));
      expect(find.text('Verifying Secure QR'), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 1700));
      await tester.pumpAndSettle();

      // Must reject and route to QR Error Screen, not Success!
      expect(find.text('QR Code Expired'), findsOneWidget);
      expect(find.text('Verification Success Screen'), findsNothing);
    });
  });
}

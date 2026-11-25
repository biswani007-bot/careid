import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:careid_doctor/core/routes/app_routes.dart';
import 'package:careid_doctor/features/auth/otp_verification_screen.dart';

void main() {
  testWidgets(
    'OtpVerificationScreen renders Figma node 10:141 elements correctly',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: const OtpVerificationScreen(),
          routes: {
            AppRoutes.authSuccess: (context) =>
                const Scaffold(body: Text('Auth Success Screen')),
            AppRoutes.authError: (context) =>
                const Scaffold(body: Text('Auth Error Screen')),
          },
        ),
      );
      await tester.pumpAndSettle();

      // Verify Header
      expect(find.text('Secure Access'), findsOneWidget);

      // Verify Headings & Instructions
      expect(find.text('Authentication'), findsOneWidget);
      expect(find.text('Required'), findsOneWidget);
      expect(find.textContaining('6-digit code sent to'), findsOneWidget);

      // Verify exactly 4 OTP digit fields
      expect(find.byType(TextField), findsNWidgets(6));

      // Verify Timer and Resend controls
      expect(find.text('Resend OTP'), findsOneWidget);
      expect(find.text('Verify & Access'), findsOneWidget);

      // Verify Bento Info Cards
      expect(find.text('HIPAA Compliant'), findsOneWidget);
      expect(find.text('Device Registration'), findsOneWidget);
    },
  );

  testWidgets(
    'OtpVerificationScreen validates 4-digit code and navigates to success',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: const OtpVerificationScreen(),
          routes: {
            AppRoutes.authSuccess: (context) =>
                const Scaffold(body: Text('Auth Success Screen')),
          },
        ),
      );
      await tester.pumpAndSettle();

      // Enter 6 digits
      final textFields = find.byType(TextField);
      await tester.enterText(textFields.at(0), '1');
      await tester.enterText(textFields.at(1), '2');
      await tester.enterText(textFields.at(2), '3');
      await tester.enterText(textFields.at(3), '4');
      await tester.enterText(textFields.at(4), '5');
      await tester.enterText(textFields.at(5), '6');
      await tester.pump();

      // Tap Verify & Access
      await tester.tap(find.text('Verify & Access'), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(find.text('Auth Success Screen'), findsOneWidget);
    },
  );

  testWidgets('OtpVerificationScreen navigates to error on 0000', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const OtpVerificationScreen(),
        routes: {
          AppRoutes.authError: (context) =>
              const Scaffold(body: Text('Auth Error Screen')),
        },
      ),
    );
    await tester.pumpAndSettle();

    // Enter 000000
    final textFields = find.byType(TextField);
    for (int i = 0; i < 6; i++) {
      await tester.enterText(textFields.at(i), '0');
    }
    await tester.pump();

    // Tap Verify & Access
    await tester.tap(find.text('Verify & Access'), warnIfMissed: false);
    await tester.pumpAndSettle();

    expect(find.text('Auth Error Screen'), findsOneWidget);
  });
}

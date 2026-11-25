import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:care_id_patient_app/core/routing/app_routes.dart';
import 'package:care_id_patient_app/core/widgets/care_id_bottom_nav_bar.dart';
import 'package:care_id_patient_app/features/profile/data/demo_patient_profile_store.dart';
import 'package:care_id_patient_app/features/profile/presentation/pages/personal_details_identity_page.dart';
import 'package:care_id_patient_app/features/profile/presentation/pages/profile_settings_hub_page.dart';
import 'package:care_id_patient_app/features/records/presentation/models/record_detail_data.dart';
import 'package:care_id_patient_app/features/records/presentation/pages/dental_record_detail_page.dart';
import 'package:care_id_patient_app/features/records/presentation/pages/medical_records_page.dart';
import 'package:care_id_patient_app/features/records/presentation/pages/document_viewer_page.dart';
import 'package:care_id_patient_app/features/records/presentation/pages/review_health_record_page.dart';
import 'package:care_id_patient_app/features/insurance/presentation/pages/insurance_extraction_results_page.dart';
import 'package:care_id_patient_app/core/state/app_data_sync_manager.dart';
import 'package:care_id_patient_app/features/home/presentation/pages/smart_digital_health_card_page.dart';
import 'package:care_id_patient_app/features/appointments/data/mock_appointments_repository.dart';
import 'package:care_id_patient_app/features/appointments/domain/models/appointment_models.dart';
import 'package:care_id_patient_app/features/records/data/health_records_service.dart';

void main() {
  setUp(() {
    DemoPatientProfileStore.instance.resetToDefault();
    DemoPatientProfileStore.instance.isTestMode = true;
    HealthRecordsService.isTestMode = true;
    MockAppointmentsRepository.isTestMode = true;
  });

  group('1. Bottom Navigation Bar Preview Actions', () {
    testWidgets('Displays Scan Health Record and Scan Insurance upon expanding', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            bottomNavigationBar: CareIDBottomNavBar(currentIndex: 0),
          ),
        ),
      );

      // Verify center FAB exists and tap it
      final centerFab = find.byWidgetPredicate(
        (widget) =>
            widget is Container &&
            widget.decoration is BoxDecoration &&
            (widget.decoration as BoxDecoration).shape == BoxShape.circle,
      );
      expect(centerFab, findsWidgets);

      await tester.tap(centerFab.first);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Scan Health Record'), findsOneWidget);
      expect(find.text('Scan Insurance'), findsOneWidget);
    });
  });

  group('2. Health Records Navigation & Record Details Flow', () {
    testWidgets('Full Blood Count Analysis navigates to Record Details, not Document Viewer directly', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          initialRoute: AppRoutes.medicalRecords,
          routes: {
            AppRoutes.medicalRecords: (context) => const MedicalRecordsPage(),
            AppRoutes.recordDetail: (context) {
              final args = ModalRoute.of(context)?.settings.arguments as RecordDetailData?;
              return DentalRecordDetailPage(recordData: args);
            },
            AppRoutes.documentViewer: (context) => const DocumentViewerPage(),
          },
        ),
      );

      // Verify MedicalRecordsPage rendered
      expect(find.text('Medical Records'), findsOneWidget);
      expect(find.text('Full Blood Count Analysis'), findsOneWidget);

      // Tap Full Blood Count Analysis
      await tester.tap(find.text('Full Blood Count Analysis'));
      await tester.pumpAndSettle();

      // Must now be on Record Details screen
      expect(find.text('Record Details'), findsOneWidget);
      expect(find.text('Full Blood Count Analysis'), findsWidgets);
      expect(find.text('Share Record'), findsOneWidget);
      expect(find.text('Download PDF'), findsOneWidget);
      expect(find.text('Print'), findsOneWidget);
      expect(find.text('Favorite'), findsOneWidget);
      expect(find.text('Attending Provider'), findsOneWidget);
      expect(find.text('Attachments (2)'), findsOneWidget);
      expect(find.text("Doctor's Observations"), findsOneWidget);

      // Tap Download PDF action which opens Document Viewer
      await tester.tap(find.text('Download PDF'));
      await tester.pumpAndSettle();

      // Must now be on Document Viewer
      expect(find.byType(DocumentViewerPage), findsOneWidget);
    });
  });

  group('3. Profile Editable and Saveable Details Flow', () {
    testWidgets('Personal Details edit, validate, save and discard works', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: const PersonalDetailsIdentityPage(),
          routes: {
            AppRoutes.profilePersonalDetails: (context) => const PersonalDetailsIdentityPage(),
            AppRoutes.profileSettingsHub: (context) => const ProfileSettingsHubPage(),
          },
        ),
      );

      // Verify initial fields
      expect(find.text('Sarah Jenkins'), findsWidgets);
      expect(find.text('12/05/1992'), findsOneWidget);
      expect(find.text('Female'), findsOneWidget);
      expect(find.text('O+'), findsOneWidget);
      expect(find.text('+1 234 567 890'), findsOneWidget);
      expect(find.text('sarah.j@email.com'), findsOneWidget);

      // Edit name
      final nameField = find.widgetWithText(TextField, 'Sarah Jenkins');
      expect(nameField, findsOneWidget);
      await tester.enterText(nameField, 'Sarah Connor');
      await tester.pump();

      // Edit email
      final emailField = find.widgetWithText(TextField, 'sarah.j@email.com');
      expect(emailField, findsOneWidget);
      await tester.enterText(emailField, 'sarah.connor@sky.net');
      await tester.pump();

      // Scroll to Save Details and tap it
      await tester.ensureVisible(find.text('Save Details'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save Details'));
      await tester.pumpAndSettle();

      // Verify success snackbar
      expect(find.text('Personal details updated successfully!'), findsOneWidget);

      // Verify immediate UI update
      expect(find.text('Sarah Connor'), findsWidgets);
      expect(DemoPatientProfileStore.instance.currentProfile.fullName, 'Sarah Connor');
      expect(DemoPatientProfileStore.instance.currentProfile.email, 'sarah.connor@sky.net');

      // Now edit again and test Discard Changes
      await tester.enterText(find.widgetWithText(TextField, 'Sarah Connor'), 'Temporary Name');
      await tester.pump();
      expect(find.text('Temporary Name'), findsWidgets);

      // Scroll to Discard Changes and tap it
      await tester.ensureVisible(find.text('Discard Changes'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Discard Changes'));
      await tester.pumpAndSettle();

      // Restored to last saved values
      expect(find.text('Sarah Connor'), findsWidgets);
      expect(find.text('Temporary Name'), findsNothing);
    });

    testWidgets('ProfileSettingsHubPage reflects updated profile store data', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      DemoPatientProfileStore.instance.updateProfile(
        const PatientProfile(
          fullName: 'Jane Doe',
          dateOfBirth: '01/01/1990',
          gender: 'Female',
          bloodGroup: 'A+',
          mobile: '+1 555 123 4567',
          email: 'jane.doe@example.com',
          address: '100 Medical Plaza',
          avatarAsset: 'assets/images/patient_avatar.png',
          patientId: '#HV-920512',
        ),
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: ProfileSettingsHubPage(),
        ),
      );

      expect(find.text('Jane Doe'), findsOneWidget);
    });
  });

  group('4. Save Health Record Flow', () {
    testWidgets('ReviewHealthRecordPage save record CTA triggers properly', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          initialRoute: AppRoutes.reviewHealthRecord,
          routes: {
            AppRoutes.reviewHealthRecord: (context) => const ReviewHealthRecordPage(),
            AppRoutes.recordSavedSuccess: (context) => const Scaffold(body: Text('Record Saved Successfully!')),
          },
        ),
      );

      expect(find.text('Entry Date'), findsOneWidget);
      expect(find.text('Save Record'), findsOneWidget);

      await tester.ensureVisible(find.text('Save Record'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Save Record'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));

      expect(find.byType(ReviewHealthRecordPage), findsWidgets);
    });
  });

  group('5. OCR Flow & Results Review', () {
    testWidgets('InsuranceExtractionResultsPage renders review UI correctly', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          initialRoute: AppRoutes.insuranceExtractionResults,
          routes: {
            AppRoutes.insuranceExtractionResults: (context) => const InsuranceExtractionResultsPage(),
            AppRoutes.insuranceCardDetails: (context) => const Scaffold(body: Text('Card Details Screen')),
          },
        ),
      );

      expect(find.text('Review Information'), findsOneWidget);
      expect(find.text('Confirm & Save'), findsOneWidget);
    });
  });

  group('6. Global CRUD & AppDataSyncManager Synchronization', () {
    testWidgets('Profile update synchronizes to SmartDigitalHealthCardPage and AppDataSyncManager', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final initialTick = AppDataSyncManager.instance.profileTick.value;

      // Update patient profile
      DemoPatientProfileStore.instance.updateProfile(
        DemoPatientProfileStore.instance.currentProfile.copyWith(
          fullName: 'Alexander Hamilton',
          firstName: 'Alexander',
          dateOfBirth: '11/01/1988',
          bloodGroup: 'AB+',
        ),
      );

      // Verify profileTick incremented
      expect(AppDataSyncManager.instance.profileTick.value, greaterThan(initialTick));

      // Pump SmartDigitalHealthCardPage
      await tester.pumpWidget(
        const MaterialApp(
          home: SmartDigitalHealthCardPage(),
        ),
      );
      await tester.pumpAndSettle();

      // Verify SmartDigitalHealthCardPage displays dynamic name and DOB, not hardcoded 'Richard'
      expect(find.text('Alexander'), findsOneWidget);
      expect(find.text('Richard'), findsNothing);
      expect(find.text('11/01/1988'), findsOneWidget);
      expect(find.text('AB+'), findsOneWidget);
    });

    testWidgets('Appointments and Records dispatch global sync ticks', (WidgetTester tester) async {
      final aptInitial = AppDataSyncManager.instance.appointmentsTick.value;
      final recInitial = AppDataSyncManager.instance.recordsTick.value;

      // Add appointment
      MockAppointmentsRepository.instance.addAppointment(
        PatientAppointment(
          id: '#APT-SYNC-TEST',
          doctor: MockAppointmentsRepository.instance.getDoctors().first,
          consultationType: MockAppointmentsRepository.instance.getConsultationOptions().first,
          appointmentDate: DateTime.now().add(const Duration(days: 5)),
          timeSlot: '10:00 AM',
          status: AppointmentStatus.upcoming,
          patientName: 'Alexander Hamilton',
          careIdNumber: 'CID #8472-9901',
          reasonForVisit: 'General checkup',
          copay: r'$25.00',
          insuranceName: 'Blue Shield',
          vaultRecordsSynced: 2,
          qrPassRef: 'APT-SYNC',
        ),
      );
      expect(AppDataSyncManager.instance.appointmentsTick.value, greaterThan(aptInitial));

      // Signal records update
      AppDataSyncManager.instance.notifyRecordsUpdated();
      expect(AppDataSyncManager.instance.recordsTick.value, greaterThan(recInitial));
    });
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:careid_doctor/core/constants/api_constants.dart';
import 'package:careid_doctor/data/services/careid_api_services.dart';

void main() {
  group('Doctor Treatment Offers & Patient Subsystem Constants', () {
    test('ApiConstants defines expected doctor treatment offer paths', () {
      expect(ApiConstants.doctorTreatmentOffers, equals('/doctors/treatment-offers'));
      expect(ApiConstants.doctorTreatmentOfferById('offer-123'), equals('/doctors/treatment-offers/offer-123'));
      expect(ApiConstants.doctorTreatmentOfferDispatch('offer-123'), equals('/doctors/treatment-offers/offer-123/dispatch'));
      expect(ApiConstants.doctorTreatmentOfferStatus('offer-123'), equals('/doctors/treatment-offers/offer-123/status'));
      expect(ApiConstants.doctorTreatmentOfferCancel('offer-123'), equals('/doctors/treatment-offers/offer-123/cancel'));
    });

    test('ApiConstants defines expected doctor patient endpoints', () {
      expect(ApiConstants.doctorPatients, equals('/doctors/patients'));
      expect(ApiConstants.doctorPatientById('pat-456'), equals('/doctors/patients/pat-456'));
      expect(ApiConstants.doctorPatientVitals('pat-456'), equals('/doctors/patients/pat-456/vitals'));
      expect(ApiConstants.doctorPatientPrescriptions('pat-456'), equals('/doctors/patients/pat-456/prescriptions'));
    });

    test('ApiConstants defines expected CPT and Cath Lab endpoints', () {
      expect(ApiConstants.cpt, equals('/cpt'));
      expect(ApiConstants.cptSearch, equals('/cpt/search'));
      expect(ApiConstants.cptByCode('93458'), equals('/cpt/93458'));
      expect(ApiConstants.appointmentReadiness('apt-123'), equals('/appointments/apt-123/readiness'));
      expect(ApiConstants.appointmentCathLabChecklist('apt-123'), equals('/appointments/apt-123/cath-lab-checklist'));
    });
  });

  group('Doctor Services Integration Interfaces', () {
    test('DoctorTreatmentOfferService can be instantiated and exposes methods', () {
      final service = DoctorTreatmentOfferService();
      expect(service, isNotNull);
      expect(service.getTreatmentOffers, isA<Function>());
      expect(service.getOfferById, isA<Function>());
      expect(service.createTreatmentOffer, isA<Function>());
      expect(service.updateTreatmentOffer, isA<Function>());
      expect(service.dispatchTreatmentOffer, isA<Function>());
      expect(service.getOfferStatus, isA<Function>());
      expect(service.cancelTreatmentOffer, isA<Function>());
    });

    test('DoctorService exposes getMyPatients and getPatientById', () {
      final docService = DoctorService();
      expect(docService.getMyPatients, isA<Function>());
      expect(docService.getPatientById, isA<Function>());
      expect(docService.getPatientVitals, isA<Function>());
      expect(docService.addPatientVitals, isA<Function>());
      expect(docService.getPatientPrescriptions, isA<Function>());
      expect(docService.addPatientPrescription, isA<Function>());
    });

    test('CptService and CathLabService can be instantiated and expose methods', () {
      final cpt = CptService();
      expect(cpt.getCptCodes, isA<Function>());
      expect(cpt.searchCpt, isA<Function>());
      expect(cpt.getCptByCode, isA<Function>());

      final cathLab = CathLabService();
      expect(cathLab.getReadinessChecklist, isA<Function>());
      expect(cathLab.updateReadinessChecklist, isA<Function>());
      expect(cathLab.getCathLabChecklist, isA<Function>());
      expect(cathLab.submitCathLabChecklist, isA<Function>());
    });
  });
}


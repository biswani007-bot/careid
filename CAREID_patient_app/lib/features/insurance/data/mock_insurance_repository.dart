import '../domain/models/insurance_models.dart';
import 'insurance_service.dart';
import '../../profile/data/demo_patient_profile_store.dart';

class MockInsuranceRepository {
  MockInsuranceRepository._();
  static final MockInsuranceRepository instance = MockInsuranceRepository._();

  bool isTestMode = false;
  bool _hasPolicyFromBackend = false;
  bool _hasOffersFromBackend = false;
  bool get hasPolicyFromBackend => _hasPolicyFromBackend;

  List<TreatmentOfferItem> _apiTreatmentOffers = [];
  List<Map<String, dynamic>> _apiFinancingOptions = [];
  List<Map<String, dynamic>> _apiConsents = [];

  List<Map<String, dynamic>> get financingOptions => List.unmodifiable(_apiFinancingOptions);
  List<Map<String, dynamic>> get activeConsents => List.unmodifiable(_apiConsents);

  Future<void> syncWithBackend() async {
    if (isTestMode || DemoPatientProfileStore.instance.isTestMode) return;
    try {
      final polRes = await InsuranceService.instance.getPolicies();
      if (polRes.isSuccess && polRes.data != null && polRes.data!.isNotEmpty) {
        final pol = polRes.data!.first;
        final provider = pol['providerName']?.toString() ?? 'Cigna';
        final policyNo = pol['policyNumber']?.toString() ?? 'CIG-112233';
        final groupNo = pol['groupNumber']?.toString() ?? '';
        final member = DemoPatientProfileStore.instance.fullName.isNotEmpty
            ? DemoPatientProfileStore.instance.fullName
            : 'Patient';
        final deductible = pol['deductibleAmount'] != null ? '\$${pol['deductibleAmount']}.00 / Year' : r'$500.00 / Year';
        final status = pol['status']?.toString() ?? 'Active';
        final isVerified = pol['verificationStatus']?.toString().toUpperCase() == 'VERIFIED';
        final planType = pol['coverageDetails']?.toString() ?? 'Comprehensive Health Coverage';
        final expiry = pol['expiryDate']?.toString() ?? '12 / 2027';

        _primaryPolicy = InsurancePolicy(
          id: pol['id']?.toString() ?? 'pol-cigna',
          providerName: provider,
          memberName: member,
          policyNumber: policyNo,
          groupNumber: groupNo,
          payerId: 'PAYER-$provider-01',
          rxBin: '004336',
          rxPcn: 'ADV',
          rxGroup: groupNo,
          planType: planType,
          effectiveDate: pol['startDate']?.toString() ?? 'January 01, 2024',
          expiryDate: expiry,
          deductibleAnnual: deductible,
          totalBenefitsUsed: 1240.0,
          totalBenefitsMax: (pol['maxLimit'] as num?)?.toDouble() ?? 5000.0,
          inpatientCoveragePercent: 95,
          prescriptionCoveragePercent: 80,
          isVerified: isVerified,
          status: status,
          emergencyPhone: '1-800-HEALTH-360',
        );
        _hasPolicyFromBackend = true;
      } else {
        final res = await InsuranceService.instance.getInsuranceCards();
        if (res.isSuccess && res.data != null && res.data!.isNotEmpty) {
          final card = res.data!.first;
          final provider = card['providerName']?.toString() ?? card['provider']?.toString() ?? 'Cigna';
          final policyNo = card['policyNumber']?.toString() ?? card['cardNumber']?.toString() ?? 'CIG-112233';
          final member = DemoPatientProfileStore.instance.fullName.isNotEmpty
              ? DemoPatientProfileStore.instance.fullName
              : 'Patient';
          _primaryPolicy = _primaryPolicy.copyWith(
            providerName: provider,
            policyNumber: policyNo,
            memberName: member,
          );
          _hasPolicyFromBackend = true;
        }
      }

      // PA-09 READ-ONLY: Treatment Offers
      final offersRes = await InsuranceService.instance.getTreatmentOffers();
      if (offersRes.isSuccess && offersRes.data != null) {
        _apiTreatmentOffers = offersRes.data!.map((o) {
          final rawStatus = (o['status']?.toString() ?? 'DISPATCHED').toUpperCase();
          final mappedStatus = rawStatus == 'DISPATCHED'
              ? 'Pending'
              : (rawStatus.contains('ACCEPT')
                  ? 'Accepted'
                  : (rawStatus.contains('REJECT') || rawStatus.contains('DECLIN')
                      ? 'Declined'
                      : rawStatus));
          final net = (o['netPayable'] as num?)?.toDouble() ?? 0.0;
          final gross = (o['grossEstimate'] as num?)?.toDouble() ?? net;
          final discPct = (o['discountPercent'] as num?)?.toInt() ?? 0;
          final tenure = (o['recommendedTenureMonths'] as num?)?.toInt() ?? 12;
          final monthly = (o['financingEligible'] == true && tenure > 0 && net > 0)
              ? '\$${(net / tenure).toStringAsFixed(2)} / mo'
              : null;
          final docName = o['doctorName']?.toString() ?? 'Attending Specialist';
          final facName = o['facilityName']?.toString() ?? 'CareID Partner Facility';
          final validRaw = o['validUntil']?.toString() ?? '';
          final validDate = validRaw.isNotEmpty ? validRaw.split('T').first : 'Active';

          return TreatmentOfferItem(
            id: o['id']?.toString() ?? '',
            category: 'Treatment Plan',
            providerName: facName,
            title: o['clinicalIndication']?.toString() ?? 'Recommended Clinical Treatment',
            subtitle: '$facName • $docName',
            doctorAttribution: 'Recommended by $docName',
            doctorAvatar: 'assets/images/doctor_sarah_jenkins.png',
            amount: net,
            originalAmount: gross,
            discountBadge: discPct > 0
                ? '$discPct% Clinic Discount'
                : (o['financingEligible'] == true ? 'Financing Eligible' : 'Standard Estimate'),
            status: mappedStatus,
            validUntil: validDate,
            monthlyInstallment: monthly,
            referenceCode: o['offerNumber']?.toString() ?? '#TO',
          );
        }).toList();
        _hasOffersFromBackend = true;
      }

      // PA-10 READ-ONLY: Financing options catalog
      final finRes = await InsuranceService.instance.getFinancingOptions();
      if (finRes.isSuccess && finRes.data != null) {
        _apiFinancingOptions = List.from(finRes.data!);
      }

      // PA-11 READ-ONLY: Active Consents
      final consentRes = await InsuranceService.instance.getSecurityConsents();
      if (consentRes.isSuccess && consentRes.data != null) {
        _apiConsents = List.from(consentRes.data!);
      }
    } catch (_) {}
  }

  InsurancePolicy _primaryPolicy = const InsurancePolicy(
    id: 'pol-cigna',
    providerName: 'Cigna',
    memberName: 'Sarah yo',
    policyNumber: 'CIG-112233',
    groupNumber: 'GRP-998877',
    payerId: 'BCBS-GLOBAL-88',
    rxBin: '004336',
    rxPcn: 'ADV',
    rxGroup: 'GRP-998877',
    planType: 'Co-pay \$20, Deductible \$500',
    effectiveDate: 'January 01, 2024',
    expiryDate: '12 / 2027',
    deductibleAnnual: r'$500.00 / Year',
    totalBenefitsUsed: 0.0,
    totalBenefitsMax: 1000000.0,
    inpatientCoveragePercent: 95,
    prescriptionCoveragePercent: 80,
    isVerified: true,
    status: 'Active',
    emergencyPhone: '1-800-HEALTH-360',
  );

  InsurancePolicy get primaryPolicy => _primaryPolicy;

  void updatePrimaryPolicy(InsurancePolicy updated) {
    _primaryPolicy = updated;
  }

  final List<InsuranceActivityItem> _activities = [
    const InsuranceActivityItem(
      id: 'act-01',
      title: 'Policy Verified',
      description: 'Your BlueCross PPO was successfully re-verified.',
      timestamp: '2d ago',
      type: 'verified',
    ),
    const InsuranceActivityItem(
      id: 'act-02',
      title: 'New Claim Submitted',
      description: 'Annual physical exam claim #920-X.',
      timestamp: '5d ago',
      type: 'claim',
    ),
    const InsuranceActivityItem(
      id: 'act-03',
      title: 'Details Updated',
      description: 'You updated the emergency contact info.',
      timestamp: '1w ago',
      type: 'updated',
    ),
  ];

  List<InsuranceActivityItem> get activities => List.unmodifiable(_activities);

  final List<TreatmentOfferItem> _treatmentOffers = [
    const TreatmentOfferItem(
      id: 'offer-01',
      category: 'Dental Plan',
      providerName: 'City Dental Care',
      title: 'Comprehensive Dental Restoration & Scaling',
      subtitle: 'City Dental Care • Dr. Vance',
      doctorAttribution: 'Recommended by Dr. Julian Vance, DDS',
      doctorAvatar: 'assets/images/06a82332265255b7f77a603775af37fac540e185.png',
      amount: 1572.50,
      originalAmount: 1850.0,
      discountBadge: '15% Direct Clinic Discount',
      status: 'Pending',
      validUntil: 'Nov 30, 2023',
      referenceCode: '#TX-88410',
    ),
    const TreatmentOfferItem(
      id: 'offer-02',
      category: 'Ophthalmology Care',
      providerName: 'VisionCare Specialists',
      title: 'Retinal Fundus High-Res Diagnostic & Treatment',
      subtitle: 'VisionCare Specialists',
      doctorAttribution: 'Care ID Partner • Dr. Laura Zhao, MD',
      doctorAvatar: 'assets/images/d2aa38af25a18eba089afd205f91ed218bf60c72.png',
      amount: 920.0,
      originalAmount: 920.0,
      discountBadge: '0% Interest 6-Month Financing',
      status: 'Pending',
      validUntil: 'Dec 10, 2023',
      monthlyInstallment: r'$153.33 / mo',
      referenceCode: '#TX-91024',
    ),
    const TreatmentOfferItem(
      id: 'offer-03',
      category: 'Pathology & Labs',
      providerName: "St. Mary's General Hospital",
      title: 'Annual Comprehensive Bloodwork Panel',
      subtitle: "St. Mary's General Hospital",
      doctorAttribution: 'Validated by Hospital Clinical Pathology Dept.',
      doctorAvatar: 'assets/images/c1c4a88cb83c006f5a654a6c44c94e6597802765.png',
      amount: 382.50,
      originalAmount: 450.0,
      discountBadge: '15% Prompt Cash Discount Applied',
      status: 'Accepted',
      validUntil: 'Oct 18, 2023',
      referenceCode: '#TX-77412',
    ),
    const TreatmentOfferItem(
      id: 'offer-04',
      category: 'Cardio Health',
      providerName: 'Metro Heart Institute',
      title: 'Preventative Holter Monitoring 48h',
      subtitle: 'Metro Heart Institute',
      doctorAttribution: 'Alternative therapy chosen by patient',
      doctorAvatar: 'assets/images/4ea3999e6f20b841c2216c2af09a17eb921e311a.png',
      amount: 620.0,
      originalAmount: 620.0,
      discountBadge: r'Original Estimate: $620.00',
      status: 'Declined',
      validUntil: 'Sep 04, 2023',
      referenceCode: '#TX-65109',
    ),
  ];

  List<TreatmentOfferItem> get treatmentOffers {
    if (!isTestMode && !DemoPatientProfileStore.instance.isTestMode) {
      return _hasOffersFromBackend ? List.unmodifiable(_apiTreatmentOffers) : const [];
    }
    return List.unmodifiable(_treatmentOffers);
  }

  final List<PartnerHospital> _partnerHospitals = [
    const PartnerHospital(
      id: 'hosp-01',
      name: 'Metro Health Academic Center',
      subtitle: 'Accepts 0% Financing & Direct Discounts',
      distance: '2.4 miles away • In-Network',
      imageAsset: 'assets/images/e99affd91b9cf73e272a31f7fb4c07a40f4cb10e.png',
    ),
  ];

  List<PartnerHospital> get partnerHospitals => List.unmodifiable(_partnerHospitals);

  final List<HistoricalOfferItem> _historicalOffers = [
    const HistoricalOfferItem(
      id: 'hist-1',
      title: 'Comprehensive Dental Restoration',
      clinic: 'City Dental Care',
      category: 'dental',
      status: 'Accepted',
      date: 'Oct 20, 2023',
      referenceCode: '#TRT-OFFER-8841',
      amount: 1522.50,
      savedAmount: 327.50,
      amountLabel: 'Total Amount',
    ),
    const HistoricalOfferItem(
      id: 'hist-2',
      title: 'Retinal Fundus High-Res Diagnostic',
      clinic: 'VisionCare Optometry',
      category: 'vision',
      status: 'Declined',
      date: 'Oct 14, 2023',
      referenceCode: '#OPT-8012',
      amount: 920.00,
      badgeText: 'Declined by Patient',
      amountLabel: 'Quoted Estimate',
    ),
    const HistoricalOfferItem(
      id: 'hist-3',
      title: 'Panoramic Radiography & Scaling',
      clinic: 'City Dental Care',
      category: 'dental',
      status: 'Completed',
      date: 'Sep 12, 2023',
      referenceCode: '#DEN-7390',
      amount: 382.50,
      badgeText: 'Cash Discount',
      amountLabel: 'Paid Total',
    ),
    const HistoricalOfferItem(
      id: 'hist-4',
      title: 'Physical Therapy Package',
      clinic: 'Metro Health Center',
      category: 'therapy',
      status: 'Expired',
      date: 'Aug 01, 2023',
      referenceCode: '#PT-6521',
      amount: 600.00,
      badgeText: 'Validity expired 30 days',
      amountLabel: 'Original Offer',
    ),
  ];

  List<HistoricalOfferItem> get historicalOffers => List.unmodifiable(_historicalOffers);
}


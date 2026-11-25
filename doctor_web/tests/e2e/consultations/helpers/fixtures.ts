/**
 * CareID Consultations & Treatment Lifecycle - Test Fixtures & Datasets
 * Standard procedures, clinical justifications, partner financing datasets,
 * and realistic specialty scenarios.
 */

import { TEST_PATIENT_ID, TEST_FACILITY_ID } from './consultationApiHelper.ts';

export const CPT_CATALOG = {
  // Cardiology
  ANGIOGRAM: {
    procedureCode: 'CPT-93458',
    procedureName: 'Left Heart Catheterization with Coronary Angiogram',
    unitCost: 4500,
    category: 'DIAGNOSTIC' as const,
    clinicalJustification: 'Evaluation of multivessel CAD and hemodynamics.',
  },
  PCI_STENT: {
    procedureCode: 'CPT-92928',
    procedureName: 'Percutaneous Transcatheter Placement of Intracoronary Stent',
    unitCost: 8500,
    category: 'SURGICAL' as const,
    clinicalJustification: 'Critical 90% stenosis in proximal LAD requiring drug-eluting stent.',
  },
  ECHOCARDIOGRAM: {
    procedureCode: 'CPT-93306',
    procedureName: 'Transthoracic Echocardiography with Doppler',
    unitCost: 1200,
    category: 'DIAGNOSTIC' as const,
    clinicalJustification: 'Assessment of left ventricular ejection fraction and regional wall motion.',
  },
  // Orthopedics
  KNEE_ARTHROPLASTY: {
    procedureCode: 'CPT-27447',
    procedureName: 'Total Knee Arthroplasty (Replacement)',
    unitCost: 14500,
    category: 'SURGICAL' as const,
    clinicalJustification: 'End-stage tricompartmental osteoarthritis refractory to conservative care.',
  },
  KNEE_ARTHROSCOPY: {
    procedureCode: 'CPT-29881',
    procedureName: 'Arthroscopy, Knee, Surgical with Meniscectomy',
    unitCost: 3800,
    category: 'SURGICAL' as const,
    clinicalJustification: 'Complex degenerative medial meniscus tear with mechanical locking.',
  },
  // Ophthalmology
  CATARACT_EXTRACTION: {
    procedureCode: 'CPT-66984',
    procedureName: 'Extracapsular Cataract Removal with IOL Insertion',
    unitCost: 3400,
    category: 'SURGICAL' as const,
    clinicalJustification: 'Grade 3 nuclear sclerotic cataract impairing visual acuity (20/80).',
  },
  // General Surgery
  LAP_CHOLECYSTECTOMY: {
    procedureCode: 'CPT-47562',
    procedureName: 'Laparoscopic Cholecystectomy',
    unitCost: 6800,
    category: 'SURGICAL' as const,
    clinicalJustification: 'Symptomatic cholelithiasis with recurrent biliary colic.',
  },
};

export function createValidOfferPayload(overrides: Record<string, unknown> = {}) {
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    patientProfileId: TEST_PATIENT_ID,
    facilityId: TEST_FACILITY_ID,
    clinicalIndication: 'Severe Coronary Artery Disease with unstable angina',
    procedures: [
      {
        ...CPT_CATALOG.ANGIOGRAM,
        quantity: 1,
        isOptional: false,
      },
      {
        ...CPT_CATALOG.PCI_STENT,
        quantity: 1,
        isOptional: true,
      },
    ],
    validUntil,
    discountAmount: 1000,
    financingEligible: true,
    recommendedTenureMonths: 12,
    clinicalNotes: 'Patient consented for diagnostic catheterization with provisional PCI stenting.',
    termsAndConditions: 'All procedural fees cover standard surgical admission and 30-day post-op follow up.',
    ...overrides,
  };
}

export const CLINICAL_WORKFLOW_SCENARIOS = {
  cardiology: {
    specialty: 'Interventional Cardiology',
    patientName: 'Marcus Doe',
    indication: 'Multivessel CAD with symptomatic angina on exertion',
    procedures: [
      {
        procedureCode: 'CPT-93458',
        procedureName: 'Left Heart Catheterization with Coronary Angiogram',
        unitCost: 4500,
        category: 'DIAGNOSTIC' as const,
        quantity: 1,
        isOptional: false,
        clinicalJustification: 'Diagnostic coronary angiography to assess LMCA and LAD stenosis.',
      },
      {
        procedureCode: 'CPT-92928',
        procedureName: 'Percutaneous Transcatheter Placement of Intracoronary Stent',
        unitCost: 8500,
        category: 'SURGICAL' as const,
        quantity: 1,
        isOptional: true,
        clinicalJustification: 'Provisional single-vessel DES placement in LAD if lesion >70%.',
      },
    ],
    discountAmount: 500,
    grossEstimate: 13000,
    netPayable: 12500,
    financingPackage: 'opt-zerocost-care',
    tenureMonths: 12,
  },
  orthopedics: {
    specialty: 'Orthopedic Surgery',
    patientName: 'Marcus Doe',
    indication: 'Severe bilateral osteoarthritis of knees (Grade IV Kellgren-Lawrence)',
    procedures: [
      {
        procedureCode: 'CPT-27447',
        procedureName: 'Total Knee Arthroplasty (Replacement)',
        unitCost: 14500,
        category: 'SURGICAL' as const,
        quantity: 1,
        isOptional: false,
        clinicalJustification: 'Right knee joint reconstruction and prosthetic implantation.',
      },
    ],
    discountAmount: 1500,
    grossEstimate: 14500,
    netPayable: 13000,
    financingPackage: 'opt-surgery-flex',
    tenureMonths: 24,
  },
  ophthalmology: {
    specialty: 'Ophthalmology',
    patientName: 'Marcus Doe',
    indication: 'Bilateral senile cataract with dense nuclear sclerosis',
    procedures: [
      {
        procedureCode: 'CPT-66984',
        procedureName: 'Extracapsular Cataract Removal with IOL Insertion',
        unitCost: 3200,
        category: 'SURGICAL' as const,
        quantity: 1,
        isOptional: false,
        clinicalJustification: 'Phacoemulsification with toric intraocular lens implantation.',
      },
    ],
    discountAmount: 200,
    grossEstimate: 3200,
    netPayable: 3000,
    financingPackage: 'opt-wellness-quick',
    tenureMonths: 6,
  },
  surgery: {
    specialty: 'General & Minimally Invasive Surgery',
    patientName: 'Marcus Doe',
    indication: 'Acute calculous cholecystitis with repeated emergency encounters',
    procedures: [
      {
        procedureCode: 'CPT-47562',
        procedureName: 'Laparoscopic Cholecystectomy',
        unitCost: 6800,
        category: 'SURGICAL' as const,
        quantity: 1,
        isOptional: false,
        clinicalJustification: 'Minimally invasive gallbladder removal to prevent pancreatitis.',
      },
    ],
    discountAmount: 800,
    grossEstimate: 6800,
    netPayable: 6000,
    financingPackage: 'opt-zerocost-care',
    tenureMonths: 6,
  },
};

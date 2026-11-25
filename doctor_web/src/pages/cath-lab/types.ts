export interface SafetyChecklistState {
  patientIdentity: boolean;
  clinicalSafety: boolean;
  diagnosticImaging: boolean;
  plannedProcedure: boolean;
  signedConsents: boolean;
  teamRoster: boolean;
}

export interface CathLabContext {
  patientName: string;
  patientDob: string;
  patientAgeGender: string;
  patientCid: string;
  nfcToken: string;
  wristbandStatus: string;
  verbalConfirmation: string;

  // Allergies & Safety Safeguards
  allergyFlagged: boolean;
  allergyName: string;
  contraindicatedDrug: string;
  substituteDrug: string;
  metforminStatus: string;
  coagulationInr: string;
  plateletCount: string;
  vitals: {
    bp: string;
    hr: string;
    spo2: string;
    temp: string;
  };

  // Diagnostic & Imaging Correlation
  stressTestResult: string;
  stressTestDetail: string;
  tteLvef: string;
  tteDetail: string;

  // Planned Procedure & Site Verification
  procedureName: string;
  cptCode: string;
  tierAccess: string;
  primaryAccessSite: string;
  primaryAccessDetail: string;
  secondaryAccessSite: string;
  secondaryAccessDetail: string;
  cathSuite: string;
  fluoroscopyUnit: string;
  contrastMedia: string;

  // Signed Consents & Clearance
  consentFormName: string;
  consentSignedBy: string;
  consentWitness: string;
  financialSettlementId: string;
  financialPlanDetail: string;

  // Team Roster
  roster: Array<{
    role: string;
    name: string;
    initials: string;
    status: string;
    avatarBg: string;
    avatarText: string;
  }>;

  // Operational State
  protocolStatus: 'active' | 'hold' | 'ratified';
  holdReason?: string;
  holdNotes?: string;
  holdTimestamp?: string;
  ratifiedTimestamp?: string;
}

export const DEFAULT_CATH_LAB_DATA: CathLabContext = {
  patientName: 'Loading Patient...',
  patientDob: '—',
  patientAgeGender: '—',
  patientCid: '—',
  nfcToken: '—',
  wristbandStatus: 'Pending verification',
  verbalConfirmation: 'Pending patient identity & procedure confirmation.',

  allergyFlagged: false,
  allergyName: 'None reported',
  contraindicatedDrug: '—',
  substituteDrug: '—',
  metforminStatus: '—',
  coagulationInr: '—',
  plateletCount: '—',
  vitals: {
    bp: '—',
    hr: '—',
    spo2: '—',
    temp: '—',
  },

  stressTestResult: '—',
  stressTestDetail: 'Awaiting pre-procedure diagnostic records.',
  tteLvef: '—',
  tteDetail: 'Awaiting echocardiogram summary.',

  procedureName: 'Clinical Procedure',
  cptCode: '—',
  tierAccess: '—',
  primaryAccessSite: '—',
  primaryAccessDetail: '—',
  secondaryAccessSite: '—',
  secondaryAccessDetail: '—',
  cathSuite: 'Cath Lab Suite',
  fluoroscopyUnit: '—',
  contrastMedia: '—',

  consentFormName: 'Procedural Informed Consent',
  consentSignedBy: '—',
  consentWitness: '—',
  financialSettlementId: '—',
  financialPlanDetail: 'Pending financial verification',

  roster: [],

  protocolStatus: 'active',
};

export interface EncounterTelemetry {
  encounterId: string;
  scheduledSlot: string;
  actualInduction: string;
  elapsedSeconds: number;
  patientName: string;
  patientCid: string;
  patientDob: string;
  patientAgeGender: string;
  facility: string;
  attendingPhysician: string;
  cptCode: string;
  procedureName: string;
  accessApproach: string;
  fluoroTimeMinutes: number;
  radiationDap: number;
  contrastInjectedMl: number;
  bp: string;
  hr: string;
  spo2: string;
  actSeconds: number;
  lvedp: string;
  aorticRootBp: string;
  radialSbp: string;
}

export interface CoronaryVesselFinding {
  vessel: string;
  fullName: string;
  stenosisPercent: number;
  description: string;
  timiFlow: string;
  status: 'normal' | 'mild' | 'moderate' | 'severe';
  ffrIndicated: boolean;
}

export interface EncounterDocumentationState {
  encounterId: string;
  telemetry: EncounterTelemetry;
  vesselFindings: CoronaryVesselFinding[];
  lvefPercent: number;
  lvefDescription: string;
  hemostasisMethod: string;
  trBandAirMl: number;
  trBandWeaningSchedule: Array<{
    time: string;
    action: string;
    volumeRemaining: string;
    completed: boolean;
  }>;
  primaryDiagnosisIcd: string;
  primaryDiagnosisDesc: string;
  secondaryDiagnosisIcd: string;
  secondaryDiagnosisDesc: string;
  prescriptions: Array<{
    medication: string;
    dosage: string;
    sig: string;
    quantity: string;
  }>;
  recoveryBay: string;
  bedrestHours: number;
  dischargeEscort: string;
  followUpWeeks: number;
  physicianAttested: boolean;
  attestationTimestamp?: string;
  cryptoSealHash: string;
}

export const DEFAULT_ENCOUNTER_DATA: EncounterDocumentationState = {
  encounterId: '',
  telemetry: {
    encounterId: '—',
    scheduledSlot: '—',
    actualInduction: '—',
    elapsedSeconds: 0,
    patientName: 'Loading Patient...',
    patientCid: '—',
    patientDob: '—',
    patientAgeGender: '—',
    facility: 'Clinical Facility',
    attendingPhysician: 'Attending Physician',
    cptCode: '—',
    procedureName: 'Clinical Procedure',
    accessApproach: '—',
    fluoroTimeMinutes: 0,
    radiationDap: 0,
    contrastInjectedMl: 0,
    bp: '—',
    hr: '—',
    spo2: '—',
    actSeconds: 0,
    lvedp: '—',
    aorticRootBp: '—',
    radialSbp: '—',
  },
  vesselFindings: [],
  lvefPercent: 0,
  lvefDescription: 'Awaiting post-procedure documentation.',
  hemostasisMethod: '—',
  trBandAirMl: 0,
  trBandWeaningSchedule: [],
  primaryDiagnosisIcd: '—',
  primaryDiagnosisDesc: 'Pending physician documentation',
  secondaryDiagnosisIcd: '—',
  secondaryDiagnosisDesc: '—',
  prescriptions: [],
  recoveryBay: '—',
  bedrestHours: 0,
  dischargeEscort: '—',
  followUpWeeks: 0,
  physicianAttested: false,
  attestationTimestamp: undefined,
  cryptoSealHash: '',
};

export function formatDoctorDisplayName(fullName?: string, fallback = 'Attending Physician'): {
  displayName: string;
  withDegree: string;
  initials: string;
} {
  if (!fullName) {
    return { displayName: fallback, withDegree: `${fallback}, MD`, initials: 'AP' };
  }
  let clean = fullName.replace(/^Dr\.\s*/i, '').trim();
  const hasMd = /,\s*MD$/i.test(clean) || /\s+MD$/i.test(clean);
  if (hasMd) {
    clean = clean.replace(/,?\s*MD$/i, '').trim();
  }
  const displayName = `Dr. ${clean}`;
  const withDegree = `Dr. ${clean}, MD`;
  const initials = clean
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AP';

  return { displayName, withDegree, initials };
}


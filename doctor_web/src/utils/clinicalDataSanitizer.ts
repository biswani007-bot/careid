/**
 * Clinical Data Separation & Sanitization Utility (CAREID-020)
 *
 * Ensures Doctor Web never displays raw JSON, serialized objects, technical identifiers,
 * or internal section headers inside patient-facing or doctor-facing clinical indication fields.
 */

export interface StructuredSafetyHoldItem {
  id: string;
  holdId: string;
  appointmentId?: string | null;
  treatmentOfferId?: string | null;
  patientProfileId?: string | null;
  facilityId?: string | null;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  holdCategory: string;
  categoryLabel: string;
  reason: string;
  clinicalNotes?: string | null;
  declaredBy?: string | null;
  declaredByName?: string | null;
  declaredAt: string;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  durationSeconds?: number | null;
  isLegacyParsed?: boolean;
}

export const SAFETY_HOLD_CATEGORY_MAP: Record<string, string> = {
  RADIATION_OR_CONTRAST_HAZARD: 'Radiation or Contrast Hazard',
  PATIENT_HEMODYNAMIC_INSTABILITY: 'Patient Hemodynamic Instability',
  ANESTHESIA_AIRWAY_COMPROMISE: 'Anesthesia / Airway Compromise',
  CONSENT_OR_IDENTIFICATION_DISCREPANCY: 'Consent or Identification Discrepancy',
  MEDICATION_ERROR: 'Medication or Anticoagulation Hazard',
  STERILITY_BREACH: 'Sterility Breach or Contamination',
  EQUIPMENT_MALFUNCTION: 'Equipment or Fluoroscopy Malfunction',
  STAFF_UNAVAILABILITY: 'Critical Staff Unavailability',
  OTHER_SAFETY_HAZARD: 'Other Clinical Safety Hazard',
  OTHER: 'Clinical Safety Hazard',
};

export function getReadableHoldCategory(code: string | undefined | null): string {
  if (!code) return 'Clinical Safety Hazard';
  if (SAFETY_HOLD_CATEGORY_MAP[code]) {
    return SAFETY_HOLD_CATEGORY_MAP[code];
  }
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function extractCleanClinicalIndication(
  rawIndication: string | undefined | null,
  fallbackProcedureName?: string,
): string {
  if (!rawIndication || typeof rawIndication !== 'string') {
    return fallbackProcedureName
      ? `Clinical necessity and interventional protocol indicated for ${fallbackProcedureName}.`
      : 'Underwritten interventional clinical procedure.';
  }

  const trimmed = rawIndication.trim();

  // Strip section markers (e.g. `--- SAFETY_HOLD_HISTORY ---`, `--- ACTIVE_SAFETY_HOLD ---`)
  let cleanText = trimmed
    .replace(/--- [A-Z0-9_]+ ---[\s\S]*/g, '')
    .trim();

  // If text starts with a raw JSON blob (e.g. `[{ "id": ...` or `{ "id": ...`)
  if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
    cleanText = '';
  }

  // Remove any bracketed JSON residuals
  cleanText = cleanText.replace(/\[\s*\{[\s\S]*\}\s*\]/g, '').trim();

  if (!cleanText || cleanText.length < 3) {
    return fallbackProcedureName
      ? `Clinical necessity and interventional protocol indicated for ${fallbackProcedureName}.`
      : 'Underwritten interventional clinical procedure.';
  }

  return cleanText;
}

export function parseEmbeddedSafetyHolds(
  rawText: string | undefined | null,
): StructuredSafetyHoldItem[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const holds: StructuredSafetyHoldItem[] = [];

  // 1. Look for --- SAFETY_HOLD_HISTORY ---
  if (rawText.includes('--- SAFETY_HOLD_HISTORY ---')) {
    try {
      const parts = rawText.split('--- SAFETY_HOLD_HISTORY ---');
      const jsonBlock = parts[1]?.split(/\n--- [A-Z0-9_]+ ---/)[0]?.trim();
      if (jsonBlock) {
        const parsed = JSON.parse(jsonBlock);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of arr) {
          if (item && typeof item === 'object') {
            const holdId = item.holdId || item.id || `legacy-hold-${holds.length + 1}`;
            holds.push({
              id: item.id || holdId,
              holdId,
              appointmentId: item.appointmentId || null,
              treatmentOfferId: item.treatmentOfferId || null,
              patientProfileId: item.patientProfileId || null,
              facilityId: item.facilityId || null,
              status: item.status || 'RESOLVED',
              holdCategory: item.holdCategory || 'OTHER_SAFETY_HAZARD',
              categoryLabel: getReadableHoldCategory(item.holdCategory),
              reason: item.reason || 'Emergency procedural safety hold',
              clinicalNotes: item.clinicalNotes || null,
              declaredBy: item.declaredBy || null,
              declaredByName: item.declaredByName || 'Attending Clinician',
              declaredAt: item.declaredAt || new Date().toISOString(),
              resolvedBy: item.resolvedBy || null,
              resolvedByName: item.resolvedByName || (item.resolvedBy ? 'Attending Clinician' : null),
              resolvedAt: item.resolvedAt || null,
              resolutionNotes: item.resolutionNotes || null,
              durationSeconds: item.durationSeconds || null,
              isLegacyParsed: true,
            });
          }
        }
      }
    } catch {
      // Malformed legacy JSON is safely skipped
    }
  }

  // 2. Look for --- ACTIVE_SAFETY_HOLD ---
  if (rawText.includes('--- ACTIVE_SAFETY_HOLD ---')) {
    try {
      const parts = rawText.split('--- ACTIVE_SAFETY_HOLD ---');
      const jsonBlock = parts[1]?.split(/\n--- [A-Z0-9_]+ ---/)[0]?.trim();
      if (jsonBlock) {
        const item = JSON.parse(jsonBlock);
        if (item && typeof item === 'object') {
          const holdId = item.holdId || item.id || 'active-hold-legacy';
          if (!holds.some((h) => h.holdId === holdId)) {
            holds.push({
              id: item.id || holdId,
              holdId,
              appointmentId: item.appointmentId || null,
              treatmentOfferId: item.treatmentOfferId || null,
              patientProfileId: item.patientProfileId || null,
              facilityId: item.facilityId || null,
              status: 'ACTIVE',
              holdCategory: item.holdCategory || 'OTHER_SAFETY_HAZARD',
              categoryLabel: getReadableHoldCategory(item.holdCategory),
              reason: item.reason || 'Active emergency procedural safety hold',
              clinicalNotes: item.clinicalNotes || null,
              declaredBy: item.declaredBy || null,
              declaredByName: item.declaredByName || 'Attending Clinician',
              declaredAt: item.declaredAt || new Date().toISOString(),
              resolvedBy: null,
              resolvedByName: null,
              resolvedAt: null,
              resolutionNotes: null,
              durationSeconds: null,
              isLegacyParsed: true,
            });
          }
        }
      }
    } catch {}
  }

  // 3. Look for direct raw JSON array
  if (rawText.trim().startsWith('[{') && holds.length === 0) {
    try {
      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.holdCategory) {
            const holdId = item.holdId || item.id || `direct-hold-${holds.length + 1}`;
            holds.push({
              id: item.id || holdId,
              holdId,
              appointmentId: item.appointmentId || null,
              treatmentOfferId: item.treatmentOfferId || null,
              patientProfileId: item.patientProfileId || null,
              facilityId: item.facilityId || null,
              status: item.status || 'RESOLVED',
              holdCategory: item.holdCategory || 'OTHER_SAFETY_HAZARD',
              categoryLabel: getReadableHoldCategory(item.holdCategory),
              reason: item.reason || 'Emergency procedural safety hold',
              clinicalNotes: item.clinicalNotes || null,
              declaredBy: item.declaredBy || null,
              declaredByName: item.declaredByName || 'Attending Clinician',
              declaredAt: item.declaredAt || new Date().toISOString(),
              resolvedBy: item.resolvedBy || null,
              resolvedByName: item.resolvedByName || 'Attending Clinician',
              resolvedAt: item.resolvedAt || null,
              resolutionNotes: item.resolutionNotes || null,
              durationSeconds: item.durationSeconds || null,
              isLegacyParsed: true,
            });
          }
        }
      }
    } catch {}
  }

  return holds;
}

export function cleanClinicalNotes(notes: string | undefined | null): string {
  if (!notes || typeof notes !== 'string') return '';
  return notes
    .replace(/--- [A-Z0-9_]+ ---[\s\S]*/g, '')
    .replace(/^\[\s*\{[\s\S]*\}\s*\]$/, '')
    .replace(/^\{\s*"[\s\S]*"\}\s*$/, '')
    .trim();
}

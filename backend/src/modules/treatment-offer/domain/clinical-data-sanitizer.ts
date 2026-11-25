/**
 * Clinical Data Separation & Sanitization Utility (CAREID-020)
 *
 * Enforces clean separation between:
 * 1. Human-readable Clinical Indications & Notes
 * 2. Structured Clinical Safety Holds
 * 3. Clinical Clearance Gates
 * 4. Audit Provenance
 *
 * Prevents raw JSON, serialized objects, technical identifiers, or internal markers
 * from contaminating patient-facing or doctor-facing clinical indication fields.
 */

export interface ParsedSafetyHoldDTO {
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

export interface ClinicalIndicationParseResult {
  cleanClinicalIndication: string;
  legacySafetyHolds: ParsedSafetyHoldDTO[];
  hasLegacyData: boolean;
  hasAmbiguousData: boolean;
  originalRawPreserved?: string;
}

export const SAFETY_HOLD_CATEGORY_LABELS: Record<string, string> = {
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

export function getReadableHoldCategoryLabel(code: string | undefined | null): string {
  if (!code) return 'Clinical Safety Hazard';
  if (SAFETY_HOLD_CATEGORY_LABELS[code]) {
    return SAFETY_HOLD_CATEGORY_LABELS[code];
  }
  // Convert UPPER_SNAKE_CASE to Title Case
  return code
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export class ClinicalDataSanitizer {
  private static readonly SECTION_MARKER_REGEX = /--- [A-Z0-9_]+ ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/g;
  private static readonly SAFETY_HOLD_HISTORY_REGEX = /--- SAFETY_HOLD_HISTORY ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
  private static readonly ACTIVE_SAFETY_HOLD_REGEX = /--- ACTIVE_SAFETY_HOLD ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;

  /**
   * Sanitizes a clinical indication string, safely extracting genuine clinical rationale
   * and parsing any legacy embedded safety hold history without data loss.
   */
  static parseClinicalIndication(
    rawIndication: string | null | undefined,
    fallbackProcedureName?: string,
  ): ClinicalIndicationParseResult {
    if (!rawIndication || typeof rawIndication !== 'string') {
      return {
        cleanClinicalIndication: fallbackProcedureName
          ? `Clinical necessity indicated for ${fallbackProcedureName}.`
          : 'Underwritten clinical procedure indication.',
        legacySafetyHolds: [],
        hasLegacyData: false,
        hasAmbiguousData: false,
      };
    }

    const trimmed = rawIndication.trim();
    const hasHistoryMarker = trimmed.includes('--- SAFETY_HOLD_HISTORY ---');
    const hasActiveMarker = trimmed.includes('--- ACTIVE_SAFETY_HOLD ---');
    const hasAnySectionMarker = /--- [A-Z0-9_]+ ---/.test(trimmed);

    // If completely clean clinical text without any serialized section markers
    if (!hasAnySectionMarker && !trimmed.startsWith('[{') && !trimmed.startsWith('{"')) {
      return {
        cleanClinicalIndication: trimmed,
        legacySafetyHolds: [],
        hasLegacyData: false,
        hasAmbiguousData: false,
      };
    }

    const legacySafetyHolds: ParsedSafetyHoldDTO[] = [];
    let hasAmbiguousData = false;

    // 1. Extract and parse SAFETY_HOLD_HISTORY
    if (hasHistoryMarker) {
      try {
        const parts = trimmed.split('--- SAFETY_HOLD_HISTORY ---');
        const jsonBlock = parts[1]?.split(/\n--- [A-Z0-9_]+ ---/)[0]?.trim();
        if (jsonBlock) {
          const parsed = JSON.parse(jsonBlock);
          const holdArray = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of holdArray) {
            if (item && typeof item === 'object') {
              const holdId = item.holdId || item.id || `legacy-hold-${legacySafetyHolds.length + 1}`;
              legacySafetyHolds.push({
                id: item.id || holdId,
                holdId,
                appointmentId: item.appointmentId || null,
                treatmentOfferId: item.treatmentOfferId || null,
                patientProfileId: item.patientProfileId || null,
                facilityId: item.facilityId || null,
                status: (item.status === 'ACTIVE' || item.status === 'RESOLVED' || item.status === 'CANCELLED')
                  ? item.status
                  : 'RESOLVED',
                holdCategory: item.holdCategory || 'OTHER_SAFETY_HAZARD',
                categoryLabel: getReadableHoldCategoryLabel(item.holdCategory),
                reason: item.reason || 'Emergency procedural safety hold',
                clinicalNotes: item.clinicalNotes || null,
                declaredBy: item.declaredBy || null,
                declaredByName: item.declaredByName || 'Attending Clinician',
                declaredAt: item.declaredAt || new Date().toISOString(),
                resolvedBy: item.resolvedBy || null,
                resolvedByName: item.resolvedByName || (item.resolvedBy ? 'Attending Clinician' : null),
                resolvedAt: item.resolvedAt || null,
                resolutionNotes: item.resolutionNotes || null,
                durationSeconds: typeof item.durationSeconds === 'number' ? item.durationSeconds : null,
                isLegacyParsed: true,
              });
            }
          }
        }
      } catch {
        hasAmbiguousData = true;
      }
    }

    // 2. Extract and parse ACTIVE_SAFETY_HOLD if present
    if (hasActiveMarker) {
      try {
        const parts = trimmed.split('--- ACTIVE_SAFETY_HOLD ---');
        const jsonBlock = parts[1]?.split(/\n--- [A-Z0-9_]+ ---/)[0]?.trim();
        if (jsonBlock) {
          const item = JSON.parse(jsonBlock);
          if (item && typeof item === 'object') {
            const holdId = item.holdId || item.id || 'active-hold-legacy';
            // Avoid duplicate if already parsed in history
            if (!legacySafetyHolds.some((h) => h.holdId === holdId)) {
              legacySafetyHolds.push({
                id: item.id || holdId,
                holdId,
                appointmentId: item.appointmentId || null,
                treatmentOfferId: item.treatmentOfferId || null,
                patientProfileId: item.patientProfileId || null,
                facilityId: item.facilityId || null,
                status: 'ACTIVE',
                holdCategory: item.holdCategory || 'OTHER_SAFETY_HAZARD',
                categoryLabel: getReadableHoldCategoryLabel(item.holdCategory),
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
      } catch {
        hasAmbiguousData = true;
      }
    }

    // 3. Extract pure clinician narrative text prior to any section markers
    let cleanText = trimmed
      .replace(this.SECTION_MARKER_REGEX, '')
      .replace(/--- [A-Z0-9_]+ ---.*/gs, '')
      .trim();

    // If text was prefixed with JSON directly (e.g. `[{ "id": ...`)
    if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
      try {
        const directJson = JSON.parse(cleanText);
        const directArray = Array.isArray(directJson) ? directJson : [directJson];
        for (const item of directArray) {
          if (item && item.holdCategory) {
            const holdId = item.holdId || item.id || `direct-hold-${legacySafetyHolds.length + 1}`;
            if (!legacySafetyHolds.some((h) => h.holdId === holdId)) {
              legacySafetyHolds.push({
                id: item.id || holdId,
                holdId,
                appointmentId: item.appointmentId || null,
                treatmentOfferId: item.treatmentOfferId || null,
                patientProfileId: item.patientProfileId || null,
                facilityId: item.facilityId || null,
                status: item.status || 'RESOLVED',
                holdCategory: item.holdCategory || 'OTHER_SAFETY_HAZARD',
                categoryLabel: getReadableHoldCategoryLabel(item.holdCategory),
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
        cleanText = '';
      } catch {
        hasAmbiguousData = true;
      }
    }

    // If no human text was entered before the marker, use the safe clinical fallback
    if (!cleanText || cleanText.length < 3) {
      cleanText = fallbackProcedureName
        ? `Clinical necessity and interventional protocol indicated for ${fallbackProcedureName}.`
        : 'Underwritten clinical procedure indication.';
    }

    return {
      cleanClinicalIndication: cleanText,
      legacySafetyHolds,
      hasLegacyData: hasAnySectionMarker || legacySafetyHolds.length > 0,
      hasAmbiguousData,
      originalRawPreserved: trimmed,
    };
  }

  /**
   * Cleans any free-text clinical note field (e.g. appointment notes, chief complaint)
   * to remove technical section markers and serialized JSON before presentation or binding.
   */
  static cleanClinicalNarrative(notes: string | null | undefined): string {
    if (!notes || typeof notes !== 'string') return '';
    return notes
      .replace(this.SECTION_MARKER_REGEX, '')
      .replace(/--- [A-Z0-9_]+ ---.*/gs, '')
      .replace(/^\[\s*\{[\s\S]*\}\s*\]$/, '')
      .replace(/^\{\s*"[\s\S]*"\}\s*$/, '')
      .trim();
  }
}

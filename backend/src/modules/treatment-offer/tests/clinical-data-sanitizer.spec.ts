import {
  ClinicalDataSanitizer,
  getReadableHoldCategoryLabel,
} from '../domain/clinical-data-sanitizer';

describe('ClinicalDataSanitizer (CAREID-020 Remediation)', () => {
  describe('parseClinicalIndication', () => {
    it('should return clean indication as-is when no markers or JSON are present', () => {
      const input = 'Severe 3-vessel coronary artery disease with refractory angina.';
      const result = ClinicalDataSanitizer.parseClinicalIndication(input, 'Coronary Angioplasty');

      expect(result.cleanClinicalIndication).toBe(input);
      expect(result.legacySafetyHolds).toHaveLength(0);
      expect(result.hasLegacyData).toBe(false);
      expect(result.hasAmbiguousData).toBe(false);
    });

    it('should cleanly extract genuine clinical text and parse legacy embedded SAFETY_HOLD_HISTORY', () => {
      const rawLegacy = `Patient scheduled for diagnostic catheterization.

--- SAFETY_HOLD_HISTORY ---
[
  {
    "id": "hold-uuid-1",
    "holdId": "hold-uuid-1",
    "appointmentId": "appt-uuid-99",
    "status": "RESOLVED",
    "holdCategory": "RADIATION_OR_CONTRAST_HAZARD",
    "reason": "Cumulative fluoroscopy DAP threshold exceeded; 15-minute radiation pause executed.",
    "clinicalNotes": "Bedside radiometer calibrated; ALARA shield repositioned.",
    "declaredBy": "doc-uuid-1",
    "declaredAt": "2026-11-20T10:00:00.000Z",
    "resolvedBy": "doc-uuid-2",
    "resolvedAt": "2026-11-20T10:15:00.000Z",
    "resolutionNotes": "Fluoroscopy timer reset. DAP within safe margin.",
    "durationSeconds": 900
  }
]`;

      const result = ClinicalDataSanitizer.parseClinicalIndication(rawLegacy, 'Cardiac Catheterization');

      // Genuine clinical indication must NOT contain raw JSON or markers
      expect(result.cleanClinicalIndication).toBe('Patient scheduled for diagnostic catheterization.');
      expect(result.cleanClinicalIndication).not.toContain('SAFETY_HOLD_HISTORY');
      expect(result.cleanClinicalIndication).not.toContain('{');
      expect(result.cleanClinicalIndication).not.toContain('RADIATION_OR_CONTRAST_HAZARD');

      // Structured safety hold history must be faithfully extracted
      expect(result.hasLegacyData).toBe(true);
      expect(result.hasAmbiguousData).toBe(false);
      expect(result.legacySafetyHolds).toHaveLength(1);

      const hold = result.legacySafetyHolds[0];
      expect(hold.holdId).toBe('hold-uuid-1');
      expect(hold.status).toBe('RESOLVED');
      expect(hold.holdCategory).toBe('RADIATION_OR_CONTRAST_HAZARD');
      expect(hold.categoryLabel).toBe('Radiation or Contrast Hazard');
      expect(hold.reason).toBe('Cumulative fluoroscopy DAP threshold exceeded; 15-minute radiation pause executed.');
      expect(hold.resolvedBy).toBe('doc-uuid-2');
      expect(hold.durationSeconds).toBe(900);
      expect(hold.isLegacyParsed).toBe(true);
    });

    it('should use fallback procedure name if clinical indication text was empty prior to the marker', () => {
      const rawLegacy = `--- SAFETY_HOLD_HISTORY ---
[
  {
    "holdId": "hold-uuid-empty",
    "status": "RESOLVED",
    "holdCategory": "PATIENT_HEMODYNAMIC_INSTABILITY",
    "reason": "Transient vasovagal hypotension"
  }
]`;

      const result = ClinicalDataSanitizer.parseClinicalIndication(rawLegacy, 'Elective Stent Placement');

      expect(result.cleanClinicalIndication).toBe(
        'Clinical necessity and interventional protocol indicated for Elective Stent Placement.',
      );
      expect(result.cleanClinicalIndication).not.toContain('---');
      expect(result.legacySafetyHolds).toHaveLength(1);
      expect(result.legacySafetyHolds[0].holdCategory).toBe('PATIENT_HEMODYNAMIC_INSTABILITY');
    });

    it('should handle raw JSON string prefix without throwing and flag ambiguous legacy data if corrupted', () => {
      const corrupted = '--- SAFETY_HOLD_HISTORY ---\n[ { "badJson": missingQuote } ]';
      const result = ClinicalDataSanitizer.parseClinicalIndication(corrupted, 'Coronary Angiography');

      expect(result.hasAmbiguousData).toBe(true);
      expect(result.cleanClinicalIndication).toBe(
        'Clinical necessity and interventional protocol indicated for Coronary Angiography.',
      );
      expect(result.cleanClinicalIndication).not.toContain('badJson');
    });

    it('should handle active safety hold marker and avoid duplicate holds', () => {
      const input = `Pre-op clearance required.
--- ACTIVE_SAFETY_HOLD ---
{
  "holdId": "active-h1",
  "status": "ACTIVE",
  "holdCategory": "ANESTHESIA_AIRWAY_COMPROMISE",
  "reason": "Laryngospasm during pre-induction"
}`;

      const result = ClinicalDataSanitizer.parseClinicalIndication(input, 'PCI');
      expect(result.cleanClinicalIndication).toBe('Pre-op clearance required.');
      expect(result.legacySafetyHolds).toHaveLength(1);
      expect(result.legacySafetyHolds[0].status).toBe('ACTIVE');
      expect(result.legacySafetyHolds[0].categoryLabel).toBe('Anesthesia / Airway Compromise');
    });
  });

  describe('cleanClinicalNarrative', () => {
    it('should strip technical headers from free-text notes', () => {
      const dirty = `Scheduled for morning intake.

--- CATH_LAB_SAFETY_TIMEOUT ---
{"status":"RATIFIED"}

--- ACTIVE_SAFETY_HOLD ---
{"status":"ACTIVE"}`;

      const cleaned = ClinicalDataSanitizer.cleanClinicalNarrative(dirty);
      expect(cleaned).toBe('Scheduled for morning intake.');
      expect(cleaned).not.toContain('---');
      expect(cleaned).not.toContain('{');
    });
  });

  describe('getReadableHoldCategoryLabel', () => {
    it('should format standard and custom hold categories accurately', () => {
      expect(getReadableHoldCategoryLabel('RADIATION_OR_CONTRAST_HAZARD')).toBe('Radiation or Contrast Hazard');
      expect(getReadableHoldCategoryLabel('PATIENT_HEMODYNAMIC_INSTABILITY')).toBe('Patient Hemodynamic Instability');
      expect(getReadableHoldCategoryLabel('CUSTOM_CLINICAL_RISK')).toBe('Custom Clinical Risk');
      expect(getReadableHoldCategoryLabel(null)).toBe('Clinical Safety Hazard');
    });
  });
});

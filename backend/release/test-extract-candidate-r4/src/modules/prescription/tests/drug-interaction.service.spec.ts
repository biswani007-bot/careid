import { DrugInteractionService } from '../drug-interaction.service';

describe('DrugInteractionService (Phase 22)', () => {
  let service: DrugInteractionService;

  beforeEach(() => {
    service = new DrugInteractionService();
  });

  describe('Drug-Drug Interactions', () => {
    it('should detect MAJOR interaction between Warfarin and Aspirin', () => {
      const result = service.checkInteractions(
        {
          medications: [
            { drugName: 'Warfarin', dosage: '5mg', form: 'Tablet', frequency: 'Once daily', durationDays: 30 },
            { drugName: 'Aspirin', dosage: '75mg', form: 'Tablet', frequency: 'Once daily', durationDays: 30 },
          ],
        },
        [],
      );

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('MAJOR');
      expect(result.interactions.length).toBeGreaterThan(0);
      expect(result.interactions[0].clinicalDescription).toContain('hemorrhage');
    });

    it('should detect MAJOR interaction between Sildenafil (PDE-5 inhibitor) and Nitroglycerin', () => {
      const result = service.checkInteractions(
        {
          medications: [
            { drugName: 'Sildenafil', dosage: '50mg', form: 'Tablet', frequency: 'PRN', durationDays: 10 },
            { drugName: 'Nitroglycerin', dosage: '0.4mg', form: 'Sublingual Tablet', frequency: 'PRN', durationDays: 10 },
          ],
        },
        [],
      );

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('MAJOR');
      expect(result.interactions[0].clinicalDescription).toContain('hypotension');
    });

    it('should detect MAJOR interaction between Lisinopril and Spironolactone (Hyperkalemia)', () => {
      const result = service.checkInteractions(
        {
          medications: [
            { drugName: 'Lisinopril', dosage: '20mg', form: 'Tablet', frequency: 'Once daily', durationDays: 30 },
            { drugName: 'Spironolactone', dosage: '25mg', form: 'Tablet', frequency: 'Once daily', durationDays: 30 },
          ],
        },
        [],
      );

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('MAJOR');
      expect(result.interactions[0].clinicalDescription).toContain('hyperkalemia');
    });
  });

  describe('Duplicate Therapy Detection', () => {
    it('should detect duplicate therapy for two NSAIDs (Ibuprofen and Naproxen)', () => {
      const result = service.checkInteractions(
        {
          medications: [
            { drugName: 'Ibuprofen', dosage: '400mg', form: 'Tablet', frequency: 'TID', durationDays: 5 },
            { drugName: 'Naproxen', dosage: '500mg', form: 'Tablet', frequency: 'BID', durationDays: 5 },
          ],
        },
        [],
      );

      expect(result.hasConflict).toBe(true);
      expect(result.duplicateTherapyAlerts.length).toBeGreaterThan(0);
      expect(result.duplicateTherapyAlerts[0].therapeuticClass).toContain('NSAID');
    });
  });

  describe('Allergy Cross-Reactivity', () => {
    it('should detect allergy cross-reactivity for Penicillin allergic patient prescribed Amoxicillin', () => {
      const result = service.checkInteractions(
        {
          medications: [
            { drugName: 'Amoxicillin', dosage: '500mg', form: 'Capsule', frequency: 'TID', durationDays: 7 },
          ],
        },
        ['penicillin allergy - hives and facial swelling'],
      );

      expect(result.hasConflict).toBe(true);
      expect(result.severity).toBe('MAJOR');
      expect(result.allergyAlerts.length).toBeGreaterThan(0);
      expect(result.allergyAlerts[0].allergyMatched).toContain('penicillin');
    });

    it('should pass with NO conflicts for safe regimens', () => {
      const result = service.checkInteractions(
        {
          medications: [
            { drugName: 'Amoxicillin', dosage: '500mg', form: 'Capsule', frequency: 'TID', durationDays: 7 },
            { drugName: 'Paracetamol', dosage: '650mg', form: 'Tablet', frequency: 'TID', durationDays: 3 },
          ],
        },
        [],
      );

      expect(result.hasConflict).toBe(false);
      expect(result.severity).toBe('NONE');
      expect(result.interactions).toHaveLength(0);
      expect(result.allergyAlerts).toHaveLength(0);
      expect(result.duplicateTherapyAlerts).toHaveLength(0);
    });
  });
});

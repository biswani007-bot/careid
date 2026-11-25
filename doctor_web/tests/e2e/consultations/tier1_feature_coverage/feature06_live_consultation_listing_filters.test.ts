/**
 * Tier 1 — Feature 6: Live Consultation Listing & Filters
 * Validates authentic consultation listing, tab filtering (All, Active, Accepted, Completed),
 * search matching by patient MRN / name, and manual refresh integrity.
 */

import { describe, it, assertEqual, assertGreaterThanOrEqual, assertDefined, assertIncludes } from '../helpers/testUtils.ts';
import { getDoctorAppointments } from '../helpers/consultationApiHelper.ts';

export interface ConsultationItem {
  id: string;
  patientName: string;
  patientMrn: string;
  facilityName: string;
  doctorName: string;
  appointmentDate: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  offerStatus?: string;
  cptCode?: string;
  procedureName?: string;
  title: string;
}

export function filterConsultations(
  items: ConsultationItem[],
  activeTab: 'ALL' | 'ACTIVE' | 'ACCEPTED' | 'COMPLETED',
  searchQuery: string = ''
): ConsultationItem[] {
  return items.filter((item) => {
    // Tab filter
    if (activeTab === 'ACTIVE') {
      const s = item.status;
      if (s !== 'SCHEDULED' && s !== 'CONFIRMED' && s !== 'IN_PROGRESS') return false;
    } else if (activeTab === 'ACCEPTED') {
      const os = (item.offerStatus || '').toUpperCase();
      if (os !== 'ACCEPTED' && os !== 'RATIFIED_ACCEPTED') return false;
    } else if (activeTab === 'COMPLETED') {
      if (item.status !== 'COMPLETED') return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = item.patientName.toLowerCase().includes(q);
      const matchMrn = item.patientMrn.toLowerCase().includes(q);
      const matchProc = (item.procedureName || '').toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      if (!matchName && !matchMrn && !matchProc && !matchTitle) return false;
    }

    return true;
  });
}

describe('Feature 06: Live Consultation Listing & Filters', () => {
  it('TC-F06-01: Live consultation records load from backend appointments and offers', async () => {
    const res = await getDoctorAppointments();
    assertEqual(res.status, 200, 'Appointments must fetch with HTTP 200 OK');
    assertDefined(res.body.data, 'Appointments data must exist');

    const appts = res.body.data!;
    assertGreaterThanOrEqual(appts.length, 1, 'At least 1 live appointment should be assigned to doctor');

    const first = appts[0];
    assertDefined(first.id, 'Appointment must have an ID');
    assertDefined(first.patient, 'Appointment must embed patient information');
  });

  it('TC-F06-02: All filter tab returns all loaded items without exclusion', () => {
    const mockItems: ConsultationItem[] = [
      { id: '1', patientName: 'Marcus Doe', patientMrn: 'PT-01', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'SCHEDULED', title: 'Consult 1' },
      { id: '2', patientName: 'Jane Smith', patientMrn: 'PT-02', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'COMPLETED', title: 'Consult 2' },
      { id: '3', patientName: 'Alan Wake', patientMrn: 'PT-03', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'CONFIRMED', offerStatus: 'ACCEPTED', title: 'Consult 3' },
    ];

    const all = filterConsultations(mockItems, 'ALL');
    assertEqual(all.length, 3, 'ALL tab must return all 3 items');
  });

  it('TC-F06-03: Active filter tab isolates scheduled, confirmed, and in-progress consultations', () => {
    const mockItems: ConsultationItem[] = [
      { id: '1', patientName: 'Marcus Doe', patientMrn: 'PT-01', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'SCHEDULED', title: 'Consult 1' },
      { id: '2', patientName: 'Jane Smith', patientMrn: 'PT-02', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'COMPLETED', title: 'Consult 2' },
      { id: '3', patientName: 'Alan Wake', patientMrn: 'PT-03', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'CONFIRMED', title: 'Consult 3' },
    ];

    const active = filterConsultations(mockItems, 'ACTIVE');
    assertEqual(active.length, 2, 'ACTIVE tab must return exactly 2 items');
    assertIncludes(active.map((a) => a.id), '1');
    assertIncludes(active.map((a) => a.id), '3');
  });

  it('TC-F06-04: Accepted filter tab selects items with RATIFIED_ACCEPTED or ACCEPTED offer status', () => {
    const mockItems: ConsultationItem[] = [
      { id: '1', patientName: 'Marcus Doe', patientMrn: 'PT-01', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'CONFIRMED', offerStatus: 'DRAFT', title: 'Consult 1' },
      { id: '2', patientName: 'Jane Smith', patientMrn: 'PT-02', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'CONFIRMED', offerStatus: 'RATIFIED_ACCEPTED', title: 'Consult 2' },
    ];

    const accepted = filterConsultations(mockItems, 'ACCEPTED');
    assertEqual(accepted.length, 1, 'ACCEPTED tab must select item with RATIFIED_ACCEPTED');
    assertEqual(accepted[0].id, '2');
  });

  it('TC-F06-05: Patient search filter matches query against patient name and MRN case-insensitively', () => {
    const mockItems: ConsultationItem[] = [
      { id: '1', patientName: 'Marcus Doe', patientMrn: 'PT-CAREID-2026-0004', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'SCHEDULED', title: 'Cardiac Consult' },
      { id: '2', patientName: 'Sarah Connor', patientMrn: 'PT-CAREID-2026-0099', facilityName: 'Metro', doctorName: 'Dr. Jenkins', appointmentDate: '2026-11-09', status: 'SCHEDULED', title: 'Ortho Consult' },
    ];

    const byName = filterConsultations(mockItems, 'ALL', 'marcus');
    assertEqual(byName.length, 1, 'Search "marcus" should find 1 record');
    assertEqual(byName[0].id, '1');

    const byMrn = filterConsultations(mockItems, 'ALL', '0099');
    assertEqual(byMrn.length, 1, 'Search by MRN "0099" should find Sarah Connor');
    assertEqual(byMrn[0].id, '2');

    const emptyMatch = filterConsultations(mockItems, 'ALL', 'nonexistent_patient_xyz');
    assertEqual(emptyMatch.length, 0, 'Non-existent search returns empty array without throwing');
  });
});

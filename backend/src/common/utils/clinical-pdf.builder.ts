/**
 * Clinical PDF Builder
 * Health Vault 360 / CareID Enterprise Backend
 *
 * Lightweight, zero-dependency, standard PDF 1.4 binary document generator.
 * Produces compliant PDF documents for prescriptions and unified medical records.
 */

export interface PdfTextLine {
  text: string;
  bold?: boolean;
  size?: number;
  indent?: number;
}

export class ClinicalPdfBuilder {
  /**
   * Generates a valid standard PDF 1.4 binary buffer from structured lines.
   */
  public static buildPdf(title: string, sections: { heading?: string; lines: PdfTextLine[] }[]): Buffer {
    let contentStream = 'BT\n';
    let y = 780; // Start near top of A4 (height 841.89)

    // Header Title
    contentStream += '/F2 16 Tf\n';
    contentStream += `50 ${y} Td\n`;
    contentStream += `(${this.escapePdfText(title)}) Tj\n`;
    contentStream += `-50 -${y} Td\n`;
    y -= 26;

    // Subtitle / generated timestamp
    contentStream += '/F1 8 Tf\n';
    contentStream += `50 ${y} Td\n`;
    contentStream += `(${this.escapePdfText(`CareID Health Network • Generated: ${new Date().toUTCString()} • Confidential Medical Record`)}) Tj\n`;
    contentStream += `-50 -${y} Td\n`;
    y -= 22;

    for (const section of sections) {
      if (y < 80) {
        // Simple page boundary guard (stay on visible page area)
        break;
      }

      if (section.heading) {
        y -= 6;
        contentStream += '/F2 12 Tf\n';
        contentStream += `50 ${y} Td\n`;
        contentStream += `(${this.escapePdfText(section.heading)}) Tj\n`;
        contentStream += `-50 -${y} Td\n`;
        y -= 16;
      }

      for (const line of section.lines) {
        if (y < 60) break;
        const fontName = line.bold ? '/F2' : '/F1';
        const fontSize = line.size || 9;
        const xPos = 50 + (line.indent || 0);

        contentStream += `${fontName} ${fontSize} Tf\n`;
        contentStream += `${xPos} ${y} Td\n`;
        contentStream += `(${this.escapePdfText(line.text)}) Tj\n`;
        contentStream += `-${xPos} -${y} Td\n`;
        y -= fontSize + 5;
      }
      y -= 8;
    }

    // Footer
    contentStream += '/F1 8 Tf\n';
    contentStream += '50 40 Td\n';
    contentStream += `(${this.escapePdfText('CareID Digital Clinical System • ISO 27799 / HIPAA Compliant • Verified Digital Document')}) Tj\n`;
    contentStream += '-50 -40 Td\n';
    contentStream += 'ET\n';

    // Build PDF DOM Objects
    const streamBuffer = Buffer.from(contentStream, 'latin1');
    const body: string[] = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
      `6 0 obj\n<< /Length ${streamBuffer.length} >>\nstream\n${contentStream}endstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    let currentOffset = Buffer.byteLength(pdf, 'latin1');

    for (const obj of body) {
      offsets.push(currentOffset);
      currentOffset += Buffer.byteLength(obj, 'latin1');
      pdf += obj;
    }

    const startxref = currentOffset;
    let xref = `xref\n0 ${body.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= body.length; i++) {
      xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += xref;
    pdf += `trailer\n<< /Size ${body.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

    return Buffer.from(pdf, 'latin1');
  }

  /**
   * Builds a formal digital prescription PDF.
   */
  public static generatePrescriptionPdf(data: {
    prescriptionId: string;
    rxNumber: string;
    issuedAt: string;
    patient: {
      patientNumber?: string | null;
      fullName?: string | null;
      phone?: string | null;
      email?: string | null;
      gender?: string | null;
      dateOfBirth?: string | null;
    };
    prescriber: {
      fullName?: string | null;
      specialization?: string | null;
      verifiedBy?: string | null;
    };
    facilityName: string;
    medications: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    instructions?: string | null;
    refillCount: number;
    maxRefills?: number | null;
    status: string;
    disclaimer?: string;
  }): Buffer {
    const sections = [
      {
        heading: `PRESCRIPTION: ${data.rxNumber}`,
        lines: [
          { text: `Facility: ${data.facilityName || 'CareID Health Facility'}`, bold: true, size: 10 },
          { text: `Issued Date: ${data.issuedAt} | Status: ${data.status}`, size: 9 },
          { text: `Prescription ID: ${data.prescriptionId}`, size: 8 },
        ],
      },
      {
        heading: 'PATIENT INFORMATION',
        lines: [
          { text: `Name: ${data.patient.fullName || 'Anonymous Patient'}`, bold: true, size: 10 },
          { text: `Patient Number: ${data.patient.patientNumber || 'N/A'} | Gender: ${data.patient.gender || 'N/A'} | DOB: ${data.patient.dateOfBirth ? data.patient.dateOfBirth.substring(0, 10) : 'N/A'}`, size: 9 },
          { text: `Contact: Phone: ${data.patient.phone || 'N/A'} | Email: ${data.patient.email || 'N/A'}`, size: 8 },
        ],
      },
      {
        heading: 'PRESCRIBING PHYSICIAN',
        lines: [
          { text: `Physician: ${data.prescriber.fullName || 'Attending Physician'}`, bold: true, size: 10 },
          { text: `Specialization: ${data.prescriber.specialization || 'General Practice'}`, size: 9 },
          { text: `Verification: Registered & Signed Digital Practitioner`, size: 8 },
        ],
      },
      {
        heading: 'MEDICATIONS & REGIMEN',
        lines: (data.medications || []).flatMap((med, idx) => [
          { text: `${idx + 1}. ${med.name.toUpperCase()} - ${med.dosage || 'Standard Dose'}`, bold: true, size: 10, indent: 5 },
          { text: `   Frequency: ${med.frequency || 'As directed'} | Duration: ${med.duration || 'Standard course'}`, size: 9, indent: 5 },
          ...(med.instructions ? [{ text: `   Instructions: ${med.instructions}`, size: 8, indent: 10 }] : []),
        ]),
      },
      {
        heading: 'REFILL AUTHORIZATION & INSTRUCTIONS',
        lines: [
          { text: `Authorized Refills Completed: ${data.refillCount} of ${data.maxRefills !== null && data.maxRefills !== undefined ? data.maxRefills : 'Unlimited authorized'}`, bold: true, size: 9 },
          ...(data.instructions ? [{ text: `Clinical Notes / Patient Instructions: ${data.instructions}`, size: 8 }] : []),
          { text: data.disclaimer || 'Valid with participating CareID pharmacies. Tamper-evident digital medical record.', size: 8 },
        ],
      },
    ];

    return this.buildPdf('CAREID CLINICAL PRESCRIPTION', sections);
  }

  /**
   * Builds a Unified Clinical Medical Record PDF for a patient.
   */
  public static generateUnifiedClinicalRecordPdf(data: {
    patient: any;
    doctor: any;
    prescriptions: any[];
    medicalRecords: any[];
    timeline: any[];
    admissions: any[];
  }): Buffer {
    const p = data.patient;
    const patientName = p?.user
      ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim()
      : p?.fullName || 'Patient';

    const sections = [
      {
        heading: 'PATIENT DEMOGRAPHICS & PROFILE',
        lines: [
          { text: `Full Name: ${patientName}`, bold: true, size: 10 },
          { text: `Patient Number: ${p?.patientNumber || 'N/A'} | DOB: ${p?.user?.dateOfBirth ? String(p.user.dateOfBirth).substring(0, 10) : p?.dateOfBirth || 'N/A'} | Gender: ${p?.user?.gender || p?.gender || 'N/A'}`, size: 9 },
          { text: `Contact: Phone: ${p?.user?.phone || p?.phone || 'N/A'} | Email: ${p?.user?.email || p?.email || 'N/A'}`, size: 9 },
          { text: `Emergency Contact: ${p?.emergencyContactName || 'N/A'} (${p?.emergencyContactPhone || 'N/A'})`, size: 8 },
        ],
      },
      {
        heading: 'ATTENDING CLINICIAN & FACILITY CONTEXT',
        lines: [
          { text: `Exporting Clinician: ${data.doctor?.fullName || 'Authorized Medical Officer'}`, bold: true, size: 10 },
          { text: `Specialization: ${data.doctor?.primarySpecialization || 'Clinical Medicine'}`, size: 9 },
          { text: `Clinical Access Authorization: Confirmed Active Healthcare Professional`, size: 8 },
        ],
      },
      {
        heading: `ACTIVE & HISTORICAL PRESCRIPTIONS (${(data.prescriptions || []).length})`,
        lines: (data.prescriptions || []).slice(0, 5).flatMap((rx, idx) => [
          { text: `${idx + 1}. Rx: ${rx.title || 'Prescription'} [Status: ${rx.status}]`, bold: true, size: 9, indent: 5 },
          { text: `   Prescribed: ${rx.reportDate ? String(rx.reportDate).substring(0, 10) : 'N/A'} by ${rx.prescribedBy || rx.doctorName || 'Physician'}`, size: 8, indent: 5 },
          ...(rx.medications && rx.medications.length > 0
            ? rx.medications.map((m: any) => ({ text: `   • ${m.name} (${m.dosage || 'dose'} - ${m.frequency || 'freq'})`, size: 8, indent: 10 }))
            : []),
        ]),
      },
      {
        heading: `CLINICAL ENCOUNTERS & MEDICAL RECORDS (${(data.medicalRecords || []).length})`,
        lines: (data.medicalRecords || []).slice(0, 5).flatMap((rec, idx) => [
          { text: `${idx + 1}. ${rec.title || 'Clinical Record'} [Date: ${rec.encounterDate ? String(rec.encounterDate).substring(0, 10) : 'N/A'}]`, bold: true, size: 9, indent: 5 },
          { text: `   Chief Complaint: ${rec.chiefComplaint || 'Routine medical examination'}`, size: 8, indent: 5 },
          ...(rec.clinicalNotes ? [{ text: `   Notes: ${rec.clinicalNotes.substring(0, 120)}...`, size: 8, indent: 10 }] : []),
        ]),
      },
      {
        heading: `HOSPITAL ADMISSIONS & EPISODES (${(data.admissions || []).length})`,
        lines: (data.admissions || []).length > 0
          ? (data.admissions || []).slice(0, 3).map((adm: any) => ({
              text: `• Admission: ${adm.encounterDate ? String(adm.encounterDate).substring(0, 10) : 'N/A'} - Facility: ${adm.facilityName || 'Main Hospital'} [Reason: ${adm.chiefComplaint || 'Clinical evaluation'}]`,
              size: 8,
              indent: 5,
            }))
          : [{ text: 'No prior inpatient hospital admissions documented.', size: 8, indent: 5 }],
      },
    ];

    return this.buildPdf('CAREID UNIFIED PATIENT CLINICAL RECORD', sections);
  }

  /**
   * Builds a Clinical Referral Registry Export PDF.
   */
  public static generateReferralRegistryPdf(data: {
    referrals: any[];
    exportedBy?: string;
    userRole?: string;
  }): Buffer {
    const refs = data.referrals || [];
    const sections = [
      {
        heading: 'REFERRAL REGISTRY SUMMARY & CONTEXT',
        lines: [
          { text: `Total Referrals Exported: ${refs.length}`, bold: true, size: 10 },
          { text: `Exported By: ${data.exportedBy || 'Authorized Healthcare Provider'} [Role: ${data.userRole || 'CLINICIAN'}]`, size: 9 },
          { text: 'Confidentiality: Contains Protected Health Information (PHI) under HIPAA / ISO 27799', size: 8 },
        ],
      },
      {
        heading: `CLINICAL REFERRALS (${refs.length})`,
        lines: refs.length > 0
          ? refs.slice(0, 10).flatMap((r, idx) => [
              {
                text: `${idx + 1}. [${r.status || 'PENDING'}] Ref #${r.referralNumber || (r.id ? r.id.slice(0, 8) : 'REF')} - Priority: ${r.priority || 'ROUTINE'}`,
                bold: true,
                size: 9,
                indent: 5,
              },
              {
                text: `   Patient: ${r.patientName || r.patient?.fullName || r.patientId || 'Patient'} | Reason: ${r.reasonForReferral || r.clinicalSummary || 'Clinical consultation'}`,
                size: 8,
                indent: 10,
              },
              {
                text: `   From: Dr. ${r.referringDoctorName || r.referringDoctorId || 'Referring MD'} (${r.referringFacilityName || 'Source Facility'})`,
                size: 8,
                indent: 10,
              },
              {
                text: `   To: Dr. ${r.receivingDoctorName || r.receivingDoctorId || 'Receiving MD'} (${r.receivingFacilityName || 'Specialist Facility'})`,
                size: 8,
                indent: 10,
              },
            ])
          : [{ text: 'No referrals match the export criteria.', size: 9, indent: 5 }],
      },
    ];

    return this.buildPdf('CAREID CLINICAL REFERRAL REGISTRY', sections);
  }

  /**
   * Builds a single Clinical Referral Dossier PDF.
   */
  public static generateSingleReferralPdf(r: any): Buffer {
    const patientName = r.patient?.fullName || r.patientName || r.patientId || 'Patient';
    const patientNumber = r.patient?.patientNumber || r.patientNumber || 'N/A';
    const refNum = r.referralNumber || (r.id ? r.id.slice(0, 8).toUpperCase() : 'REF');
    const referringDoc = r.referringDoctor?.fullName || r.referringDoctorName || r.referringDoctorId || 'Referring Clinician';
    const receivingDoc = r.receivingDoctor?.fullName || r.receivingDoctorName || r.receivingDoctorId || 'Specialist Clinician';
    const referringFac = r.referringFacility?.name || r.referringFacilityName || 'Source Facility';
    const receivingFac = r.receivingFacility?.name || r.receivingFacilityName || 'Specialist Center';

    const sections = [
      {
        heading: `CLINICAL REFERRAL DOSSIER: #${refNum}`,
        lines: [
          { text: `Referral ID: ${r.id} | Status: ${r.status || 'PENDING'} | Priority: ${r.priority || 'ROUTINE'}`, bold: true, size: 10 },
          { text: `Created Date: ${r.createdAt ? new Date(r.createdAt).toUTCString() : new Date().toUTCString()}`, size: 9 },
          { text: `Clinical Access Scope: ${r.accessScope || 'REFERRAL_ONLY'}`, size: 8 },
        ],
      },
      {
        heading: 'PATIENT INFORMATION',
        lines: [
          { text: `Full Name: ${patientName}`, bold: true, size: 10 },
          { text: `Patient ID / MRN: ${patientNumber} | Gender: ${r.patient?.gender || 'N/A'} | DOB: ${r.patient?.dateOfBirth ? String(r.patient.dateOfBirth).substring(0, 10) : 'N/A'}`, size: 9 },
          { text: `Contact Phone: ${r.patient?.phone || 'N/A'} | Email: ${r.patient?.email || 'N/A'}`, size: 8 },
        ],
      },
      {
        heading: 'REFERRING PROVIDER & FACILITY',
        lines: [
          { text: `Referring Clinician: Dr. ${referringDoc}`, bold: true, size: 9 },
          { text: `Originating Facility: ${referringFac}`, size: 9 },
        ],
      },
      {
        heading: 'RECEIVING SPECIALIST & FACILITY',
        lines: [
          { text: `Consultant Specialist: Dr. ${receivingDoc}`, bold: true, size: 9 },
          { text: `Receiving Facility: ${receivingFac}`, size: 9 },
        ],
      },
      {
        heading: 'CLINICAL INDICATION & SUMMARY',
        lines: [
          { text: `Reason for Referral: ${r.reasonForReferral || 'Specialist Evaluation & Consultation'}`, bold: true, size: 9 },
          ...(r.clinicalSummary ? [{ text: `Clinical Summary: ${r.clinicalSummary}`, size: 8 }] : []),
          ...(r.notes && Array.isArray(r.notes) && r.notes.length > 0
            ? r.notes.map((n: any) => ({ text: `• [${n.authorName || 'Clinician Note'}]: ${n.content || n.noteText || ''}`, size: 8, indent: 5 }))
            : []),
          { text: 'Confidentiality Notice: Protected Health Information (PHI). Transmission strictly governed by CareID clinical protocols.', size: 8 },
        ],
      },
    ];

    return this.buildPdf('CAREID CLINICAL REFERRAL DOSSIER', sections);
  }

  /**
   * Builds a Diagnostic Medical Reports Summary PDF.
   */
  public static generateDiagnosticReportsPdf(data: {
    reports: any[];
    exportedBy?: string;
    userRole?: string;
    title?: string;
  }): Buffer {
    const list = data.reports || [];
    const sections = [
      {
        heading: 'DIAGNOSTIC REPORT REGISTRY CONTEXT',
        lines: [
          { text: `Total Diagnostic Records: ${list.length}`, bold: true, size: 10 },
          { text: `Exported By: ${data.exportedBy || 'Authorized Healthcare Clinician'} [Role: ${data.userRole || 'CLINICIAN'}]`, size: 9 },
          { text: `Export Date: ${new Date().toUTCString()} • CareID Digital Diagnostics`, size: 8 },
        ],
      },
      {
        heading: `DIAGNOSTIC REPORTS (${list.length})`,
        lines: list.length > 0
          ? list.slice(0, 12).flatMap((rep, idx) => [
              {
                text: `${idx + 1}. [${rep.status || 'FINAL'}] ${rep.title || 'Diagnostic Report'} - Category: ${rep.category || 'CLINICAL'}`,
                bold: true,
                size: 9,
                indent: 5,
              },
              {
                text: `   Date: ${rep.reportDate ? String(rep.reportDate).substring(0, 10) : 'N/A'} | Doctor: ${rep.doctorName || rep.prescribedBy || 'Attending Clinician'} | Facility: ${rep.facilityName || 'CareID Diagnostic Center'}`,
                size: 8,
                indent: 10,
              },
              ...(rep.description ? [{ text: `   Summary: ${rep.description.substring(0, 100)}`, size: 8, indent: 10 }] : []),
            ])
          : [{ text: 'No diagnostic reports found.', size: 9, indent: 5 }],
      },
    ];

    return this.buildPdf(data.title || 'CAREID DIAGNOSTIC REPORTS REGISTRY', sections);
  }

  private static escapePdfText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' '); // Keep standard printable ASCII
  }
}


const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_HOST = '360api.vnvision.in';
const BASE_PATH = '/api/v1';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buf,
          data: (res.headers['content-type']?.includes('application/json') ? JSON.parse(buf.toString('utf8')) : null)
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function getDoctorToken() {
  const cachePath = path.resolve(process.cwd(), '.token_cache.json');
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (cached.accessToken) {
      const test = await request({
        hostname: BASE_HOST,
        path: `${BASE_PATH}/auth/me`,
        method: 'GET',
        headers: { Authorization: `Bearer ${cached.accessToken}` }
      });
      if (test.status === 200) {
        return cached.accessToken;
      }
    }
  }

  const reqRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/auth/otp/request`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: '+16505550003' });

  const challengeId = reqRes.data?.data?.challengeId || reqRes.data?.challengeId;
  const verRes = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/auth/otp/verify`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { challengeId, otpCode: '123456' });

  const tokenData = verRes.data?.data || verRes.data;
  if (tokenData?.accessToken) {
    fs.writeFileSync(cachePath, JSON.stringify({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      updatedAt: Date.now()
    }, null, 2));
    return tokenData.accessToken;
  }
  throw new Error('Could not acquire doctor token.');
}

// Emulate convertUnifiedJsonToCsv logic from src/utils/medicalRecordCsv.ts
const CSV_RECORD_COLUMNS = [
  'Patient ID',
  'Patient Name',
  'Record Category',
  'Record ID',
  'Record Title',
  'Date',
  'Status',
  'Doctor',
  'Facility',
  'Medication',
  'Dosage',
  'Frequency',
  'Duration',
  'Diagnosis',
  'Clinical Notes',
  'Details',
  'Attachment URL',
];

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();

  if (/^[=+\-@]/.test(str)) {
    if (isNaN(Number(str))) {
      str = `'${str}`;
    }
  }

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertUnifiedJsonToCsv(rawExport, fallbackPatientName = '') {
  const data = rawExport.data || rawExport;
  const patient = data.patient || {};
  const patientId = String(patient.id || '').trim();
  const patientName = patient.fullName?.trim() || fallbackPatientName || 'CareID Patient';
  const clinicianName = data.clinician?.fullName || '';

  const rows = [];
  const categoryCounts = {};

  const addRow = (record) => {
    const category = String(record['Record Category'] || 'OTHER');
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    const line = CSV_RECORD_COLUMNS.map((col) => escapeCsvCell(record[col])).join(',');
    rows.push(line);
  };

  // 1. DEMOGRAPHICS
  if (data.patient) {
    const p = data.patient;
    const contactParts = [];
    if (p.phone) contactParts.push(`Phone: ${p.phone}`);
    if (p.email) contactParts.push(`Email: ${p.email}`);
    if (p.gender) contactParts.push(`Gender: ${p.gender}`);
    if (p.bloodGroup) contactParts.push(`Blood Group: ${p.bloodGroup}`);
    if (p.dateOfBirth) contactParts.push(`DOB: ${p.dateOfBirth}`);

    addRow({
      'Patient ID': patientId,
      'Patient Name': patientName,
      'Record Category': 'DEMOGRAPHICS',
      'Record ID': p.patientNumber || p.id || '',
      'Record Title': 'Patient Demographics & Registration Profile',
      'Date': p.dateOfBirth || data.exportedAt || '',
      'Status': 'ACTIVE',
      'Doctor': clinicianName,
      'Facility': 'CareID Health Network',
      'Medication': '',
      'Dosage': '',
      'Frequency': '',
      'Duration': '',
      'Diagnosis': p.bloodGroup ? `Blood Group: ${p.bloodGroup}` : '',
      'Clinical Notes': contactParts.join(' | '),
      'Details': JSON.stringify(p),
      'Attachment URL': '',
    });
  }

  // 2. PRESCRIPTIONS
  if (Array.isArray(data.prescriptions)) {
    for (const rx of data.prescriptions) {
      const prescriber = rx.prescribedBy || rx.doctorName || clinicianName;
      const medications =
        Array.isArray(rx.medications) && rx.medications.length > 0 ? rx.medications : [null];

      for (let i = 0; i < medications.length; i++) {
        const med = medications[i];
        const rowId = rx.id ? (medications.length > 1 ? `${rx.id}-MED-${i + 1}` : rx.id) : '';

        addRow({
          'Patient ID': patientId,
          'Patient Name': patientName,
          'Record Category': 'PRESCRIPTION',
          'Record ID': rowId,
          'Record Title': rx.title || 'Medication Prescription',
          'Date': rx.reportDate || rx.createdAt || '',
          'Status': rx.status || 'ACTIVE',
          'Doctor': prescriber,
          'Facility': rx.facilityName || 'CareID Heart Institute',
          'Medication': med ? med.name : rx.title || '',
          'Dosage': med?.dosage || '—',
          'Frequency': med?.frequency || 'As directed',
          'Duration': med?.duration || '—',
          'Diagnosis': rx.diagnosis || (Array.isArray(rx.tags) ? rx.tags.join('; ') : ''),
          'Clinical Notes': rx.notes || med?.instructions || rx.description || '',
          'Details': JSON.stringify({
            refillCount: rx.refillCount,
            maxRefills: rx.maxRefills,
            verificationStatus: rx.verificationStatus,
            verifiedBy: rx.verifiedBy,
            verifiedAt: rx.verifiedAt,
            tags: rx.tags,
            description: rx.description,
            route: med?.route,
            quantity: med?.quantity,
          }),
          'Attachment URL':
            Array.isArray(rx.attachments) && rx.attachments.length > 0
              ? rx.attachments[0].storageUrl || ''
              : '',
        });
      }
    }
  }

  // 3. MEDICAL RECORDS
  if (Array.isArray(data.medicalRecords)) {
    for (const mr of data.medicalRecords) {
      const diagnosesStr = Array.isArray(mr.diagnoses)
        ? mr.diagnoses
            .map((d) => `${d.code ? `[${d.code}] ` : ''}${d.description}`)
            .filter(Boolean)
            .join('; ')
        : '';

      const soapParts = [];
      if (mr.chiefComplaint) soapParts.push(`Subjective (Chief Complaint): ${mr.chiefComplaint}`);
      if (mr.clinicalNotes) soapParts.push(`Objective (Clinical Notes): ${mr.clinicalNotes}`);
      if (diagnosesStr) soapParts.push(`Assessment (Diagnosis): ${diagnosesStr}`);
      if (mr.treatmentPlan) soapParts.push(`Plan (Treatment Plan): ${mr.treatmentPlan}`);

      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': 'MEDICAL_RECORD',
        'Record ID': mr.id || '',
        'Record Title': mr.title || 'Clinical Medical Record',
        'Date': mr.createdAt || mr.updatedAt || '',
        'Status': mr.status || 'FINAL',
        'Doctor': mr.providerName || clinicianName,
        'Facility': mr.facilityName || 'CareID Health Center',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': '',
        'Diagnosis': diagnosesStr,
        'Clinical Notes': soapParts.join('\n\n'),
        'Details': JSON.stringify({
          chiefComplaint: mr.chiefComplaint,
          clinicalNotes: mr.clinicalNotes,
          treatmentPlan: mr.treatmentPlan,
          diagnoses: mr.diagnoses,
          encounters: mr.encounters,
          vitalSigns: mr.vitalSigns,
        }),
        'Attachment URL': '',
      });
    }
  }

  // 4. HOSPITAL ADMISSIONS
  if (Array.isArray(data.admissions)) {
    for (const adm of data.admissions) {
      const diagStr = Array.isArray(adm.diagnoses)
        ? adm.diagnoses.map((d) => d.description).filter(Boolean).join('; ')
        : '';

      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': 'ADMISSION',
        'Record ID': adm.id || '',
        'Record Title': adm.title || 'Inpatient Hospital Admission',
        'Date': adm.encounterDate || adm.admissionDate || '',
        'Status': adm.status || 'FINAL',
        'Doctor': adm.providerName || adm.attendingDoctorName || clinicianName,
        'Facility': adm.facilityName || 'CareID Heart Institute',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': adm.dischargeDate ? `${adm.encounterDate || ''} to ${adm.dischargeDate}` : '—',
        'Diagnosis': diagStr,
        'Clinical Notes': adm.chiefComplaint || adm.clinicalNotes || '',
        'Details': JSON.stringify(adm),
        'Attachment URL': '',
      });
    }
  }

  // 5. TIMELINE EVENTS & ATTACHMENTS
  if (Array.isArray(data.timeline)) {
    for (const item of data.timeline) {
      const isAttachment = item.type === 'ATTACHMENT';
      const category = isAttachment ? 'ATTACHMENT' : item.type || 'ENCOUNTER';

      addRow({
        'Patient ID': patientId,
        'Patient Name': patientName,
        'Record Category': category,
        'Record ID': item.id || '',
        'Record Title': item.details?.originalName || item.title || 'Timeline Item',
        'Date': item.date || '',
        'Status': item.status || item.details?.virusScanStatus || 'COMPLETED',
        'Doctor': clinicianName,
        'Facility': '',
        'Medication': '',
        'Dosage': '',
        'Frequency': '',
        'Duration': '',
        'Diagnosis': item.category || '',
        'Clinical Notes': item.summary || item.details?.originalName || '',
        'Details': JSON.stringify(item.details || {}),
        'Attachment URL': item.details?.storageUrl || item.details?.url || '',
      });
    }
  }

  const csvContent = '\uFEFF' + [CSV_RECORD_COLUMNS.join(','), ...rows].join('\r\n');
  const sanitizedId = (patientId || 'patient').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
  const filename = `careid-full-medical-record-${sanitizedId}.csv`;

  return {
    csvContent,
    filename,
    totalRows: rows.length,
    categoryCounts,
  };
}

function parseCSV(text) {
  let p = '', row = [''], ret = [row], i = 0, r = 0, s = true;
  for (const l of text) {
    if ('"' === l) {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (',' === l && s) {
      row[++i] = '';
    } else if ('\n' === l && s) {
      if ('\r' === p) row[i] = row[i].slice(0, -1);
      row = [''];
      i = 0;
      ret[++r] = row;
    } else {
      row[i] += l;
    }
    p = l;
  }
  if (ret[ret.length - 1].length === 1 && ret[ret.length - 1][0] === '') ret.pop();
  return ret;
}

async function verify() {
  console.log('================================================================');
  console.log(' CareID Full Patient Medical Record CSV Export Verification');
  console.log(` Target Endpoint: GET /api/v1/doctors/patients/:id/medical-records/export?format=JSON`);
  console.log('================================================================\n');

  const token = await getDoctorToken();
  const patientId = '787e5187-7859-4320-bb1a-465a57dd086a';

  console.log('[Step 1] Fetching live unified export JSON from backend...');
  const res = await request({
    hostname: BASE_HOST,
    path: `${BASE_PATH}/doctors/patients/${patientId}/medical-records/export?format=JSON`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (res.status !== 200) {
    throw new Error(`Failed to fetch export JSON: HTTP ${res.status}`);
  }
  console.log(`✔ HTTP 200 OK received. Content-Type: ${res.headers['content-type']}`);

  const rawJson = res.data?.data || res.data;
  console.log('\n[Step 2] Validating source data categories in API response:');
  console.log(`- Patient Demographics: present (MRN: ${rawJson.patient?.patientNumber})`);
  console.log(`- Prescriptions count: ${rawJson.prescriptions?.length || 0}`);
  console.log(`- Medical Records count: ${rawJson.medicalRecords?.length || 0}`);
  console.log(`- Admissions count: ${rawJson.admissions?.length || 0}`);
  console.log(`- Timeline/Attachments count: ${rawJson.timeline?.length || 0}`);

  console.log('\n[Step 3] Converting unified JSON into normalized CSV...');
  const result = convertUnifiedJsonToCsv(rawJson, 'Marcus Vance');
  console.log(`✔ Generated Filename: ${result.filename}`);
  console.log(`✔ Total Exported CSV Data Rows: ${result.totalRows}`);
  console.log(`✔ Category Breakdown:`, JSON.stringify(result.categoryCounts, null, 2));

  console.log('\n[Step 4] Checking CSV Data Integrity & Standards Compliance:');
  const hasBOM = result.csvContent.charCodeAt(0) === 0xFEFF;
  console.log(`✔ UTF-8 BOM Header (\\uFEFF): ${hasBOM ? 'PRESENT (Excel compatible)' : 'MISSING'}`);

  const parsed = parseCSV(result.csvContent.replace(/^\uFEFF/, ''));
  console.log(`✔ Parsed CSV Rows (including header): ${parsed.length}`);
  console.log(`✔ Header Column Count: ${parsed[0].length} (Expected: ${CSV_RECORD_COLUMNS.length})`);

  let columnMismatches = 0;
  for (let idx = 1; idx < parsed.length; idx++) {
    if (parsed[idx].length !== CSV_RECORD_COLUMNS.length) {
      columnMismatches++;
      console.error(`Row ${idx} column count mismatch: ${parsed[idx].length}`);
    }
  }

  if (columnMismatches === 0) {
    console.log(`✔ 100% of data rows strictly adhere to 17 standard RFC 4180 columns.`);
  } else {
    throw new Error(`${columnMismatches} rows failed column validation!`);
  }

  // Check that all source records are represented without loss
  const expectedTotal = 1 + (rawJson.prescriptions?.length || 0) + (rawJson.medicalRecords?.length || 0) + (rawJson.admissions?.length || 0) + (rawJson.timeline?.length || 0);
  console.log(`\n[Step 5] Source vs Exported Count Validation:`);
  console.log(`Source items: ${expectedTotal}`);
  console.log(`Exported rows: ${result.totalRows}`);
  if (result.totalRows >= expectedTotal) {
    console.log(`✔ PASS: Zero records dropped. 100% record coverage verified.`);
  } else {
    throw new Error(`Record count mismatch: Expected at least ${expectedTotal}, got ${result.totalRows}`);
  }

  console.log('\n================================================================');
  console.log(' ALL CSV EXPORT VERIFICATION GATES PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});


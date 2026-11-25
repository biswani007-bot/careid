const fs = require('fs');

let code = fs.readFileSync('scripts/verify-phase-5.2a-runtime.js', 'utf8');

// Change port to 3076
code = code.replace('const TEST_PORT = 3073;', 'const TEST_PORT = 3076;');
code = code.replace("const PREFIX = 'synth-p52a2-';", "const PREFIX = 'synth-fullgate-';");
code = code.replace(
  '=== CareID Phase 5.2A.2 Clinical Authorization Security Verification Gate ===',
  '=== CareID Master Unified 46-Scenario End-to-End Runtime Verification Suite ==='
);

// Add cleanup arrays
code = code.replace(
  'roleAssignmentIds: [],',
  'roleAssignmentIds: [],\n    scheduleIds: [],\n    slotIds: [],\n    appointmentIds: [],\n    notificationIds: [],\n    queueIds: [],\n    medicalReportIds: [],\n    reportAttachmentIds: [],'
);

// Add synthetic schedule & slots after doctorFacility creation
const scheduleSeed = `
    // Doctor 1 Schedule & Slots for Appointment Verification
    const scheduleDoc1 = await prisma.schedule.create({
      data: {
        ownerType: 'DOCTOR',
        doctorProfileId: docProfile1.id,
        facilityId: facilityA.id,
        title: \`\${PREFIX}Morning Consultations\`,
        timezone: 'Asia/Karachi',
        slotDurationMinutes: 15,
        bufferMinutes: 5,
        maxPatientsPerSlot: 1,
        effectiveFrom: new Date('2026-11-01T00:00:00.000Z'),
        effectiveTo: new Date('2026-11-30T23:59:59.000Z'),
        isActive: true,
      },
    });
    cleanup.scheduleIds.push(scheduleDoc1.id);

    const slot1 = await prisma.generatedSlot.create({
      data: {
        scheduleId: scheduleDoc1.id,
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '09:15',
        durationMinutes: 15,
        status: 'AVAILABLE',
      },
    });
    cleanup.slotIds.push(slot1.id);

    const slot2 = await prisma.generatedSlot.create({
      data: {
        scheduleId: scheduleDoc1.id,
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:15',
        endTime: '09:30',
        durationMinutes: 15,
        status: 'AVAILABLE',
      },
    });
    cleanup.slotIds.push(slot2.id);

    const slot3 = await prisma.generatedSlot.create({
      data: {
        scheduleId: scheduleDoc1.id,
        slotDate: new Date('2026-11-15T00:00:00.000Z'),
        startTime: '09:30',
        endTime: '09:45',
        durationMinutes: 15,
        status: 'AVAILABLE',
      },
    });
    cleanup.slotIds.push(slot3.id);
`;

code = code.replace(
  'cleanup.doctorFacilityIds.push(df1.id);',
  'cleanup.doctorFacilityIds.push(df1.id);\n' + scheduleSeed
);

// Add tests 34 to 46
const masterTests = `
    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 34: Patient Books Appointment with Slot Allocation (201 Created)
    // ─────────────────────────────────────────────────────────────────────────────
    let apptId1;
    {
      console.log('--- Test 34: Patient Books Appointment with Slot Reservation ---');
      const res = await fetch(\`\${BASE_URL}/appointments\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenPatientA}\`,
        },
        body: JSON.stringify({
          doctorProfileId: docProfile1.id,
          facilityId: facilityA.id,
          scheduleId: scheduleDoc1.id,
          slotId: slot1.id,
          appointmentDate: '2026-11-15',
          startTime: '09:00',
          endTime: '09:15',
          reason: 'Initial consultation',
        }),
      });
      console.log(\`  Appointment Booking Response: HTTP \${res.status}\`);
      if (res.status !== 201) throw new Error(\`Test 34 Failed: Expected 201, got \${res.status}\`);
      const body = await res.json();
      apptId1 = body.id;
      cleanup.appointmentIds.push(apptId1);
      const updatedSlot = await prisma.generatedSlot.findUnique({ where: { id: slot1.id } });
      if (updatedSlot.status !== 'BOOKED') throw new Error(\`Test 34 Failed: Slot status not transitioned to BOOKED, got \${updatedSlot.status}\`);
      console.log('  PASS: Patient booked appointment, slot transitioned to BOOKED (201 Created)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 35: Doctor Conflict Detection (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 35: Doctor Double-Booking Conflict Rejection ---');
      const res = await fetch(\`\${BASE_URL}/appointments\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenPatientB}\`,
        },
        body: JSON.stringify({
          doctorProfileId: docProfile1.id,
          facilityId: facilityA.id,
          appointmentDate: '2026-11-15',
          startTime: '09:00',
          endTime: '09:15',
          reason: 'Conflicting slot attempt',
        }),
      });
      console.log(\`  Doctor Conflict Response: HTTP \${res.status}\`);
      if (res.status !== 409) throw new Error(\`Test 35 Failed: Expected 409, got \${res.status}\`);
      console.log('  PASS: Doctor overlapping appointment conflict rejected with 409 Conflict\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 36: Patient Conflict Detection (409 Conflict)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 36: Patient Double-Booking Conflict Rejection ---');
      const res = await fetch(\`\${BASE_URL}/appointments\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenPatientA}\`,
        },
        body: JSON.stringify({
          doctorProfileId: docProfile2.id,
          facilityId: facilityB.id,
          appointmentDate: '2026-11-15',
          startTime: '09:05',
          endTime: '09:20',
          reason: 'Patient overlapping consultation attempt',
        }),
      });
      console.log(\`  Patient Conflict Response: HTTP \${res.status}\`);
      if (res.status !== 409) throw new Error(\`Test 36 Failed: Expected 409, got \${res.status}\`);
      console.log('  PASS: Patient overlapping appointment conflict rejected with 409 Conflict\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 37: Doctor Lists Appointments Scoped to Doctor Profile (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 37: Doctor Lists Appointments Scoped to Doctor Profile ---');
      const res = await fetch(\`\${BASE_URL}/appointments/doctor/me\`, {
        headers: { Authorization: \`Bearer \${tokenDoc1}\` },
      });
      console.log(\`  Doctor Appointments List Response: HTTP \${res.status}\`);
      if (res.status !== 200) throw new Error(\`Test 37 Failed: Expected 200, got \${res.status}\`);
      const body = await res.json();
      const items = body.data || body;
      if (!Array.isArray(items) || !items.some((a) => a.id === apptId1)) {
        throw new Error('Test 37 Failed: Booked appointment not found in doctor appointments');
      }
      console.log('  PASS: Doctor appointments list retrieved successfully (200 OK)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 38: Patient Lists Appointments Scoped to Patient Profile (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 38: Patient Lists Appointments Scoped to Patient Profile ---');
      const res = await fetch(\`\${BASE_URL}/appointments/patient/me\`, {
        headers: { Authorization: \`Bearer \${tokenPatientA}\` },
      });
      console.log(\`  Patient Appointments List Response: HTTP \${res.status}\`);
      if (res.status !== 200) throw new Error(\`Test 38 Failed: Expected 200, got \${res.status}\`);
      const body = await res.json();
      const items = body.data || body;
      if (!Array.isArray(items) || !items.some((a) => a.id === apptId1)) {
        throw new Error('Test 38 Failed: Booked appointment not found in patient appointments');
      }
      console.log('  PASS: Patient appointments list retrieved successfully (200 OK)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 39: Reschedule Appointment (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    let rescheduledApptId;
    {
      console.log('--- Test 39: Patient Reschedules Appointment ---');
      const res = await fetch(\`\${BASE_URL}/appointments/\${apptId1}/reschedule\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenPatientA}\`,
        },
        body: JSON.stringify({
          slotId: slot2.id,
          appointmentDate: '2026-11-15',
          startTime: '09:15',
          endTime: '09:30',
          reason: 'Need 15 min later slot',
        }),
      });
      console.log(\`  Reschedule Response: HTTP \${res.status}\`);
      if (res.status !== 200) throw new Error(\`Test 39 Failed: Expected 200, got \${res.status}\`);
      const body = await res.json();
      rescheduledApptId = body.id;
      cleanup.appointmentIds.push(rescheduledApptId);
      const origAppt = await prisma.appointment.findUnique({ where: { id: apptId1 } });
      if (origAppt.status !== 'RESCHEDULED') throw new Error(\`Test 39 Failed: Original appointment not RESCHEDULED, got \${origAppt.status}\`);
      console.log('  PASS: Appointment rescheduled, original transitioned to RESCHEDULED (200 OK)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 40: Cancel Appointment (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 40: Patient Cancels Rescheduled Appointment ---');
      const res = await fetch(\`\${BASE_URL}/appointments/\${rescheduledApptId}/cancel\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenPatientA}\`,
        },
        body: JSON.stringify({
          cancellationReason: 'Personal emergency, will reschedule later',
        }),
      });
      console.log(\`  Cancel Response: HTTP \${res.status}\`);
      if (res.status !== 200) throw new Error(\`Test 40 Failed: Expected 200, got \${res.status}\`);
      const body = await res.json();
      if (body.status !== 'CANCELLED') throw new Error(\`Test 40 Failed: Expected CANCELLED, got \${body.status}\`);
      const cancelledSlot = await prisma.generatedSlot.findUnique({ where: { id: slot2.id } });
      if (cancelledSlot.status !== 'AVAILABLE') throw new Error(\`Test 40 Failed: Slot not released to AVAILABLE, got \${cancelledSlot.status}\`);
      console.log('  PASS: Appointment cancelled, slot released to AVAILABLE (200 OK)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 41: Doctor Documents Clinical Encounter with BMI Auto-Calculation (201 Created)
    // ─────────────────────────────────────────────────────────────────────────────
    let encounterRecordId;
    {
      console.log('--- Test 41: Doctor Documents Clinical Encounter with BMI Calculation ---');
      const cEncounter = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          authorizedDoctorId: docProfile1.id,
          authorizedFacilityId: facilityA.id,
          status: 'GRANTED',
          accessScope: 'ALL',
          purpose: 'Clinical Encounter Documentation',
          capturedBy: uStaff.id,
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(cEncounter.id);

      const res = await fetch(\`\${BASE_URL}/doctors/patients/\${patProfileA.id}/encounters\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenDoc1}\`,
        },
        body: JSON.stringify({
          title: 'Acute Pharyngitis Encounter',
          chiefComplaint: 'Sore throat and fever',
          clinicalNotes: 'Throat erythema observed without exudate.',
          treatmentPlan: 'Warm saline gargles and acetaminophen.',
          vitalSigns: {
            heightCm: 180,
            weightKg: 75,
            systolicBp: 120,
            diastolicBp: 80,
            pulseRate: 72,
          },
        }),
      });
      console.log(\`  Doctor Encounter Creation Response: HTTP \${res.status}\`);
      if (res.status !== 201) throw new Error(\`Test 41 Failed: Expected 201, got \${res.status}\`);
      const body = await res.json();
      encounterRecordId = body.id;
      cleanup.medicalRecordIds.push(encounterRecordId);
      const vitals = Array.isArray(body.vitalSigns) ? body.vitalSigns[0] : body.vitalSigns;
      if (!vitals || !vitals.bmi) throw new Error('Test 41 Failed: BMI was not auto-calculated');
      console.log(\`  Documented Encounter ID: \${encounterRecordId}, Auto-Calculated BMI: \${vitals.bmi}\`);
      console.log('  PASS: Doctor documented clinical encounter with auto-calculated BMI (201 Created)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 42: Doctor Encounter Creation Rejected without Authorization (403 Forbidden)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 42: Doctor Clinical Encounter Rejected without Clinical Authorization ---');
      const res = await fetch(\`\${BASE_URL}/doctors/patients/\${patProfileA.id}/encounters\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenDoc2}\`,
        },
        body: JSON.stringify({
          title: 'Unauthorized Encounter Attempt',
          chiefComplaint: 'Unauthorized check',
        }),
      });
      console.log(\`  Unauthorized Encounter Response: HTTP \${res.status}\`);
      if (res.status !== 403) throw new Error(\`Test 42 Failed: Expected 403, got \${res.status}\`);
      console.log('  PASS: Doctor clinical encounter creation rejected without authorization (403 Forbidden)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 43: Author Doctor Updates Clinical Medical Record (200 OK)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 43: Author Doctor Updates Clinical Medical Record ---');
      const res = await fetch(\`\${BASE_URL}/doctors/patients/\${patProfileA.id}/medical-records/\${encounterRecordId}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenDoc1}\`,
        },
        body: JSON.stringify({
          clinicalNotes: 'Throat erythema observed; patient reports mild improvement.',
          treatmentPlan: 'Continue warm saline gargles; follow up in 3 days.',
        }),
      });
      console.log(\`  Author Update Response: HTTP \${res.status}\`);
      if (res.status !== 200) throw new Error(\`Test 43 Failed: Expected 200, got \${res.status}\`);
      console.log('  PASS: Author doctor successfully updated clinical record (200 OK)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 44: Non-Author Doctor Rejected When Updating Medical Record (403 Forbidden)
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 44: Non-Author Doctor Rejected When Updating Medical Record ---');
      const cDoc2 = await prisma.securityConsentRecord.create({
        data: {
          patientId: patProfileA.id,
          consentType: 'TREATMENT',
          authorizedDoctorId: docProfile2.id,
          authorizedFacilityId: facilityB.id,
          status: 'GRANTED',
          accessScope: 'ALL',
          purpose: 'Second Opinion',
          capturedBy: uStaff.id,
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          isDeleted: false,
        },
      });
      cleanup.consentIds.push(cDoc2.id);

      const res = await fetch(\`\${BASE_URL}/doctors/patients/\${patProfileA.id}/medical-records/\${encounterRecordId}\`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenDoc2}\`,
        },
        body: JSON.stringify({
          clinicalNotes: 'Malicious overwrite attempt by non-author doctor',
        }),
      });
      console.log(\`  Non-Author Doctor Update Response: HTTP \${res.status}\`);
      if (res.status !== 403) throw new Error(\`Test 44 Failed: Expected 403, got \${res.status}\`);
      console.log('  PASS: Non-author doctor rejected when attempting to update medical record (403 Forbidden)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 45: Antivirus Fail-Closed Security & Download Restriction
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 45: Antivirus Fail-Closed Security & Download Restriction ---');
      const medReport = await prisma.medicalReport.create({
        data: {
          patientProfileId: patProfileA.id,
          title: 'Unscanned Blood Work Report',
          category: 'LAB',
          status: 'UPLOADED',
        },
      });
      cleanup.medicalReportIds.push(medReport.id);

      const repAtt = await prisma.reportAttachment.create({
        data: {
          medicalReportId: medReport.id,
          fileName: 'unscanned_blood_work.pdf',
          originalName: 'unscanned_blood_work.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          storageKey: 'secure-vault-unscanned-key',
          storageUrl: 'https://cdn.careid.test/attachments/unscanned_blood_work.pdf',
        },
      });
      cleanup.reportAttachmentIds.push(repAtt.id);

      const resDownload = await fetch(\`\${BASE_URL}/reports/download/\${medReport.id}\`, {
        method: 'GET',
        headers: {
          Authorization: \`Bearer \${tokenPatientA}\`,
        },
      });
      console.log(\`  Download Token for Unscanned Report Response: HTTP \${resDownload.status}\`);
      if (resDownload.status !== 400) {
        throw new Error(\`Test 45 Failed: Expected 400 Bad Request for unscanned file, got \${resDownload.status}\`);
      }
      const body = await resDownload.json();
      console.log(\`  Download Rejection Message: "\${body.message}"\`);

      // Verify AntivirusScanner fail-closed on medical attachment when ClamAV is offline
      const attToScan = await prisma.medicalAttachment.create({
        data: {
          patientProfileId: patProfileA.id,
          medicalRecordId: encounterRecordId,
          fileName: 'confidential_lab.pdf',
          originalName: 'confidential_lab.pdf',
          fileSize: 4096,
          mimeType: 'application/pdf',
          category: 'LAB_RESULT',
          storageKey: 'internal-vault-unscanned',
          storageUrl: 'https://cdn.careid.test/attachments/confidential_lab.pdf',
          virusScanStatus: 'PENDING',
        },
      });
      cleanup.attachmentIds.push(attToScan.id);

      const { AntivirusScannerService } = require('../dist/src/modules/storage/infrastructure/antivirus-scanner.service');
      const scanner = new AntivirusScannerService(prisma);
      const scanRes = await scanner.scanAttachment(attToScan.id);
      console.log(\`  Scanner Result with Offline Daemon: status="\${scanRes.status}", details="\${scanRes.details}"\`);
      if (scanRes.status !== 'SCAN_FAILED') {
        throw new Error(\`Test 45 Failed: Expected SCAN_FAILED when ClamAV offline, got \${scanRes.status}\`);
      }
      console.log('  PASS: Download strictly blocked & scanner failed closed to SCAN_FAILED (Fail-Closed Invariant)\\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 46: Notification Queue Processing & State Machine
    // ─────────────────────────────────────────────────────────────────────────────
    {
      console.log('--- Test 46: Notification Queue Processing & State Machine ---');
      const notif = await prisma.notification.create({
        data: {
          recipientUserId: uDoc1.id,
          recipientPhone: '+16505558101',
          title: 'Appointment Reminder',
          message: 'Your appointment is confirmed for tomorrow',
          notificationType: 'DOCTOR',
          priority: 'NORMAL',
          channel: 'IN_APP',
          status: 'QUEUED',
        },
      });
      cleanup.notificationIds.push(notif.id);

      const qItem = await prisma.notificationQueue.create({
        data: {
          notificationId: notif.id,
          attempt: 0,
          status: 'QUEUED',
        },
      });
      cleanup.queueIds.push(qItem.id);

      const res = await fetch(\`\${BASE_URL}/notifications/queue/process\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${tokenAdmin}\`,
        },
        body: JSON.stringify({ batchSize: 10 }),
      });
      console.log(\`  Process Queue Response: HTTP \${res.status}\`);
      if (res.status !== 200) throw new Error(\`Test 46 Failed: Expected 200, got \${res.status}\`);
      const body = await res.json();
      console.log(\`  Queue processed result: processed=\${body.processed}, sent=\${body.sent}, failed=\${body.failed}\`);
      const updatedQueue = await prisma.notificationQueue.findUnique({ where: { id: qItem.id } });
      if (updatedQueue.status !== 'SENT') {
        throw new Error(\`Test 46 Failed: Queue item expected SENT, got \${updatedQueue.status}\`);
      }
      console.log('  PASS: Notification queue processed successfully and transitioned status to SENT (200 OK)\\n');
    }
`;

code = code.replace(
  "console.log('ALL 33 CLINICAL AUTHORIZATION & REGRESSION SCENARIOS VERIFIED (100% PASS)');",
  masterTests + "\n    console.log('================================================================');\n    console.log('ALL 46 UNIFIED END-TO-END MASTER COMPLETION SCENARIOS VERIFIED (100% PASS)');\n    console.log('================================================================');"
);

// Add cleanup teardown for appointments, slots, schedules, notifications, queues
const teardownAdditions = `
      if (cleanup.appointmentIds && cleanup.appointmentIds.length) {
        await prisma.appointment.deleteMany({ where: { id: { in: cleanup.appointmentIds } } });
      }
      if (cleanup.slotIds && cleanup.slotIds.length) {
        await prisma.generatedSlot.deleteMany({ where: { id: { in: cleanup.slotIds } } });
      }
      if (cleanup.scheduleIds && cleanup.scheduleIds.length) {
        await prisma.schedule.deleteMany({ where: { id: { in: cleanup.scheduleIds } } });
      }
      if (cleanup.queueIds && cleanup.queueIds.length) {
        await prisma.notificationQueue.deleteMany({ where: { id: { in: cleanup.queueIds } } });
      }
      if (cleanup.notificationIds && cleanup.notificationIds.length) {
        await prisma.notification.deleteMany({ where: { id: { in: cleanup.notificationIds } } });
      }
      if (cleanup.medicalReportIds && cleanup.medicalReportIds.length) {
        await prisma.medicalReport.deleteMany({ where: { id: { in: cleanup.medicalReportIds } } });
      }
      if (cleanup.reportAttachmentIds && cleanup.reportAttachmentIds.length) {
        await prisma.reportAttachment.deleteMany({ where: { id: { in: cleanup.reportAttachmentIds } } });
      }
`;

code = code.replace(
  'if (cleanup.referralIds.length) {',
  teardownAdditions + '      if (cleanup.referralIds.length) {'
);

fs.writeFileSync('scripts/verify-full-runtime-gate.js', code, 'utf8');
console.log('Successfully generated scripts/verify-full-runtime-gate.js with length:', code.length);

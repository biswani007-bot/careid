import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Camera,
  FileText,
  Check,
  AlertCircle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronRight,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  FileCheck2,
  Scan,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OcrWorkflowStep,
  SupportedFileFormat,
  PatientSummary,
  RecentUploadRecord,
  ExtractedClinicalField,
  ClinicalLabRow,
  OCR_PROCESSING_STAGES,
  mapMedicalRecordToRecentUpload,
  parseOcrFields,
} from './types';
import { patientService, calculateAge, CreateMedicalRecordDto } from '@/services/patientService';
import { ocrService, BackendOcrPage, BackendOcrField } from '@/services/ocrService';
import {
  attachmentService,
  validateAttachmentFile,
  getAttachmentFileUrl,
  AttachmentUploadResponse,
} from '@/services/attachmentService';
import { authService } from '@/services/authService';
import patientAvatarHero from '@/assets/avatars/patient-avatar-hero.png';
import patientAvatarMale from '@/assets/avatars/patient-avatar-male.png';
import { usePatientAvatar } from '@/hooks/usePatients';
import scannedLabReport from '@/assets/medical/scanned-lab-report.png';

interface UploadedFileMeta {
  rawFile?: File;
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
  attachmentId?: string;
  storageUrl?: string;
  storageKey?: string;
  isUploading?: boolean;
}

export const MedicalRecordUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // 1. Target Active Patient (EHR Context)
  // ---------------------------------------------------------------------------
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);

  // Workflow Step Management (upload -> processing -> review -> success)
  const [currentStep, setCurrentStep] = useState<OcrWorkflowStep>(() => {
    if (location.pathname.includes('/review') || location.pathname.includes('/verify')) {
      return 'review';
    }
    if (location.pathname.includes('/processing')) {
      return 'processing';
    }
    if (location.pathname.includes('/success')) {
      return 'success';
    }
    return 'upload';
  });

  const [selectedFormat, setSelectedFormat] = useState<SupportedFileFormat>('PDF');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileMeta | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Recent Uploads from live backend
  const [recentUploads, setRecentUploads] = useState<RecentUploadRecord[]>([]);
  const [loadingRecentUploads, setLoadingRecentUploads] = useState(false);

  // State 2: Processing State & OCR Engine
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrJobId, setOcrJobId] = useState<string | null>(null);
  const [processingStageIndex, setProcessingStageIndex] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatusText, setProcessingStatusText] = useState<string>(
    'Initializing document processing...'
  );
  const [processingError, setProcessingError] = useState<string | null>(null);

  // State 3: Review & Extracted Data
  const [extractedFields, setExtractedFields] = useState<ExtractedClinicalField[]>([]);
  const [labValues, setLabValues] = useState<ClinicalLabRow[]>([]);
  const [ocrPages, setOcrPages] = useState<BackendOcrPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Authenticated patient avatar streaming resolution & fallback
  const resolvedPatientAvatar = usePatientAvatar(patient?.avatarUrl || patient?.photoUrl, patient?.gender);

  // Normalization utility
  const normalizeId = (id?: string) => (id ? id.replace(/[-_ ]/g, '').toUpperCase() : '');

  // ---------------------------------------------------------------------------
  // Resolve Target Patient from URL Param / Route / Assigned List
  // ---------------------------------------------------------------------------
  const resolveTargetPatient = useCallback(async () => {
    setPatientLoading(true);
    setPatientError(null);
    try {
      const urlPatientId =
        searchParams.get('patientId') ||
        searchParams.get('patientProfileId') ||
        searchParams.get('id') ||
        (location.state as { patientId?: string })?.patientId ||
        (location.state as { patientProfileId?: string })?.patientProfileId ||
        (location.state as { patient?: { id?: string } })?.patient?.id;

      const activePatientId = urlPatientId?.trim() || '787e5187-7859-4320-bb1a-465a57dd086a';

      const profile = await patientService.getDoctorPatientProfile(activePatientId);
      const ageNum = calculateAge(profile.dateOfBirth);
      const ageStr = ageNum !== null ? `${ageNum} yrs` : 'Age N/A';
      const formattedHvId =
        profile.patientNumber ||
        profile.healthCard?.cardNumber ||
        `HV-${activePatientId.slice(0, 8).toUpperCase()}`;

      const summary: PatientSummary = {
        id: profile.id,
        name: profile.fullName || `${profile.firstName} ${profile.lastName}`.trim(),
        healthVaultId: formattedHvId,
        age: ageStr,
        gender: profile.gender || 'Not Specified',
        dob: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-US') : undefined,
        verified:
          profile.profileStatus === 'COMPLETED' ||
          profile.userStatus === 'ACTIVE' ||
          profile.status === 'COMPLETED' ||
          profile.status === 'ACTIVE',
        avatarUrl:
          profile.photoUrl ||
          (profile.gender?.toLowerCase() === 'female' ? patientAvatarHero : patientAvatarMale),
        photoUrl: profile.photoUrl,
      };
      setPatient(summary);

      // Fetch Recent Uploads / Medical Records for this patient
      loadPatientRecentRecords(profile.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load patient profile.';
      setPatientError(msg);
    } finally {
      setPatientLoading(false);
    }
  }, [searchParams, location.state]);

  const loadPatientRecentRecords = async (patientId: string) => {
    setLoadingRecentUploads(true);
    try {
      const records = await patientService.getPatientMedicalRecords(patientId);
      const mapped = records.slice(0, 10).map(mapMedicalRecordToRecentUpload);
      setRecentUploads(mapped);
    } catch {
      setRecentUploads([]);
    } finally {
      setLoadingRecentUploads(false);
    }
  };

  useEffect(() => {
    resolveTargetPatient();
  }, [resolveTargetPatient]);

  // If review route accessed directly and fields are empty, initialize demographics from resolved patient
  useEffect(() => {
    if (currentStep === 'review' && extractedFields.length === 0 && patient) {
      const parsed = parseOcrFields([], '', patient);
      setExtractedFields(parsed.demographicsAndDetails);
      setLabValues(parsed.labRows);
    }
  }, [currentStep, extractedFields.length, patient]);

  // Demographic Field Values
  const extractedName = extractedFields.find((f) => f.id === 'patient_name')?.value || '';
  const extractedHvId = extractedFields.find((f) => f.id === 'hv_id')?.value || '';

  // Safety & Mismatch Calculations
  const isTargetPatientMatch =
    patient &&
    (normalizeId(extractedHvId) === normalizeId(patient.healthVaultId) ||
      normalizeId(extractedHvId).includes(normalizeId(patient.id)) ||
      extractedName.trim().toLowerCase() === patient.name.trim().toLowerCase());

  const isPatientMismatch = Boolean(patient && extractedName && extractedHvId && !isTargetPatientMatch);

  // ---------------------------------------------------------------------------
  // File Handling (Computer, Camera, Dropzone, Multi-Page PDF)
  // ---------------------------------------------------------------------------
  const processSelectedFile = async (file: File) => {
    // Sanitize filename against directory traversal
    const sanitizedName = file.name.replace(/^.*[\\/]/, '') || `document_${Date.now()}.pdf`;

    // Client-side pre-flight validation
    const validation = validateAttachmentFile(file, sanitizedName);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid file format or size.');
      return;
    }

    // Auto-detect & synchronize selected format chip
    const lowerName = sanitizedName.toLowerCase();
    if (lowerName.endsWith('.pdf')) {
      setSelectedFormat('PDF');
    } else if (lowerName.endsWith('.png')) {
      setSelectedFormat('PNG');
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      setSelectedFormat('JPG / JPEG');
    } else if (lowerName.endsWith('.dcm') || lowerName.endsWith('.dicom')) {
      setSelectedFormat('DICOM');
    }

    const fileSizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;

    setUploadedFile({
      rawFile: file,
      name: sanitizedName,
      size: fileSizeFormatted,
      type: file.type || 'application/octet-stream',
      previewUrl,
      isUploading: true,
    });
    setUploadError(null);

    try {
      const uploadRes: AttachmentUploadResponse = await attachmentService.uploadAttachment(file, {
        originalName: sanitizedName,
        category: 'LAB_RESULT',
        patientProfileId: patient?.id,
      });

      setUploadedFile((prev) => {
        if (!prev || prev.rawFile !== file) return prev;
        return {
          ...prev,
          attachmentId: uploadRes.id,
          storageUrl: uploadRes.storageUrl,
          storageKey: uploadRes.storageKey,
          isUploading: false,
        };
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload document binary to backend.';
      setUploadError(msg);
      setUploadedFile((prev) => {
        if (!prev || prev.rawFile !== file) return prev;
        return {
          ...prev,
          isUploading: false,
        };
      });
    }
  };

  const handleCameraCapture = async (
    source: React.ChangeEvent<HTMLInputElement> | File | Blob,
    customFileName?: string
  ) => {
    setUploadError(null);
    let capturedFile: File | null = null;
    const timestampName = customFileName || `careid_cam_capture_${Date.now()}.jpg`;

    if (
      source &&
      typeof source === 'object' &&
      'target' in source &&
      (source as React.ChangeEvent<HTMLInputElement>).target?.files
    ) {
      const files = (source as React.ChangeEvent<HTMLInputElement>).target.files;
      if (files && files.length > 0) {
        const file = files[0];
        capturedFile = new File([file], timestampName, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
      (source as React.ChangeEvent<HTMLInputElement>).target.value = '';
    } else if (source instanceof File) {
      const name = source.name.startsWith('careid_cam_capture_') ? source.name : timestampName;
      capturedFile = new File([source], name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } else if (source instanceof Blob) {
      capturedFile = new File([source], timestampName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    }

    if (!capturedFile || capturedFile.size === 0) {
      setUploadError('Captured camera frame is empty (0 bytes). Please capture again.');
      return;
    }

    setSelectedFormat('JPG / JPEG');
    await processSelectedFile(capturedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
    e.target.value = '';
  };

  const handlePdfInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFormat('PDF');
      processSelectedFile(files[0]);
    }
    e.target.value = '';
  };

  const handleRemoveUploadedFile = () => {
    if (uploadedFile?.previewUrl) {
      URL.revokeObjectURL(uploadedFile.previewUrl);
    }
    setUploadedFile(null);
    setUploadError(null);
  };

  // ---------------------------------------------------------------------------
  // Real OCR Processing Flow with Backend Polling and Status Handling
  // ---------------------------------------------------------------------------
  const handleStartProcessing = async () => {
    if (!uploadedFile || isProcessing || uploadedFile.isUploading) return;

    setIsProcessing(true);
    setCurrentStep('processing');
    setProcessingError(null);
    setProcessingProgress(15);
    setProcessingStatusText('Initializing document processing...');

    try {
      let attachmentId = uploadedFile.attachmentId;

      // Defensive: Ensure authentic binary upload to backend is complete
      if (!attachmentId && uploadedFile.rawFile) {
        setProcessingStatusText('Uploading document binary to server...');
        const uploadRes = await attachmentService.uploadAttachment(uploadedFile.rawFile, {
          originalName: uploadedFile.name,
          category: 'LAB_RESULT',
          patientProfileId: patient?.id,
        });
        attachmentId = uploadRes.id;
        setUploadedFile((prev) =>
          prev
            ? {
                ...prev,
                attachmentId: uploadRes.id,
                storageUrl: uploadRes.storageUrl,
                storageKey: uploadRes.storageKey,
                isUploading: false,
              }
            : null
        );
      }

      if (!attachmentId) {
        throw new Error('Valid attachment ID is required before initiating OCR processing.');
      }

      // Step 1: Submit attachment for local CPU OCR processing
      // POST /api/v1/ocr/jobs
      setProcessingStatusText('Submitting document for OCR processing...');
      const documentType = selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE';
      const submittedJob = await ocrService.submitOcrJob({
        medicalAttachmentId: attachmentId,
        documentType,
      });

      setOcrJobId(submittedJob.id);

      // Step 2: Poll backend OCR status with authentic status callback
      const completedJob = await ocrService.pollOcrJob(submittedJob.id, {
        onStatusChange: (status) => {
          if (status === 'PENDING') {
            setProcessingStatusText('Queued for processing...');
            setProcessingProgress(25);
            setProcessingStageIndex(0);
          } else if (status === 'PROCESSING') {
            setProcessingStatusText('Extracting clinical telemetry...');
            setProcessingProgress(60);
            setProcessingStageIndex(1);
          } else if (status === 'COMPLETED' || status === 'REVIEW_REQUIRED' || status === 'NEEDS_REVIEW') {
            setProcessingStatusText('OCR Extraction Complete');
            setProcessingProgress(85);
            setProcessingStageIndex(2);
          }
        },
        intervalMs: 800,
        timeoutMs: 60000,
      });

      if (completedJob.status === 'FAILED') {
        const failureReason =
          completedJob.failureReason ||
          `OCR Processing was reported as FAILED by backend (Job ID: ${completedJob.id})`;
        throw new Error(failureReason);
      }

      // Step 3: Fetch structured fields and raw text
      setProcessingStatusText('OCR Extraction Complete');
      setProcessingStageIndex(3);
      setProcessingProgress(95);

      const [fieldsData, textData] = await Promise.allSettled([
        ocrService.getOcrJobFields(completedJob.id),
        ocrService.getOcrJobText(completedJob.id),
      ]);

      const fieldsFromBackend: BackendOcrField[] =
        fieldsData.status === 'fulfilled' ? fieldsData.value : completedJob.extractedFields || [];
      const rawTextFromBackend: string =
        textData.status === 'fulfilled'
          ? (typeof textData.value === 'string' ? textData.value : textData.value.text || '')
          : completedJob.pages?.[0]?.rawText || '';

      // Step 4: Parse clinical fields and bind to review state
      const parsed = parseOcrFields(fieldsFromBackend, rawTextFromBackend, patient);
      setExtractedFields(parsed.demographicsAndDetails);
      setLabValues(parsed.labRows);
      if (completedJob.pages && completedJob.pages.length > 0) {
        setOcrPages(completedJob.pages);
        setCurrentPageIndex(0);
      }

      // Step 5: Transition to review view immediately without synthetic delay
      setProcessingProgress(100);
      setCurrentStep('review');
      setIsProcessing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OCR processing encountered an unexpected backend error.';
      setProcessingError(msg);
      setIsProcessing(false);
    }
  };

  // Reprocess / Retry Handler
  const handleRetryOcr = async () => {
    if (!ocrJobId && !uploadedFile?.attachmentId) {
      handleStartProcessing();
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setProcessingProgress(15);
    setProcessingStatusText('Initiating OCR reprocessing...');

    try {
      let targetJobId = ocrJobId;

      if (ocrJobId) {
        try {
          const reprocessed = await ocrService.reprocessOcrJob(ocrJobId);
          targetJobId = reprocessed.id || ocrJobId;
        } catch {
          // If reprocessing endpoint is unavailable or rejects, fallback to fresh submission
          if (uploadedFile?.attachmentId) {
            const documentType = selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE';
            const freshJob = await ocrService.submitOcrJob({
              medicalAttachmentId: uploadedFile.attachmentId,
              documentType,
            });
            targetJobId = freshJob.id;
            setOcrJobId(freshJob.id);
          } else {
            throw new Error('Unable to reprocess OCR job: Missing attachment reference.');
          }
        }
      } else if (uploadedFile?.attachmentId) {
        const documentType = selectedFormat === 'PDF' ? 'LAB_REPORT' : 'DIAGNOSTIC_IMAGE';
        const freshJob = await ocrService.submitOcrJob({
          medicalAttachmentId: uploadedFile.attachmentId,
          documentType,
        });
        targetJobId = freshJob.id;
        setOcrJobId(freshJob.id);
      }

      if (!targetJobId) {
        throw new Error('No valid OCR Job ID available for reprocessing.');
      }

      const completed = await ocrService.pollOcrJob(targetJobId, {
        onStatusChange: (status) => {
          if (status === 'PENDING') {
            setProcessingStatusText('Queued for processing...');
            setProcessingProgress(25);
            setProcessingStageIndex(0);
          } else if (status === 'PROCESSING') {
            setProcessingStatusText('Extracting clinical telemetry...');
            setProcessingProgress(60);
            setProcessingStageIndex(1);
          } else if (status === 'COMPLETED' || status === 'REVIEW_REQUIRED' || status === 'NEEDS_REVIEW') {
            setProcessingStatusText('OCR Extraction Complete');
            setProcessingProgress(85);
            setProcessingStageIndex(2);
          }
        },
        intervalMs: 800,
        timeoutMs: 60000,
      });

      if (completed.status === 'FAILED') {
        const failureReason =
          completed.failureReason || `Reprocessing attempt failed for job ${completed.id}`;
        throw new Error(failureReason);
      }

      setProcessingStatusText('OCR Extraction Complete');
      setProcessingStageIndex(3);
      setProcessingProgress(95);

      const [fieldsData, textData] = await Promise.allSettled([
        ocrService.getOcrJobFields(completed.id),
        ocrService.getOcrJobText(completed.id),
      ]);

      const fields = fieldsData.status === 'fulfilled' ? fieldsData.value : completed.extractedFields || [];
      const rawText =
        textData.status === 'fulfilled'
          ? (typeof textData.value === 'string' ? textData.value : textData.value.text || '')
          : completed.pages?.[0]?.rawText || '';

      const parsed = parseOcrFields(fields, rawText, patient);
      setExtractedFields(parsed.demographicsAndDetails);
      setLabValues(parsed.labRows);
      if (completed.pages && completed.pages.length > 0) {
        setOcrPages(completed.pages);
        setCurrentPageIndex(0);
      }

      // Immediate authentic transition (zero artificial setTimeout)
      setProcessingProgress(100);
      setCurrentStep('review');
      setIsProcessing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reprocessing attempt failed.';
      setProcessingError(msg);
      setIsProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Field Correction Handlers
  // ---------------------------------------------------------------------------
  const handleFieldChange = (id: string, newValue: string) => {
    setMismatchError(null);
    setExtractedFields((prev) =>
      prev.map((f) => {
        if (f.id === id) {
          const isCorrected =
            patient &&
            id === 'hv_id' &&
            normalizeId(newValue) === normalizeId(patient.healthVaultId);
          return {
            ...f,
            value: newValue,
            status: isCorrected ? 'verified' : f.status,
            warningNote: isCorrected ? undefined : f.warningNote,
          };
        }
        return f;
      })
    );
  };

  const handleLabValueChange = (id: string, field: 'testName' | 'value' | 'unit', val: string) => {
    setLabValues((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row))
    );
  };

  const handleAddLabRow = () => {
    const newRow: ClinicalLabRow = {
      id: `lab_${Date.now()}`,
      testName: 'New Test Parameter',
      value: '0.0',
      unit: 'mg/dL',
      status: 'normal',
    };
    setLabValues((prev) => [...prev, newRow]);
  };

  const handleDeleteLabRow = (id: string) => {
    setLabValues((prev) => prev.filter((r) => r.id !== id));
  };

  // ---------------------------------------------------------------------------
  // Save to Patient Chart via Real Backend API
  // ---------------------------------------------------------------------------
  const handleSaveToRecord = async () => {
    if (!patient) {
      setMismatchError('No active target patient chart selected.');
      return false;
    }

    // Safety Interlock: Reject cross-patient mismatch
    if (isPatientMismatch) {
      setShowMismatchModal(true);
      setMismatchError(
        `Critical Patient Safety Interlock: Document metadata does not match active chart "${patient.name}" (${patient.healthVaultId}). Cross-patient chart commitment is strictly prohibited.`
      );
      return false;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const reportTypeVal = extractedFields.find((f) => f.id === 'report_type')?.value || 'Complete Blood Count (CBC)';
      const facilityVal = extractedFields.find((f) => f.id === 'hospital_facility')?.value || 'Clinical Laboratory';
      const collectionDateVal = extractedFields.find((f) => f.id === 'collection_date')?.value || new Date().toISOString().split('T')[0];

      const claims = authService.getJwtClaims();
      const doctorName = claims?.phone ? `Dr. (${claims.phone})` : 'Attending Physician';

      const clinicalNotesContent = [
        `Digitized Diagnostic Laboratory Report: ${reportTypeVal}`,
        `Facility: ${facilityVal}`,
        `Collection Date: ${collectionDateVal}`,
        `Patient Name: ${extractedName || patient.name}`,
        `HealthVault ID: ${extractedHvId || patient.healthVaultId}`,
        '--- Clinical Lab Values ---',
        ...labValues.map((l) => `${l.testName}: ${l.value} ${l.unit} (${l.referenceRange || 'Ref: Standard'})`),
      ].join('\n');

      const payload: CreateMedicalRecordDto = {
        title: `${reportTypeVal} Report`,
        chiefComplaint: `Routine diagnostic test review - ${reportTypeVal}`,
        clinicalNotes: clinicalNotesContent,
        treatmentPlan: 'Maintain current therapeutic protocol. Follow up upon repeat panel if required.',
        status: 'FINAL',
        encounter: {
          providerName: doctorName,
          facilityName: facilityVal,
          encounterType: 'LABORATORY',
          encounterDate: new Date().toISOString(),
        },
        diagnoses: [
          {
            description: `${reportTypeVal} Evaluation`,
            code: 'Z01.89',
            type: 'PRIMARY',
            status: 'ACTIVE',
          },
        ],
        procedures: [
          {
            name: reportTypeVal,
            code: 'CPT-80053',
            performedAt: collectionDateVal,
            notes: 'Processed via automated high-resolution neural OCR.',
          },
        ],
        attachments: uploadedFile
          ? [
              {
                fileName: uploadedFile.name,
                originalName: uploadedFile.name,
                fileSize: uploadedFile.rawFile?.size || 1048576,
                mimeType: uploadedFile.type,
                storageUrl:
                  uploadedFile.storageUrl && !uploadedFile.storageUrl.startsWith('blob:')
                    ? uploadedFile.storageUrl
                    : getAttachmentFileUrl(uploadedFile.name),
                category: 'LAB_RESULT',
              },
            ]
          : undefined,
      };

      await patientService.createMedicalRecord(patient.id, payload);

      // Refresh recent records list from backend
      loadPatientRecentRecords(patient.id);

      // Transition to success screen
      setCurrentStep('success');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save medical record to the backend.';
      setSaveError(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Status Counts
  const verifiedCount = extractedFields.filter((f) => f.status === 'verified').length + labValues.length;
  const needsReviewCount = extractedFields.filter((f) => f.status === 'needs-review').length;

  return (
    <div className="w-full flex flex-col min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      {/* ========================================================================= */}
      {/* STATE 1: UPLOAD MEDICAL RECORD - INITIAL STATE (Figma node 1:1167)        */}
      {/* ========================================================================= */}
      {currentStep === 'upload' && (
        <div className="max-w-[1440px] mx-auto w-full p-6 space-y-6" data-node-id="1:1167">
          {/* Breadcrumbs Sequence */}
          <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-sm text-[#494552]">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="hover:text-[#191c1d] transition-colors cursor-pointer"
            >
              Patients
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => navigate(patient ? `/patients/${patient.id}` : '/patients')}
              className="hover:text-[#191c1d] transition-colors cursor-pointer"
            >
              Patient Profile
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => navigate(patient ? `/records?patientId=${patient.id}` : '/records')}
              className="hover:text-[#191c1d] transition-colors cursor-pointer"
            >
              Medical Records
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-[#191c1d]">Upload Record</span>
          </nav>

          {/* Page Header */}
          <div className="space-y-1">
            <h1 className="text-[32px] font-semibold text-[#191c1d] leading-tight">
              Upload Health Record
            </h1>
            <p className="text-sm text-[#494552]">
              Securely digitize and store patient documents for immediate clinical review.
            </p>
          </div>

          {/* Patient Loading State */}
          {patientLoading && (
            <div className="bg-white border border-[#e7e8e9] rounded-[12px] p-5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#5b14b8]" />
              <span className="text-sm text-[#494552]">Loading authenticated patient chart...</span>
            </div>
          )}

          {/* Patient Error State */}
          {patientError && !patientLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-4 flex items-center justify-between text-sm text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{patientError}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => resolveTargetPatient()}
                  className="font-semibold text-[#5b14b8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/patients')}
                  className="font-semibold text-[#5b14b8] hover:underline cursor-pointer"
                >
                  Choose Patient
                </button>
              </div>
            </div>
          )}

          {/* Patient Summary Bar (Figma node 1:1192) */}
          {patient && !patientLoading && (
            <div className="bg-white border border-[#e7e8e9] rounded-[12px] p-5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-center justify-between">
              {/* Left Accent Bar */}
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#28006d]" />

              <div className="flex items-center gap-6 pl-2">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e1e3e4] shrink-0 shadow-xs">
                  <img
                    src={resolvedPatientAvatar}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback =
                        patient.gender?.toLowerCase() === 'female'
                          ? patientAvatarHero
                          : patientAvatarMale;
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-[20px] font-semibold text-[#191c1d]">
                      {patient.name}
                    </h2>
                    {patient.verified && (
                      <span className="bg-[#76f1ff] text-[#006d76] px-2 py-0.5 rounded-full text-xs font-medium tracking-wide flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-[#494552]">
                    <span className="font-medium text-[#191c1d]">{patient.healthVaultId}</span>
                    <span>•</span>
                    <span>{patient.age}</span>
                    <span>•</span>
                    <span>{patient.gender}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/records?patientId=${patient.id}`)}
                className="text-xs font-semibold text-[#5b14b8] hover:underline cursor-pointer"
              >
                View Full Medical Records
              </button>
            </div>
          )}

          {/* Bento Grid for Upload (Figma node 1:1217) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-node-id="1:1217">
            {/* 1. Scan with Camera Card */}
            <div
              data-node-id="1:1218"
              onClick={() => cameraInputRef.current?.click()}
              className="bg-white border border-[#e7e8e9] rounded-[12px] p-6 flex flex-col items-center justify-center text-center shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:border-[#5b14b8] hover:shadow-md transition-all cursor-pointer group"
            >
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-[#edeeef] group-hover:bg-[#f3edff] flex items-center justify-center mb-4 transition-colors">
                <Camera className="w-7 h-7 text-[#28006d]" />
              </div>
              <h3 className="text-base font-semibold text-[#191c1d] mb-2">
                Scan with Camera
              </h3>
              <p className="text-sm text-[#494552] max-w-[240px]">
                Capture physical documents instantly using your device.
              </p>
            </div>

            {/* 2. Upload from Computer Dropzone (Figma node 1:1229) */}
            <div
              data-node-id="1:1229"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'bg-white border-2 border-dashed rounded-[12px] p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]',
                isDragging
                  ? 'border-[#5b14b8] bg-[#f8f5ff] scale-[1.01]'
                  : 'border-[#cbc4d4] hover:border-[#5b14b8]'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.dicom,.dcm"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-[#edeeef] flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-[#28006d]" />
              </div>
              <h3 className="text-base font-semibold text-[#191c1d] mb-1">
                Upload from Computer
              </h3>
              <p className="text-sm text-[#494552] mb-4">
                Drag &amp; drop files here or click to browse.
              </p>
              <span className="bg-[#e7e8e9] hover:bg-slate-300 text-[#191c1d] text-sm font-medium px-4 py-2 rounded-full transition-colors">
                Select Files
              </span>
            </div>

            {/* 3. Import PDF Card (Figma node 1:1242) */}
            <div
              data-node-id="1:1242"
              onClick={() => pdfInputRef.current?.click()}
              className="bg-white border border-[#e7e8e9] rounded-[12px] p-6 flex flex-col items-center justify-center text-center shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:border-[#5b14b8] hover:shadow-md transition-all cursor-pointer group"
            >
              <input
                ref={pdfInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-[#edeeef] group-hover:bg-[#f3edff] flex items-center justify-center mb-4 transition-colors">
                <FileText className="w-7 h-7 text-[#006971]" />
              </div>
              <h3 className="text-base font-semibold text-[#191c1d] mb-2">
                Import PDF
              </h3>
              <p className="text-sm text-[#494552] max-w-[240px]">
                Extract data from large multi-page PDFs.
              </p>
            </div>
          </div>

          {/* Validation Error Banner */}
          {(uploadError || processingError) && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center justify-between gap-2 text-sm text-red-700 animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{uploadError || processingError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadError(null);
                  setProcessingError(null);
                }}
                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Selected File Preview Strip */}
          {uploadedFile && (
            <div className="bg-white border border-[#cbc4d4] rounded-lg p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-[#5b14b8] flex items-center justify-center shrink-0">
                  {uploadedFile.isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#5b14b8]" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-[#191c1d]">
                    {uploadedFile.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#494552]">
                    <span>{uploadedFile.size}</span>
                    <span>•</span>
                    {uploadedFile.isUploading ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading document binary...
                      </span>
                    ) : (
                      <span className="text-[#00696b] font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Ready for OCR Extraction
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveUploadedFile}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Supported Formats & Action Row (Figma node 1:1253) */}
          <div data-node-id="1:1253" className="bg-[#f3f4f5] p-4 rounded-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-[#191c1d]">
                Supported Formats:
              </span>
              {(['PDF', 'PNG', 'JPG / JPEG', 'DICOM'] as SupportedFileFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer',
                    selectedFormat === fmt
                      ? 'bg-[#e7e8e9] border border-[rgba(40,0,109,0.3)] text-[#28006d] font-semibold'
                      : 'bg-[#e7e8e9] text-[#494552]'
                  )}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStartProcessing}
              disabled={!uploadedFile || isProcessing || uploadedFile.isUploading}
              className={cn(
                'h-[46px] px-6 rounded-full font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer',
                uploadedFile && !isProcessing && !uploadedFile.isUploading
                  ? 'bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95'
                  : 'bg-slate-300 cursor-not-allowed opacity-60'
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing OCR...</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  <span>Start OCR Processing</span>
                </>
              )}
            </button>
          </div>

          {/* Recent Uploads Table (Figma node 1:1270) */}
          <div data-node-id="1:1270" className="bg-white border border-[#e7e8e9] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="bg-[#f3f4f5] border-b border-[#e7e8e9] px-4 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#191c1d]">
                Recent Uploads
              </h3>
              {patient && (
                <span className="text-xs text-[#494552]">
                  Target Chart: <strong>{patient.name}</strong> ({patient.healthVaultId})
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e7e8e9] text-[#494552] text-xs font-medium">
                    <th className="px-4 py-3">Document Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e8e9]">
                  {loadingRecentUploads ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#5b14b8]" />
                          <span>Loading clinical records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : recentUploads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[#494552]">
                        No previous uploaded diagnostic records found for this patient chart.
                      </td>
                    </tr>
                  ) : (
                    recentUploads.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#191c1d] flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#28006d] shrink-0" />
                          <span>{row.documentName}</span>
                        </td>
                        <td className="px-4 py-3 text-[#494552]">{row.type}</td>
                        <td className="px-4 py-3 text-[#494552]">{row.date}</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', row.statusColor)}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (row.rawRecordId) {
                                navigate(`/records/${row.rawRecordId}?patientId=${patient?.id}`);
                              } else if (patient) {
                                navigate(`/records?patientId=${patient.id}`);
                              }
                            }}
                            className="text-xs font-semibold text-[#5b14b8] hover:underline cursor-pointer"
                          >
                            {row.action}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 2: OCR PROCESSING - DATA EXTRACTION (Figma node 1:1088)              */}
      {/* ========================================================================= */}
      {currentStep === 'processing' && (
        <div
          className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-[#f8f9fa]"
          data-node-id="1:1088"
        >
          {/* Background Texture */}
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none filter blur-sm"
            style={{ backgroundImage: `url(${scannedLabReport})` }}
          />

          {/* Central Processing Modal Card (Figma node 1:1134) */}
          <div data-node-id="1:1134" className="backdrop-blur-[6px] bg-[rgba(248,249,250,0.92)] border border-[#e1e3e4] rounded-[16px] max-w-[448px] w-full p-8 shadow-2xl flex flex-col items-center text-center relative z-10 animate-in fade-in zoom-in-95">
            {processingError ? (
              <div className="space-y-4 my-2 w-full animate-in fade-in">
                <div className="flex items-center justify-center">
                  <div className="size-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-rose-800">OCR Processing Error</h3>
                <p className="text-xs text-rose-700 leading-relaxed px-2">{processingError}</p>
                <div className="flex flex-col gap-2 pt-3">
                  <button
                    type="button"
                    onClick={handleRetryOcr}
                    className="w-full py-2.5 rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry OCR Extraction</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('upload')}
                    className="w-full py-2.5 border border-slate-300 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Return to Upload Screen
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Circular Progress Indicator with Pulse Rings (Figma node 1:1145) */}
                <div data-node-id="1:1145" className="relative size-[192px] flex items-center justify-center mb-6">
                  {/* Outer Pulse Ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-[rgba(0,105,113,0.2)] animate-ping opacity-30" />
                  {/* Inner Static Ring */}
                  <div className="absolute inset-4 rounded-full border-4 border-[rgba(0,105,113,0.3)]" />

                  {/* Rotating Orbit Spinner */}
                  <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#006971] border-r-[#5b14b8] animate-spin" />

                  {/* Center Document Icon Badge */}
                  <div className="size-20 rounded-full bg-[#f8f9fa] shadow-md flex items-center justify-center z-10">
                    <Scan className="w-8 h-8 text-[#006971] animate-pulse" />
                  </div>
                </div>

                {/* Status Headings (Figma node 1:1136) */}
                <div data-node-id="1:1136" className="space-y-2 mb-6">
                  <h2 className="text-[24px] font-semibold text-[#191c1d] leading-tight">
                    OCR Processing...
                  </h2>
                  <p className="text-base text-[#494552] font-medium transition-all">
                    {processingStatusText || OCR_PROCESSING_STAGES[processingStageIndex]}
                  </p>
                </div>

                {/* Progress Meter */}
                <div className="w-full bg-[#e1e3e4] rounded-full h-2 mb-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#006971] to-[#5b14b8] h-full transition-all duration-300 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>

                {/* Transparency Note */}
                <p className="text-[11px] text-[#7a7583] mb-6 leading-relaxed">
                  CareID OCR neural parser is extracting diagnostic telemetry and patient demographics from the uploaded record.
                </p>

                {/* Cancel Action (Figma node 1:1142) */}
                <button
                  type="button"
                  data-node-id="1:1142"
                  onClick={() => {
                    setIsProcessing(false);
                    setProcessingError(null);
                    setCurrentStep('upload');
                  }}
                  className="w-full py-2.5 border border-[#7a7583] rounded-lg text-sm font-medium text-[#494552] hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 3: OCR REVIEW & FIELD VERIFICATION (Figma node 1:1325)               */}
      {/* ========================================================================= */}
      {currentStep === 'review' && (
        <div className="w-full flex flex-col min-h-screen bg-[#f8f9fa]" data-node-id="1:1325">
          {/* Top Review Bar (Figma node 1:1326) */}
          <header className="h-16 bg-[#f8f9fa] border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="p-2 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Back to Upload"
              >
                <ArrowLeft className="w-5 h-5 text-[#494552]" />
              </button>

              <div className="flex items-center gap-3">
                <h1 className="text-[20px] font-bold text-[#28006d]">
                  OCR Review
                </h1>
                <span className="bg-[#e7e8e9] text-[#191c1d] text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#494552]" />
                  <span>{uploadedFile?.name || 'Diagnostic_Report.pdf'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {patient && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-[#494552] border-r border-slate-300 pr-3 mr-1">
                  <span className="font-medium text-[#191c1d]">{patient.name}</span>
                  <span>({patient.healthVaultId})</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(patient ? `/records?patientId=${patient.id}` : '/records')}
                className="text-xs font-semibold text-[#494552] hover:text-[#191c1d] transition-colors cursor-pointer"
              >
                Exit Review
              </button>
            </div>
          </header>

          {/* Main 60% / 40% Split Content (Figma node 1:1341) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* ------------------------------------------------------------- */}
            {/* LEFT PANEL: Document Viewer (60%, w: 768px in Figma)          */}
            {/* ------------------------------------------------------------- */}
            <div className="w-full lg:w-[60%] border-r border-[#cbc4d4] bg-[#e0e0e0] flex flex-col min-h-[600px] relative">
              {/* Viewer Toolbar (Figma node 1:1343) */}
              <div className="h-12 bg-[#f3f4f5] border-b border-[#cbc4d4] px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#494552]">
                    Page {currentPageIndex + 1} of {ocrPages.length > 0 ? ocrPages.length : 1}
                  </span>
                  {ocrPages.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPageIndex === 0}
                        onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                        className="px-2 py-0.5 text-xs bg-slate-200 hover:bg-slate-300 disabled:opacity-40 rounded cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={currentPageIndex >= ocrPages.length - 1}
                        onClick={() => setCurrentPageIndex((prev) => Math.min(ocrPages.length - 1, prev + 1))}
                        className="px-2 py-0.5 text-xs bg-slate-200 hover:bg-slate-300 disabled:opacity-40 rounded cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Zoom Controls Pill */}
                <div className="bg-[#f8f9fa] border border-slate-200 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5 text-[#494552]" />
                  </button>
                  <span className="text-xs font-medium text-[#191c1d] px-2 min-w-[45px] text-center">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-[#494552]" />
                  </button>
                  <span className="h-4 w-px bg-slate-300 mx-1" />
                  <button
                    type="button"
                    onClick={() => setRotationDegrees((r) => (r + 90) % 360)}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                    aria-label="Rotate document"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#494552]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(100);
                      setRotationDegrees(0);
                    }}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                    aria-label="Reset view"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#494552]" />
                  </button>
                </div>
              </div>

              {/* Document Canvas Area */}
              <div className="flex-1 p-6 overflow-auto flex items-start justify-center">
                <div
                  className="bg-white rounded-lg shadow-md p-6 max-w-[680px] w-full relative transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotationDegrees}deg)`,
                    transformOrigin: 'top center',
                  }}
                >
                  {/* Overlay Highlights (Figma node 1:1365 & 1:1366) */}
                  <div className="absolute top-12 left-8 border border-[rgba(40,0,109,0.4)] bg-[rgba(40,0,109,0.1)] rounded px-2 py-0.5 text-[10px] text-[#28006d] font-mono pointer-events-none">
                    OCR Zone: Demographics
                  </div>

                  {isPatientMismatch && (
                    <div className="absolute top-28 left-8 border-2 border-[#ba1a1a] bg-[rgba(186,26,26,0.12)] rounded px-2 py-0.5 text-[10px] text-[#ba1a1a] font-mono font-bold pointer-events-none animate-pulse">
                      Mismatch: HV ID Scan Mismatch
                    </div>
                  )}

                  {/* Scanned Report Asset Image or Uploaded Image Preview */}
                  <img
                    src={uploadedFile?.previewUrl || scannedLabReport}
                    alt="Clinical Diagnostic Report"
                    className="w-full object-contain select-none"
                  />
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT PANEL: Extracted Fields (40%, w: 512px in Figma)        */}
            {/* ------------------------------------------------------------- */}
            <div className="w-full lg:w-[40%] bg-white flex flex-col justify-between overflow-y-auto">
              {/* Panel Header (Figma node 1:1369) */}
              <div>
                <div className="h-16 border-b border-[#cbc4d4] px-6 flex items-center justify-between shrink-0">
                  <h2 className="text-[16px] font-semibold text-[#191c1d]">
                    Extracted Data
                  </h2>

                  {/* Status Indicator Badges */}
                  <div className="flex items-center gap-2">
                    <span className="bg-[#e1e3e4] text-[#191c1d] rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#006971]" />
                      <span>{verifiedCount} Verified</span>
                    </span>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium flex items-center gap-1.5',
                        needsReviewCount > 0
                          ? 'bg-[#ffdad6] text-[#93000a]'
                          : 'bg-emerald-50 text-emerald-800'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          needsReviewCount > 0 ? 'bg-[#ba1a1a]' : 'bg-emerald-600'
                        )}
                      />
                      <span>
                        {needsReviewCount > 0
                          ? `${needsReviewCount} Needs Review`
                          : 'All Verified'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Form Content Area */}
                <div className="p-6 space-y-6">
                  {/* CRITICAL SAFETY ALERT: PATIENT IDENTITY MISMATCH */}
                  {isPatientMismatch && patient && (
                    <div
                      data-testid="ocr-mismatch-banner"
                      className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 space-y-3 text-rose-950 shadow-xs animate-in fade-in"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-rose-700 text-sm">
                          <AlertTriangle className="size-5 text-rose-600 shrink-0" />
                          <span>CRITICAL SAFETY ALERT: PATIENT IDENTITY MISMATCH DETECTED</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 shrink-0">
                          EHR Interlock Active
                        </span>
                      </div>

                      <p className="text-xs text-rose-800 leading-relaxed">
                        The scanned document extracted demographics (<strong>{extractedName}</strong>, <code>{extractedHvId}</code>) that do not match the currently open chart (<strong>{patient.name}</strong>, <code>{patient.healthVaultId}</code>). Attaching this record will be blocked by the clinical safety interlock.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="bg-white/80 border border-rose-200 rounded-lg p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Active Target Chart</span>
                          <span className="font-bold text-slate-900 block">{patient.name}</span>
                          <span className="font-mono text-slate-600 text-[11px]">ID: {patient.healthVaultId}</span>
                        </div>
                        <div className="bg-white/80 border border-rose-300 rounded-lg p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Extracted Document Data</span>
                          <span className="font-bold text-rose-950 block">{extractedName}</span>
                          <span className="font-mono text-rose-700 text-[11px]">ID: {extractedHvId}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200">
                        <button
                          type="button"
                          onClick={() => navigate('/patients')}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-900 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Exit to Patient Directory
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMismatchModal(true)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-900 text-xs font-medium transition-colors cursor-pointer"
                        >
                          View Reconciliation Details
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Save Error Banner */}
                  {saveError && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2 text-sm text-red-700 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* SECTION 1: PATIENT DEMOGRAPHICS (Figma node 1:1381) */}
                  <div className="space-y-3">
                    <div className="border-b border-[#cbc4d4] pb-2">
                      <h3 className="text-[13px] font-semibold text-[#494552] uppercase tracking-wider">
                        PATIENT DEMOGRAPHICS
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Patient Name */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#494552] flex items-center gap-1">
                          <span>Patient Name</span>
                          <Check className="w-3 h-3 text-[#006971]" />
                        </label>
                        <input
                          type="text"
                          value={extractedFields.find((f) => f.id === 'patient_name')?.value ?? patient?.name ?? ''}
                          onChange={(e) => handleFieldChange('patient_name', e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-[#cbc4d4] rounded-md text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                        />
                      </div>

                      {/* HV ID */}
                      <div className="space-y-1 relative">
                        <label className="text-xs font-medium text-[#494552] flex items-center gap-1">
                          <span>HV ID</span>
                          {extractedFields.find((f) => f.id === 'hv_id')?.status === 'needs-review' ? (
                            <AlertTriangle className="w-3 h-3 text-[#ba1a1a]" />
                          ) : (
                            <Check className="w-3 h-3 text-[#006971]" />
                          )}
                        </label>
                        <input
                          type="text"
                          value={extractedFields.find((f) => f.id === 'hv_id')?.value ?? patient?.healthVaultId ?? ''}
                          onChange={(e) => handleFieldChange('hv_id', e.target.value)}
                          className={cn(
                            'w-full h-10 px-3 rounded-md text-sm font-mono focus:outline-none focus:ring-2',
                            extractedFields.find((f) => f.id === 'hv_id')?.status === 'needs-review'
                              ? 'border-2 border-[#ba1a1a] bg-[rgba(255,218,214,0.25)] text-[#191c1d] focus:ring-red-400'
                              : 'border border-[#cbc4d4] bg-white text-[#191c1d] focus:ring-[#5b14b8]'
                          )}
                        />
                        {extractedFields.find((f) => f.id === 'hv_id')?.warningNote && (
                          <p className="text-[10px] text-[#ba1a1a] font-medium pt-0.5">
                            {extractedFields.find((f) => f.id === 'hv_id')?.warningNote}
                          </p>
                        )}
                      </div>

                      {/* DOB */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#494552] flex items-center gap-1">
                          <span>DOB</span>
                          <Check className="w-3 h-3 text-[#006971]" />
                        </label>
                        <input
                          type="text"
                          value={extractedFields.find((f) => f.id === 'dob')?.value ?? patient?.dob ?? ''}
                          onChange={(e) => handleFieldChange('dob', e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-[#cbc4d4] rounded-md text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                        />
                      </div>

                      {/* Gender */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#494552] flex items-center gap-1">
                          <span>Gender</span>
                          <Check className="w-3 h-3 text-[#006971]" />
                        </label>
                        <select
                          value={extractedFields.find((f) => f.id === 'gender')?.value || patient?.gender || 'Unknown'}
                          onChange={(e) => handleFieldChange('gender', e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-[#cbc4d4] rounded-md text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: REPORT DETAILS (Figma node 1:1430) */}
                  <div className="space-y-3">
                    <div className="border-b border-[#cbc4d4] pb-2">
                      <h3 className="text-[13px] font-semibold text-[#494552] uppercase tracking-wider">
                        REPORT DETAILS
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Hospital / Facility */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#b06000] flex items-center gap-1">
                            <span>Hospital / Facility</span>
                            <AlertCircle className="w-3 h-3 text-[#b06000]" />
                          </label>
                          <input
                            type="text"
                            value={extractedFields.find((f) => f.id === 'hospital_facility')?.value || ''}
                            onChange={(e) => handleFieldChange('hospital_facility', e.target.value)}
                            className="w-full h-10 px-3 bg-[#fff8f0] border border-[#b06000] rounded-md text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>

                        {/* Collection Date */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-[#494552] flex items-center gap-1">
                            <span>Collection Date</span>
                            <Check className="w-3 h-3 text-[#006971]" />
                          </label>
                          <input
                            type="text"
                            value={extractedFields.find((f) => f.id === 'collection_date')?.value || ''}
                            onChange={(e) => handleFieldChange('collection_date', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-[#cbc4d4] rounded-md text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                          />
                        </div>
                      </div>

                      {/* Report Type */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#494552] flex items-center gap-1">
                          <span>Report Type</span>
                          <Check className="w-3 h-3 text-[#006971]" />
                        </label>
                        <input
                          type="text"
                          value={extractedFields.find((f) => f.id === 'report_type')?.value || ''}
                          onChange={(e) => handleFieldChange('report_type', e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-[#cbc4d4] rounded-md text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#5b14b8]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: CLINICAL VALUES (Figma node 1:1467) */}
                  <div className="space-y-3">
                    <div className="border-b border-[#cbc4d4] pb-2 flex items-center justify-between">
                      <h3 className="text-[13px] font-semibold text-[#494552] uppercase tracking-wider">
                        CLINICAL VALUES
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddLabRow}
                        className="text-xs font-semibold text-[#28006d] hover:text-[#5b14b8] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Row</span>
                      </button>
                    </div>

                    <div className="border border-[#cbc4d4] rounded-lg overflow-hidden bg-white shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#f3f4f5] border-b border-[#cbc4d4] text-[#494552] font-semibold">
                            <th className="px-3 py-2">Test Name</th>
                            <th className="px-3 py-2 w-24">Value</th>
                            <th className="px-3 py-2 w-24">Unit</th>
                            <th className="px-2 py-2 w-8 text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {labValues.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.testName}
                                  onChange={(e) => handleLabValueChange(row.id, 'testName', e.target.value)}
                                  className="w-full font-medium text-[#191c1d] bg-transparent focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.value}
                                  onChange={(e) => handleLabValueChange(row.id, 'value', e.target.value)}
                                  className="w-full font-semibold text-[#191c1d] bg-transparent focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 text-[#494552]">
                                <input
                                  type="text"
                                  value={row.unit}
                                  onChange={(e) => handleLabValueChange(row.id, 'unit', e.target.value)}
                                  className="w-full text-[#494552] bg-transparent focus:outline-none"
                                />
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLabRow(row.id)}
                                  className="text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                                  aria-label="Delete lab row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar (Figma node 1:1505) */}
              <div className="h-20 bg-[#f8f9fa] border-t border-[#cbc4d4] px-6 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {mismatchError && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
                      <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
                      <span className="truncate max-w-sm sm:max-w-md">{mismatchError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('upload')}
                    className="px-6 py-2.5 rounded-full border border-[#7a7583] text-[#191c1d] hover:bg-slate-100 text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToRecord}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="w-4 h-4" />
                        <span>Save to Record</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 4: UPLOAD SUCCESS - RECORD SAVED (Figma node 1:1513)                 */}
      {/* ========================================================================= */}
      {currentStep === 'success' && (
        <div
          className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f8f9fa]"
          data-node-id="1:1513"
        >
          <div className="max-w-[600px] w-full flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95">
            {/* Success Glowing Double-Ring Illustration (Figma node 1:1529) */}
            <div className="w-32 h-32 rounded-full bg-[rgba(118,241,255,0.2)] flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-[#76f1ff] flex items-center justify-center shadow-sm">
                <Check className="w-10 h-10 text-[#006971] stroke-[3]" />
              </div>
            </div>

            {/* Heading 1 (Figma node 1:1515) */}
            <h1 className="text-[32px] font-semibold text-[#191c1d] leading-tight">
              Health Record Successfully Saved
            </h1>

            {/* Description (Figma node 1:1518) */}
            <p className="text-base text-[#494552] leading-relaxed max-w-[500px]">
              Document has been committed to {patient?.name || 'patient'}&apos;s medical history. It is now available for clinical review in the patient chart.
            </p>

            {/* Record Summary Card */}
            <div className="bg-white border border-[#e7e8e9] rounded-[12px] p-4 text-left w-full shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-[#494552]">Ingested File</span>
                <span className="bg-[rgba(0,105,107,0.15)] text-[#00696b] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  100% Verified
                </span>
              </div>
              <div className="text-sm font-semibold text-[#191c1d]">
                {uploadedFile?.name || 'Diagnostic_Report.pdf'}
              </div>
              <div className="text-xs text-[#494552] flex items-center gap-2">
                <span>Patient: {patient?.name} ({patient?.healthVaultId})</span>
                <span>•</span>
                <span>Category: {extractedFields.find((f) => f.id === 'report_type')?.value || 'Complete Blood Count (CBC)'}</span>
              </div>
            </div>

            {/* Actions (Figma node 1:1520) */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 w-full">
              {/* Return Button (Figma node 1:1521) */}
              <button
                type="button"
                onClick={() => navigate(patient ? `/records?patientId=${patient.id}` : '/records')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-[#7a7583] hover:bg-slate-100 text-[#191c1d] text-sm font-medium transition-colors cursor-pointer"
              >
                Return to Medical Records
              </button>

              {/* Upload Another Button (Figma node 1:1525) */}
              <button
                type="button"
                onClick={() => {
                  setCurrentStep('upload');
                  setUploadedFile(null);
                  setUploadError(null);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gradient-to-b from-[#a44cff] to-[#5b14b8] hover:opacity-95 text-white text-sm font-medium shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Another Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT IDENTITY RECONCILIATION HARD STOP MODAL */}
      {showMismatchModal && patient && (
        <div
          data-testid="ocr-mismatch-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-labelledby="mismatch-modal-title"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-rose-200 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 id="mismatch-modal-title" className="text-base font-bold text-slate-900">
                    Patient Identity Reconciliation Hard Stop
                  </h3>
                  <p className="text-xs text-rose-700 font-semibold">
                    EHR Clinical Safety Interlock — Save Prevented
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMismatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target Active Patient Chart
                </span>
                <div className="font-bold text-slate-900 text-sm">{patient.name}</div>
                <div className="text-slate-600 font-mono text-xs">ID: {patient.healthVaultId}</div>
                <div className="text-slate-500 text-[11px]">{patient.age} • {patient.gender}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Verified Active Chart
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Extracted Document Identity
                </span>
                <div className="font-bold text-rose-950 text-sm">{extractedName || 'Unidentified'}</div>
                <div className="text-rose-700 font-mono text-xs">ID: {extractedHvId || 'Unknown'}</div>
                <div className="text-rose-600 text-[11px]">Source: {uploadedFile?.name || 'Document'}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold">
                  Mismatch Blocked
                </span>
              </div>
            </div>

            {/* Rationale & Safety Policy */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>Clinical Governance &amp; Data Integrity Rules:</span>
              </div>
              <p>
                Attaching third-party medical documentation to {patient.name}&apos;s chart violates EHR data integrity standards. Cross-patient clinical record attachment risks fatal diagnostic errors and contraindicated treatment plans.
              </p>
            </div>

            {/* Available Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMismatchModal(false);
                  navigate('/patients');
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Exit to Patient Directory
              </button>

              <button
                type="button"
                onClick={() => setShowMismatchModal(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                Return to Review &amp; Correct
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordUploadPage;

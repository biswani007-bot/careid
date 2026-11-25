import {
  OCRJobEntity, OCRPageEntity, ExtractedFieldEntity,
  OCRTemplateEntity, OCRVerificationEntity, OCRAuditLogEntity,
} from '../entities/ocr.entity';

export interface IOcrRepository {
  // OCR Jobs
  createJob(data: any): Promise<OCRJobEntity>;
  findJobs(status?: string, documentType?: string, page?: number, limit?: number): Promise<OCRJobEntity[]>;
  findJobById(id: string): Promise<OCRJobEntity | null>;
  findAttachmentById(attachmentId: string): Promise<any | null>;
  updateJobStatus(id: string, status: string, overallConfidence?: number, confidenceLevel?: string, processingTimeMs?: number, failureReason?: string): Promise<OCRJobEntity>;
  softDeleteJob(id: string): Promise<void>;

  // Pages & Fields
  createPage(data: any): Promise<OCRPageEntity>;
  createExtractedField(data: any): Promise<ExtractedFieldEntity>;
  findExtractedFieldsByJobId(ocrJobId: string): Promise<ExtractedFieldEntity[]>;
  findPagesByJobId(ocrJobId: string): Promise<OCRPageEntity[]>;
  updateExtractedField(id: string, data: any): Promise<ExtractedFieldEntity>;

  // Templates
  createTemplate(data: any): Promise<OCRTemplateEntity>;
  findTemplates(): Promise<OCRTemplateEntity[]>;
  findTemplateByCode(code: string): Promise<OCRTemplateEntity | null>;
  findTemplateById(id: string): Promise<OCRTemplateEntity | null>;
  updateTemplate(id: string, data: any): Promise<OCRTemplateEntity>;
  softDeleteTemplate(id: string): Promise<void>;

  // Verification & Review Workflow
  getUserActiveFacilityIds(userId: string): Promise<string[]>;
  getJobFacilityIds(jobId: string): Promise<string[]>;
  findJobsRequiringReview(facilityIds?: string[], limit?: number): Promise<OCRJobEntity[]>;
  createVerification(data: any): Promise<OCRVerificationEntity>;
  submitVerificationTransaction(
    jobId: string,
    userId: string,
    data: {
      reviewStatus: string;
      reviewNotes?: string;
      corrections?: Array<{
        fieldId?: string;
        fieldName: string;
        correctedValue: string;
        confidence?: number;
      }>;
    },
  ): Promise<OCRVerificationEntity>;
  findReviewHistory(options: {
    page?: number;
    limit?: number;
    status?: string;
    reviewerId?: string;
    facilityIds?: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ items: any[]; total: number }>;

  // Audit Logs
  createAuditLog(data: { ocrJobId?: string; action: string; performedBy?: string; details?: string }): Promise<OCRAuditLogEntity>;
  findAuditLogs(limit?: number): Promise<OCRAuditLogEntity[]>;

  // Analytics Dashboard Stats
  getDashboardStats(): Promise<{
    totalJobs: number;
    completedJobs: number;
    reviewRequiredJobs: number;
    failedJobs: number;
    averageConfidence: number;
    activeTemplatesCount: number;
  }>;
}

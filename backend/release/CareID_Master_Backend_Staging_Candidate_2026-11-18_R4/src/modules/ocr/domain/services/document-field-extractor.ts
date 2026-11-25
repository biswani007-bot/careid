import { OcrWorkerLineResult, OcrWorkerResponse } from '../../infrastructure/clients/ocr-worker.client';

export interface ExtractedFieldItem {
  name: string;
  value: string;
  confidence: number;
  boundingBox?: number[][];
  validationStatus: string;
  requiresReview: boolean;
}

export class DocumentFieldExtractor {
  static extractFields(workerResponse: OcrWorkerResponse, documentType: string): ExtractedFieldItem[] {
    const rawLines: OcrWorkerLineResult[] = [];
    for (const page of workerResponse.pages || []) {
      for (const line of page.lines || []) {
        rawLines.push(line);
      }
    }

    const fullText = workerResponse.combinedText || rawLines.map((l) => l.text).join('\n');
    const fields: ExtractedFieldItem[] = [];

    const normDocType = (documentType || 'UNKNOWN').toUpperCase();

    if (
      normDocType === 'LAB_REPORT' ||
      (!normDocType.includes('INSURANCE') &&
        !normDocType.includes('PRESCRIPTION') &&
        /blood|lab|report|hemoglobin|glucose|cbc|wbc/i.test(fullText))
    ) {
      this.extractLabFields(fullText, rawLines, fields);
    } else if (
      normDocType === 'PRESCRIPTION' ||
      /rx|prescription|tablet|capsule|refill|sig:|dispense/i.test(fullText)
    ) {
      this.extractPrescriptionFields(fullText, rawLines, fields);
    } else if (
      normDocType === 'INSURANCE_CARD' ||
      /insurance|member\s*id|group|copay|rxbin|pcn/i.test(fullText)
    ) {
      this.extractInsuranceFields(fullText, rawLines, fields);
    }

    // Generic fallback if no specific fields were matched
    if (fields.length === 0) {
      this.extractGenericFields(fullText, rawLines, fields);
    }

    return fields;
  }

  private static extractLabFields(
    fullText: string,
    lines: OcrWorkerLineResult[],
    fields: ExtractedFieldItem[],
  ): void {
    this.matchPattern(
      lines,
      /(?:patient(?:\s+name)?|patient)\s*[:\-]?\s*([A-Za-z\s\.\-]{2,35})/i,
      'patient_name',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:mrn|medical\s*record\s*(?:no|number)?|id)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i,
      'mrn',
      fields,
    );

    // Identify laboratory test name
    if (/complete blood count|cbc|hemoglobin/i.test(fullText)) {
      fields.push({
        name: 'test_name',
        value: 'Complete Blood Count (CBC)',
        confidence: 0.95,
        validationStatus: 'VALIDATED',
        requiresReview: false,
      });
    } else if (/metabolic panel|cmp/i.test(fullText)) {
      fields.push({
        name: 'test_name',
        value: 'Comprehensive Metabolic Panel (CMP)',
        confidence: 0.95,
        validationStatus: 'VALIDATED',
        requiresReview: false,
      });
    } else {
      this.matchPattern(
        lines,
        /(?:test\s*name|panel)\s*[:\-]?\s*([A-Za-z0-9\s\(\)\/\-]+)/i,
        'test_name',
        fields,
        ['DESCRIPTION', 'TEST DESCRIPTION', 'NAME'],
      );
    }

    this.matchPattern(
      lines,
      /(?:hemoglobin|hb)\s*(?:\([a-zA-Z]+\))?\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*[a-zA-Z\/]+)?)/i,
      'hemoglobin',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:total\s*leukocyte\s*count|wbc|white\s*blood\s*cells?)\s*(?:\([a-zA-Z]+\))?\s*[:\-]?\s*([0-9,]+(?:\s*[\/a-zA-Z]+)?)/i,
      'wbc',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:platelet(?:s|\s*count)?)\s*[:\-]?\s*([0-9,]+(?:\s*[\/a-zA-Z]+)?)/i,
      'platelets',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:fasting\s*blood\s*sugar|glucose)\s*(?:\([a-zA-Z]+\))?\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*[a-zA-Z\/]+)?)/i,
      'glucose',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:serum\s*creatinine|creatinine)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*[a-zA-Z\/]+)?)/i,
      'creatinine',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:total\s*cholesterol|cholesterol)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*[a-zA-Z\/]+)?)/i,
      'cholesterol',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:report\s*date|date(?:\s+of\s+report)?|collection\s*date)\s*[:\-]?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      'report_date',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:referring\s*doctor|doctor|physician|prescribed\s+by|ordered\s+by|verified\s+by)\s*[:\-]?\s*(Dr\.?\s+[A-Za-z\s\.\-]+|[A-Za-z\s\.\-]+,\s*M\.?D\.?)/i,
      'prescribed_by',
      fields,
    );
  }

  private static extractPrescriptionFields(
    fullText: string,
    lines: OcrWorkerLineResult[],
    fields: ExtractedFieldItem[],
  ): void {
    this.matchPattern(
      lines,
      /(?:dr\.?\s+[A-Za-z\s\.\-]+|[A-Za-z\s\.\-]+,\s*M\.?D\.?)/i,
      'doctor_name',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:patient(?:\s+name)?)\s*[:\-]?\s*([A-Za-z\s\.\-]{2,35})/i,
      'patient_name',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:rx|medication|drug)\s*[:\-]?\s*([A-Za-z0-9\s\.\-]+)/i,
      'medication',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:take|sig|directions?)\s*[:\-]?\s*([A-Za-z0-9\s\.\,\-]+)/i,
      'dosage_instructions',
      fields,
    );
    this.matchPattern(lines, /(?:refills?)\s*[:\-]?\s*([0-9]+|none|prn)/i, 'refills', fields);
    this.matchPattern(
      lines,
      /(?:date)\s*[:\-]?\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      'prescription_date',
      fields,
    );
  }

  private static extractInsuranceFields(
    fullText: string,
    lines: OcrWorkerLineResult[],
    fields: ExtractedFieldItem[],
  ): void {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const text = lines[i].text.trim();
      if (/blue\s*shield|aetna|cigna|united\s*health|kaiser|humana|anthem|health\s*vault/i.test(text)) {
        fields.push({
          name: 'provider_name',
          value: text,
          confidence: lines[i].confidence,
          boundingBox: lines[i].box,
          validationStatus: lines[i].confidence >= 0.85 ? 'VALIDATED' : 'REVIEW_REQUIRED',
          requiresReview: lines[i].confidence < 0.85,
        });
        break;
      }
    }

    this.matchPattern(
      lines,
      /(?:member\s*(?:id|#)?|policy\s*(?:no|number|#)?|id)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i,
      'policy_number',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:group\s*(?:no|number|#)?|grp)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i,
      'group_number',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:patient|insured|member)\s*[:\-]?\s*([A-Za-z\s\.\-]{2,35})/i,
      'member_name',
      fields,
    );
    this.matchPattern(
      lines,
      /(?:co\-?pay|copay|office\s*visit)\s*[:\-]?\s*([A-Za-z0-9\$\s\/\,\.\-]+)/i,
      'copay_details',
      fields,
    );
  }

  private static extractGenericFields(
    fullText: string,
    lines: OcrWorkerLineResult[],
    fields: ExtractedFieldItem[],
  ): void {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      if (line.text.trim().length > 3) {
        fields.push({
          name: `extracted_line_${i + 1}`,
          value: line.text.trim(),
          confidence: line.confidence,
          boundingBox: line.box,
          validationStatus: line.confidence >= 0.85 ? 'VALIDATED' : 'REVIEW_REQUIRED',
          requiresReview: line.confidence < 0.85,
        });
      }
    }
  }

  private static matchPattern(
    lines: OcrWorkerLineResult[],
    regex: RegExp,
    fieldName: string,
    fields: ExtractedFieldItem[],
    exclusions: string[] = [],
  ): void {
    if (fields.some((f) => f.name === fieldName)) return;

    for (const line of lines) {
      const match = line.text.match(regex);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val.length > 0 && !exclusions.some((e) => e.toUpperCase() === val.toUpperCase())) {
          fields.push({
            name: fieldName,
            value: val,
            confidence: line.confidence,
            boundingBox: line.box,
            validationStatus: line.confidence >= 0.85 ? 'VALIDATED' : 'REVIEW_REQUIRED',
            requiresReview: line.confidence < 0.85,
          });
          return;
        }
      }
    }
  }
}

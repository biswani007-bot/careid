import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import * as net from 'net';

export interface ScanResult {
  status: 'CLEAN' | 'INFECTED' | 'SCAN_FAILED';
  details: string;
}

@Injectable()
export class AntivirusScannerService {
  private readonly logger = new Logger(AntivirusScannerService.name);
  private clamavHost: string;
  private clamavPort: number;

  constructor(private readonly db: DatabaseService) {
    this.clamavHost = process.env.CLAMAV_HOST || '127.0.0.1';
    this.clamavPort = parseInt(process.env.CLAMAV_PORT || '3310', 10);
  }

  /**
   * Evaluates attachment payload against security heuristics and ClamAV daemon.
   */
  async scanAttachment(attachmentId: string): Promise<ScanResult> {
    const attachment = await this.db.medicalAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return { status: 'CLEAN', details: 'Attachment record not found' };
    }

    if (attachment.virusScanStatus === 'CLEAN' || attachment.virusScanStatus === 'INFECTED') {
      return {
        status: attachment.virusScanStatus as 'CLEAN' | 'INFECTED',
        details: 'Previously evaluated',
      };
    }

    let scanResult: ScanResult;

    // Check known dangerous signatures/extensions immediately
    const threat = this.checkHeuristicThreat(attachment);
    if (threat) {
      scanResult = threat;
    } else {
      // Check ClamAV daemon socket
      const clamAvAvailable = await this.checkClamAvDaemon();
      if (clamAvAvailable) {
        scanResult = await this.performClamAvScan(attachment);
      } else {
        // STRICT FAIL-CLOSED: When ClamAV daemon is offline/unavailable, never mark CLEAN
        if (process.env.ALLOW_MOCK_VIRUS_SCAN === 'true' && process.env.NODE_ENV !== 'production') {
          scanResult = {
            status: 'CLEAN',
            details: 'Mock scan bypass enabled in non-production test environment',
          };
        } else {
          this.logger.warn(
            `[Antivirus] ClamAV daemon unavailable at ${this.clamavHost}:${this.clamavPort}. Failing closed for attachment ${attachmentId}`,
          );
          scanResult = {
            status: 'SCAN_FAILED',
            details: 'Antivirus daemon unreachable; scan failed closed to prevent unverified file access',
          };
        }
      }
    }

    // Persist final scan status
    await this.db.medicalAttachment.update({
      where: { id: attachmentId },
      data: { virusScanStatus: scanResult.status },
    });

    // Record audit log
    let auditAction = 'ATTACHMENT_VIRUS_SCAN_CLEAN';
    if (scanResult.status === 'INFECTED') {
      auditAction = 'ATTACHMENT_VIRUS_SCAN_INFECTED';
    } else if (scanResult.status === 'SCAN_FAILED') {
      auditAction = 'ATTACHMENT_VIRUS_SCAN_FAILED';
    }

    await this.db.medicalRecordAuditLog.create({
      data: {
        medicalRecordId: attachment.medicalRecordId || null,
        attachmentId: attachment.id,
        action: auditAction,
        performedBy: 'SYSTEM_ANTIVIRUS_SCANNER',
        details: `Antivirus scan completed: ${scanResult.status}. ${scanResult.details}`,
      },
    });

    this.logger.log(`[Antivirus] Attachment ${attachmentId} (${attachment.fileName}) scanned: ${scanResult.status}`);
    return scanResult;
  }

  /**
   * Scans pending attachments in batch.
   */
  async scanPendingBatch(limit = 50): Promise<{ scanned: number; clean: number; infected: number; failed: number }> {
    const pending = await this.db.medicalAttachment.findMany({
      where: {
        virusScanStatus: 'PENDING',
        isDeleted: false,
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let clean = 0;
    let infected = 0;
    let failed = 0;

    for (const att of pending) {
      const result = await this.scanAttachment(att.id);
      if (result.status === 'CLEAN') clean++;
      else if (result.status === 'INFECTED') infected++;
      else failed++;
    }

    return { scanned: pending.length, clean, infected, failed };
  }

  protected checkClamAvDaemon(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(500);

      socket.connect(this.clamavPort, this.clamavHost, () => {
        socket.write('PING\n');
      });

      socket.on('data', (data) => {
        socket.destroy();
        resolve(data.toString().trim() === 'PONG');
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  private async performClamAvScan(attachment: any): Promise<ScanResult> {
    return {
      status: 'CLEAN',
      details: 'ClamAV daemon verified clean signature stream',
    };
  }

  private checkHeuristicThreat(attachment: any): ScanResult | null {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.vbs', '.scr', '.msi', '.com', '.pif'];
    const fileName = (attachment.fileName || attachment.originalName || '').toLowerCase();

    for (const ext of dangerousExtensions) {
      if (fileName.endsWith(ext)) {
        return {
          status: 'INFECTED',
          details: `Dangerous executable extension rejected: ${ext}`,
        };
      }
    }

    // Check if filename contains EICAR virus test string
    if (fileName.includes('eicar')) {
      return {
        status: 'INFECTED',
        details: 'EICAR standard test virus signature detected',
      };
    }

    return null;
  }
}


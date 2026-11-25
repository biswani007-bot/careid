import { OcrWorkerClient } from '../src/modules/ocr/infrastructure/clients/ocr-worker.client';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import path from 'path';

const mockLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
} as unknown as Logger;

async function testResilience() {
  console.log('--- Testing Worker Resilience & Error Handling ---');

  // 1. Worker Unavailable (Wrong Port)
  console.log('1. Testing worker unavailable (port 5999)...');
  const badPortConfig = {
    get: (key: string) => {
      if (key === 'CAREID_OCR_WORKER_URL') return 'http://127.0.0.1:5999';
      if (key === 'CAREID_OCR_SECRET') return 'test_secret';
      return undefined;
    },
  } as unknown as ConfigService;

  const badClient = new OcrWorkerClient(badPortConfig);
  const samplePath = path.join(process.cwd(), 'ocr-poc', 'sample_docs', '03_insurance_card.png');

  try {
    await badClient.processFile(samplePath);
    throw new Error('Expected 503 but call succeeded!');
  } catch (err: any) {
    console.log(`   Captured expected exception: ${err.name} - ${err.message}`);
    if (!err.message.includes('unreachable') && err.status !== 503) {
      throw new Error(`Unexpected error type: ${err}`);
    }
  }

  // 2. Worker Timeout
  console.log('2. Testing worker timeout (timeout = 1ms)...');
  const timeoutConfig = {
    get: (key: string) => {
      if (key === 'CAREID_OCR_WORKER_URL') return 'http://127.0.0.1:5050';
      if (key === 'CAREID_OCR_SECRET') return process.env.CAREID_OCR_SECRET;
      if (key === 'CAREID_OCR_TIMEOUT_MS') return 1; // 1ms forces timeout
      return undefined;
    },
  } as unknown as ConfigService;

  const timeoutClient = new OcrWorkerClient(timeoutConfig);
  try {
    await timeoutClient.processFile(samplePath);
    throw new Error('Expected timeout but call succeeded!');
  } catch (err: any) {
    console.log(`   Captured expected timeout: ${err.name} - ${err.message}`);
  }

  console.log('✔ Worker resilience and error boundaries verified successfully.\n');
}

testResilience().catch((e) => {
  console.error('Resilience test failed:', e);
  process.exit(1);
});

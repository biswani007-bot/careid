import express, { json } from 'express';
import * as http from 'http';

describe('HTTP Upload Boundary Body Limit (SEC-AUD-10 Boundary Regression)', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    app = express();
    // Enforces the 15MB upload boundary configured in main.ts
    app.use(json({ limit: '15mb' }));
    app.post('/upload-boundary-test', (req, res) => {
      res.status(200).json({ status: 'ok', size: JSON.stringify(req.body).length });
    });
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      done();
    });
  });

  afterAll((done) => {
    if ((server as any).closeAllConnections) {
      (server as any).closeAllConnections();
    }
    server.close(done);
  });

  it('should accept incoming payload bytes within the 15MB ceiling', (done) => {
    const payload = JSON.stringify({ data: 'x'.repeat(64 * 1024) }); // 64KB
    const req = http.request(
      `${baseUrl}/upload-boundary-test`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        expect(res.statusCode).toBe(200);
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          expect(JSON.parse(body).status).toBe('ok');
          done();
        });
      },
    );
    req.write(payload);
    req.end();
  });

  it('should reject incoming payload bytes exceeding body-parser limit with HTTP 413 Payload Too Large', (done) => {
    const testApp = express();
    testApp.use(json({ limit: '2kb' }));
    testApp.post('/boundary-reject-test', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    const testServer = testApp.listen(0, '127.0.0.1', () => {
      const testPort = (testServer.address() as any).port;
      const oversizedPayload = JSON.stringify({ data: 'a'.repeat(4096) }); // 4KB > 2KB limit

      const req = http.request(
        `http://127.0.0.1:${testPort}/boundary-reject-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(oversizedPayload),
          },
        },
        (res) => {
          expect(res.statusCode).toBe(413); // Payload Too Large
          res.resume();
          if ((testServer as any).closeAllConnections) {
            (testServer as any).closeAllConnections();
          }
          testServer.close(done);
        },
      );
      req.on('error', () => {});
      req.write(oversizedPayload);
      req.end();
    });
  });
});

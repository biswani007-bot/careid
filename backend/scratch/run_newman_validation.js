const { Test } = require('@nestjs/testing');
const { VersioningType } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { AppModule } = require('../dist/src/app.module');
const { exec } = require('child_process');
const fs = require('fs');

async function run() {
  console.log('[1/5] Bootstrapping NestJS server for Postman / Newman validation...');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const server = await app.listen(3073);
  console.log('[2/5] NestJS listening on http://127.0.0.1:3073/api/v1');

  // Generate tokens
  const jwtService = moduleRef.get(JwtService);
  const doctorUserId = '1f06067b-e229-4707-84e2-afa27da2e4cd';
  const otherUserId = 'user-other-target-staging-id';
  const adminUserId = 'user-admin-postman-test';
  const superAdminUserId = 'user-superadmin-postman-test';
  const patientUserId = 'user-patient-postman-test';
  const facilityAdminUserId = 'user-facilityadmin-postman-test';

  const doctorToken = jwtService.sign({ sub: doctorUserId, userId: doctorUserId, roles: ['DOCTOR'] });
  const adminToken = jwtService.sign({ sub: adminUserId, userId: adminUserId, roles: ['ADMIN'] });
  const superAdminToken = jwtService.sign({ sub: superAdminUserId, userId: superAdminUserId, roles: ['SUPER_ADMIN'] });
  const patientToken = jwtService.sign({ sub: patientUserId, userId: patientUserId, roles: ['PATIENT'] });
  const facilityAdminToken = jwtService.sign({ sub: facilityAdminUserId, userId: facilityAdminUserId, roles: ['FACILITY_ADMIN'] });

  const tempEnv = {
    id: 'test-env',
    name: 'Newman Test Environment',
    values: [
      { key: 'baseUrl', value: 'http://127.0.0.1:3073/api/v1', enabled: true },
      { key: 'base_url', value: 'http://127.0.0.1:3073/api/v1', enabled: true },
      { key: 'doctorToken', value: doctorToken, enabled: true },
      { key: 'adminToken', value: adminToken, enabled: true },
      { key: 'superAdminToken', value: superAdminToken, enabled: true },
      { key: 'patientToken', value: patientToken, enabled: true },
      { key: 'facilityAdminToken', value: facilityAdminToken, enabled: true },
      { key: 'doctorUserId', value: doctorUserId, enabled: true },
      { key: 'otherUserId', value: otherUserId, enabled: true },
    ]
  };

  fs.writeFileSync('scratch/temp-newman-env.json', JSON.stringify(tempEnv, null, 2), 'utf8');
  console.log('[3/5] Written temporary test environment for Newman');

  console.log('[4/5] Executing Newman against Security Audit folder...');
  const newmanCmd = 'npx newman run CareID-Staging.postman_collection.json --folder "Security Audit" -e scratch/temp-newman-env.json --reporters cli,json --reporter-json-export scratch/newman-report.json';
  
  exec(newmanCmd, async (err, stdout, stderr) => {
    console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('[5/5] Tearing down NestJS application...');
    await app.close();

    // Clean up temporary environment
    if (fs.existsSync('scratch/temp-newman-env.json')) {
      fs.unlinkSync('scratch/temp-newman-env.json');
    }

    if (err) {
      console.error('Newman execution failed with error code:', err.code);
      process.exit(err.code || 1);
    } else {
      console.log('Newman execution SUCCESSFUL!');
      process.exit(0);
    }
  });
}

run().catch(err => {
  console.error('Fatal error in runner:', err);
  process.exit(1);
});


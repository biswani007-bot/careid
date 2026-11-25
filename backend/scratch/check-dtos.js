const fs = require('fs');
const glob = [
  'src/modules/support/presentation/dto/create-ticket.dto.ts',
  'src/modules/support/presentation/dto/update-ticket.dto.ts',
  'src/modules/support/presentation/dto/ticket-reply.dto.ts',
  'src/modules/pet/presentation/dto/create-pet.dto.ts',
  'src/modules/pet/presentation/dto/update-pet.dto.ts',
  'src/modules/pet/presentation/dto/add-pet-vaccination.dto.ts',
  'src/modules/financing/presentation/dto/apply-financing.dto.ts',
  'src/modules/financing/presentation/dto/update-application-status.dto.ts',
  'src/modules/admin/presentation/dto/create-admin-user.dto.ts',
  'src/modules/admin/presentation/dto/update-admin-user.dto.ts',
  'src/modules/admin/presentation/dto/admin-reset-password.dto.ts',
  'src/modules/admin/presentation/dto/create-role.dto.ts',
  'src/modules/admin/presentation/dto/update-role.dto.ts',
  'src/modules/auth/presentation/dto/update-me.dto.ts',
  'src/modules/auth/presentation/dto/change-password.dto.ts',
  'src/modules/security/presentation/dto/create-api-key.dto.ts',
  'src/modules/insurance/presentation/dto/create-provider.dto.ts',
  'src/modules/referral/presentation/dto/update-referral.dto.ts',
];

glob.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`=== ${p} ===`);
    console.log(fs.readFileSync(p, 'utf8'));
  } else {
    console.log(`NOT FOUND: ${p}`);
  }
});


import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) { console.log('An existing .env was preserved. Set DEMO_MODE=true to use the demo.'); }
else { writeFileSync('.env', 'DEMO_MODE=true\nSESSION_SECRET='+randomBytes(48).toString('hex')+'\nAPP_ORIGIN=http://localhost:3000\nPORT=3000\n'); console.log('Demo configured. Run npm run dev, then open http://localhost:3000/auth'); }

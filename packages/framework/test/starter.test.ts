import type { LoggerFactoryConfig } from '@electron-boot/logger';
import { LoggerFactory } from '@electron-boot/logger';

LoggerFactory.configure({
  global: {
    level: 'all',
  },
} as LoggerFactoryConfig);

describe('/test/starter.test.ts', () => {
  it('should test setup and config111', async () => {
    try {
      const { Bootstrap } = require('../src');
      const main = await import('./fixtures/app-base-starter/imports');
      await Bootstrap.configure({
        imports: [main],
      }).run();
    } catch (e) {
      console.log(e);
    }
  });
});

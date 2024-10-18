import { Bootstrap, ConfigService } from "../src";
import * as MainModel from "./fixtures/app-base-config";
import type { LoggerFactoryConfig } from "@electron-boot/logger";
import { LoggerFactory } from "@electron-boot/logger";

LoggerFactory.configure({
  global: {
    level: "all",
  },
} as LoggerFactoryConfig);

describe("/test/starter.test.ts", () => {
  it("should test setup and config111", async () => {
    try {
      const container = await Bootstrap.configure({
        imports: [MainModel],
      }).run();
      const configService = await container.getAsync(ConfigService);
      const config = configService.getConfiguration();
      expect(config).toHaveProperty("hello", {
        a: 1,
        b: 4,
        c: 3,
        d: [1, 2, 3],
      });
    } catch (e) {
      console.log(e);
    }
  });
});

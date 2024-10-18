import { Configuration } from "../../../src";
import * as defaultConfig from "./config/config.default";

@Configuration({
  importConfigs: [
    {
      default: defaultConfig,
    },
  ],
})
export class MainConfiguration {}

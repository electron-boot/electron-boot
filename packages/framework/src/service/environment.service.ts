import { app } from "electron";
import { Singleton } from "../decorators/definitions.decorator";

@Singleton()
export class EnvironmentService {
  private environment!: string;
  getCurrentEnvironment(): string {
    if (!this.environment) {
      this.environment = app.isPackaged ? "production" : "development";
    }
    return this.environment;
  }
  isDevelopment(): boolean {
    return this.getCurrentEnvironment() === "development";
  }
}

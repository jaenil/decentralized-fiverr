import { inject } from "vitest";
process.env.API_URL = inject("apiUrl");

declare module "vitest" {
  export interface ProvidedContext {
    apiUrl: string;
  }
}

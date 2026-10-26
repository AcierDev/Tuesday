import { installClientErrorReporting } from "./lib/client-errors";

// Runs in the browser before the app hydrates (Next 15.3+).
installClientErrorReporting();

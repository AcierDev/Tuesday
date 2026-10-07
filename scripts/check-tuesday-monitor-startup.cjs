const {spawnSync} = require("node:child_process");
const {resolve} = require("node:path");

const STARTUP_CHECK = {
  timeoutMs: 10_000,
  successExitCode: 0,
  failureExitCode: 1,
  startMarker: "TUESDAY_MONITOR_START_CONFIRMED",
  clearedEnvironment: ["NEXT_RUNTIME", "NEXT_PHASE", "NEXT_PRIVATE_BUILD_WORKER", "VERCEL", "NETLIFY",
    "AWS_LAMBDA_FUNCTION_NAME", "FUNCTION_TARGET", "K_SERVICE", "MONGODB_URI", "GEMINI_API_KEY"],
};
const projectDirectory = resolve(__dirname, "..");

// Exercise the compiled Next hook: NEXT_RUNTIME is a build-time definition and
// need not exist in the host environment. Intercept the timer before source work
// starts, so this check cannot read customer data or call the model.
for (const enabled of [true, false]) {
  const environment = {...process.env, NODE_ENV: "production", ASK_TUESDAY_MONITOR_ENABLED: String(enabled)};
  for (const name of STARTUP_CHECK.clearedEnvironment) delete environment[name];
  const source = `
    const startMarker = ${JSON.stringify(STARTUP_CHECK.startMarker)};
    const expectedStart = ${JSON.stringify(enabled)};
    const failCode = ${STARTUP_CHECK.failureExitCode};
    global.setInterval = () => {throw new Error(startMarker);};
    require('./.next/server/instrumentation.js').register().then(
      () => {if (expectedStart) process.exitCode = failCode;},
      error => {if (!expectedStart || error?.message !== startMarker) process.exitCode = failCode;}
    );
  `;
  const result = spawnSync(process.execPath, ["-e", source], {
    cwd: projectDirectory, env: environment, encoding: "utf8", timeout: STARTUP_CHECK.timeoutMs,
  });
  if (result.error || result.status !== STARTUP_CHECK.successExitCode) {
    console.error(`Compiled Tuesday startup check failed (${enabled ? "enabled" : "disabled"}).`);
    process.exit(STARTUP_CHECK.failureExitCode);
  }
}
console.log("Compiled Tuesday startup checks passed (enabled and disabled).");

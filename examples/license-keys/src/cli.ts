/**
 * A tiny app with a paid feature.
 *
 *   npm run app -- activate XXXXX-XXXXX-XXXXX-XXXXX
 *   npm run app -- status
 *   npm run app -- pro "some text"      the paid feature
 *   npm run app -- deactivate           frees this machine's seat
 */
import { activate, check, deactivate } from "./license.js";

try {
  process.loadEnvFile();
} catch {}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "activate": {
    if (!args[0]) throw new Error("Usage: activate <license key>");
    const result = await activate(args[0]);
    console.log(result.ok ? "Activated. Pro is on." : `Not activated: ${result.reason}`);
    process.exitCode = result.ok ? 0 : 1;
    break;
  }
  case "status": {
    const { pro, why } = await check();
    console.log(pro ? `Pro (${why})` : `Free (${why})`);
    break;
  }
  case "pro": {
    const { pro, why } = await check();
    if (!pro) {
      console.log(`This is a Pro feature (${why}). Buy a key, then: activate <key>`);
      process.exitCode = 2;
      break;
    }
    console.log(args.join(" ").split("").reverse().join("")); // the "feature"
    break;
  }
  case "deactivate":
    await deactivate();
    console.log("Deactivated on this machine.");
    break;
  default:
    console.log("Commands: activate <key> | status | pro <text> | deactivate");
}

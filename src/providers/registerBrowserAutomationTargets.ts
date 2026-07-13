// The one place any real Browser Automation Target gets registered into
// this build of Forge. Importing this module for its side effect alone
// (see App.tsx) is the entire integration cost — mirrors
// registerProviders.ts (Execution Provider Framework) exactly.
import { listBrowserAutomationTargets, registerBrowserAutomationTarget } from "../hooks/browserAutomation";
import { chromeAutomationTarget } from "./chromeAutomationTarget";

// Guards against double-registration if this module is ever re-evaluated
// (e.g. during dev-time hot reload) without a full page reload — the
// Browser Automation Framework's own registry has no such guard built
// in, so the safeguard belongs here, at the one call site, the same
// reason registerProviders.ts's own guard lives there and not inside
// executionProviders.ts.
const alreadyRegistered = listBrowserAutomationTargets().some(
  (target) => target.id === chromeAutomationTarget.id,
);
if (!alreadyRegistered) {
  registerBrowserAutomationTarget(chromeAutomationTarget);
}

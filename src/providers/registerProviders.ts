// The one place any real Execution Provider gets registered into this
// build of Forge. Importing this module for its side effect alone (see
// App.tsx) is the entire integration cost — nothing about the Execution
// Provider Framework, Studio Queue, or Creative Pipeline changes to make
// a real provider available. A future MusicGPT or ACE adapter would add
// exactly one more import and one more guarded call here; nothing else in
// this file, or anywhere above the framework boundary, would need to
// change.
import { listExecutionProviders, registerExecutionProvider } from "../hooks/executionProviders";
import { sunoServiceAdapter } from "./sunoServiceAdapter";

// Guards against double-registration if this module is ever re-evaluated
// (e.g. during dev-time hot reload) without a full page reload — the
// Execution Provider Framework's own registry has no such guard built in,
// since it was never designed to be re-imported more than once, so the
// safeguard belongs here, at the one call site, rather than inside the
// framework itself.
const alreadyRegistered = listExecutionProviders().some((provider) => provider.id === sunoServiceAdapter.id);
if (!alreadyRegistered) {
  registerExecutionProvider(sunoServiceAdapter);
}

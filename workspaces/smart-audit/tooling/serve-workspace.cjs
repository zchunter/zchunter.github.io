// Local static server for the SmartAudit workspace.
//
// SmartAudit has no build step, but `index.html` now loads `src/*.js` as ES
// modules — and browsers block module imports over `file://` (CORS). Serving the
// workspace over local HTTP fixes that without introducing a bundler.
//
// Ported from workspaces/smart-audit-oldref/workspace/tooling/serve-workspace.cjs.
//
// Run with: npm run smart-audit:workspace   (override port with PORT=xxxx)

const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT || 4179);
const root = path.resolve(__dirname, "..");

app.use(express.static(root, { extensions: ["html"] }));

app.listen(port, () => {
  console.log(`SmartAudit workspace available at http://localhost:${port}/`);
});

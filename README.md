# Build Info Generation for Deployments

This project auto-generates a `build-info.js` file at build time to expose the build time to the frontend (for display in the dashboard and player UIs).

## Local Development

- If neither script is run, `build-info.js` will not be updated and may show default or outdated values.
- You can run either script locally to generate a fresh `build-info.js` for testing.

---

**Note:** The generated `build-info.js` is loaded by the dashboard and player UIs to display build information in the footer/header.

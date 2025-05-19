# sw25

## Git Info Generation for Deployments

This project auto-generates a `git-info.js` file at build time to expose branch, commit, build time, and deploy URL information to the frontend (for display in the dashboard and player UIs).

### Netlify Deployments

- Uses the script: `scripts/generate-git-info-netlify.js`
- Run with: `npm run generate-git-info-netlify`
- Environment variables used: `BRANCH`, `COMMIT_REF`, `DEPLOY_URL`
- Automatically run via the Netlify build command in `netlify.toml`.

### DigitalOcean App Platform Deployments

- Uses the script: `scripts/generate-git-info-digitalocean.js`
- Run with: `npm run generate-git-info-digitalocean`
- Environment variables used: `DOA_BRANCH`, `DOA_COMMIT_SHA`, `DOA_DEPLOYMENT_URL` (falls back to Netlify-style vars if not set)
- Add this script to your DigitalOcean App Platform build command to generate `git-info.js` before deployment.

### Local Development

- If neither script is run, `git-info.js` will not be updated and may show default or outdated values.
- You can run either script locally to generate a fresh `git-info.js` for testing.

---

**Note:** The generated `git-info.js` is loaded by the dashboard and player UIs to optionally display build and deployment information in the footer/header.

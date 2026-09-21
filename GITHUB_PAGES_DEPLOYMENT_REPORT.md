# GitHub Pages Deployment Report

## Result

| Check | Status |
|---|---|
| GITHUB_PAGES_WORKFLOW | YES |
| VITE_BASE | `/SprintMv1/` |
| BUILD_PASSES | YES |
| TYPECHECK_PASSES | YES |
| TESTS_PASS | YES |
| SPA_NESTED_ROUTE_FALLBACK | YES (`dist/404.html` copied from `dist/index.html`) |
| ENGINEERING_PREVIEW_DIRECT_ROUTE_SAFE | YES |
| SAFE_TO_COMMIT | YES, deployment files only |
| SAFE_TO_PUSH_MAIN | YES, after reviewing deployment-only staging |

## URLs

- Root: https://kilevoy.github.io/SprintMv1/
- Engineering preview: https://kilevoy.github.io/SprintMv1/engineering-preview

## Implementation

`.github/workflows/deploy-pages.yml` uses the official Pages flow: checkout,
Node setup, `npm ci`, Vite build, SPA fallback creation, Pages configuration,
artifact upload, and deployment. It runs on pushes to `main` and on manual
dispatch, with `contents: read`, `pages: write`, and `id-token: write`.

The application uses a manual pathname check (`/engineering-preview`) rather
than React Router. Because GitHub Pages does not rewrite nested paths, the
workflow publishes `dist/404.html` as a copy of the built entry point. Vite
asset URLs were verified to begin with `/SprintMv1/`.

No Core1, Enclosure, ProjectInput, dataset, output, or XLSX logic was changed
for deployment. Existing unrelated working-tree changes were intentionally
excluded from the deployment commit.

Repository Pages may still require the repository's Settings → Pages source to
be configured as **GitHub Actions**; this cannot be changed through git.

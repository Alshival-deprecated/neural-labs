# Release workflow

Neural Labs targets a weekly release. Cut a candidate Thursday and aim to release
Friday (America/Chicago); defer it if validation or staging fails. The human
maintainer reviews PRs, approves candidates, publishes releases, and operates hosts.
Agents work on task branches and prepare reviewable changes.

## Branches and merges

| Branch | Purpose | Merge policy |
| --- | --- | --- |
| `main` | Approved release history | PR from `release/*` or `hotfix/*`; merge commit |
| `dev` | Integrated work for the next cycle | Feature/fix PRs squash; synchronization PRs merge commit |
| `feature/*`, `fix/*` | One bounded change, branched from `dev` | PR into `dev`; delete after merge |
| `release/vX.Y.Z` | Frozen candidate from `dev` | Fixes by PR; promote to `main` after staging |
| `hotfix/*` | Urgent patch branched from `main` | PR into `main`, then synchronize into development |

Protected branches require `validate`, `browser`, and `branch-policy`, an up-to-date
base, and resolved review conversations. Force pushes and deletions are blocked.
There is no routine bypass and no second-person approval requirement while there
is one human maintainer. A green PR still needs the maintainer's review and merge.
`main` remains the default branch. Do not squash release or synchronization PRs:
merge commits preserve the shared ancestry. Rebase merging is disabled.

Start a new task from current `origin/dev` in a clean checkout/worktree. Never
switch a dirty checkout to another task or blindly stage every file. Before each
commit, review the diff for credentials/tenant data and run `make validate`.
Include user-visible changes under `CHANGELOG.md`'s Unreleased section.

## CI

`.github/workflows/ci.yml` runs on every PR into a protected branch and every push
to those branches, without path exclusions. It is also reused by release creation.
`bash bin/ci-install` installs lockfile dependencies. `make validate` performs the
existing build, unit, shell, and public-boundary checks plus release-tool tests.
CI supplies `TEST_DATABASE_URL` pointing to disposable PostgreSQL, so database
integration suites execute. The passwordless test service is confined to the
short-lived GitHub runner; it must never be copied into a tenant deployment.

The separate browser job installs pinned Playwright/Chromium, builds the desktop
and MCP, and runs `bash bin/ci-browser`. The script requires a working browser,
starts a loopback fixture server, runs all browser test files sequentially, and
cleans up its process. Explorer uses a separate ephemeral filesystem/API fixture.
These checks do not exercise production provider accounts or prove staging readiness.
Jobs have read-only repository permissions and no tenant or production secrets.

## Weekly candidate and release

1. Branch `release/v0.4.0` (or the next version) from approved `dev`. Keep new
   features on `dev`. Candidate fixes use their own branches/PRs into the candidate.
2. Set all five first-party package versions together: `console`, `control-plane`,
   `mcp`, `workspace`, `workspace/desktop`. For each use
   `npm --prefix <directory> version <version> --no-git-tag-version` and review both
   package and lockfile metadata. Do not change vendored miniPaint or CI tool versions.
3. Move the selected Unreleased notes into a dated changelog section. Update the
   README current release and links, the wiki index, and `wiki/releases/vX.Y.Z.md`.
   The record must contain `## Validation`, `## Deployment and rollback`, and
   `## Staging evidence`. Include changes, compatibility, migrations, tested source
   SHA, exact image digests, test outcomes, operator/date, backup and rollback results.
4. Run `node bin/release-check.mjs vX.Y.Z`, CI, and the staging checklist below.
   Open a candidate PR into `main`; the maintainer reviews evidence and merges with
   a merge commit. If the merge changes candidate contents, repeat staging for those
   contents before proceeding. Record the candidate SHA and the resulting main SHA.
5. In Actions, run **Draft release** on `main` with the version, full approved main
   SHA, and staging confirmation. It reruns CI, rejects changed main/version
   mismatches, creates a tag without overwriting an existing tag, and creates a draft.
   Only this final job has repository write access. Never dispatch it from another branch.
6. Review the draft notes and linked evidence, then publish in GitHub. Publishing
   does not deploy. Run the manual deployment checklist separately.
7. Open a PR from `main` into `dev` and merge with a merge commit. Synchronize any
   active candidate after a hotfix. Keep protected release branches as audit history.

Feature releases increment the minor version while the project is pre-1.0; fixes
increment patch. The first managed feature release is expected to be `v0.4.0`.
Do not publish it merely because workflow infrastructure is ready.

A duplicate tag fails closed. If draft creation fails after the tag was created,
inspect the failed run and verify the existing tag's SHA; create only the missing
draft with `gh release create <tag> --verify-tag --draft --notes-file <record>`.
Never delete, move, or reuse release tags. Correct a published release with a new patch.

## Staging and manual deployment

Staging does not exist yet. An operator must provision it explicitly before the
first managed product release; adding this workflow does not provision or modify hosts.
Use a separate host/environment, database, volumes, test accounts, and credentials.
Follow the existing container deployment guide and isolation rules. Keep Gateway
listeners on loopback and use the reviewed authenticated ingress. Never copy tenant
credentials/state or mount a production home/container socket into a test tenant.

- Build from a clean candidate checkout, identify every resulting service image,
  and store it in the operator's controlled registry. Record immutable registry
  digests in a private Compose override; deploy by digest with no build step.
  Automated image publishing is deferred. If no registry/digest is available,
  candidate promotion is blocked until the operator establishes one.
- Exercise login/passkeys, workspace readiness, private and team chat, files,
  skills, automations, and changed behavior with test identities. Verify tenant
  isolation and mobile layouts affected by the release.
- Take a staging backup and rehearse recovery with the previous image digests.
  Document schema compatibility: restoring an image does not downgrade a database.
  Prove any required state restore with disposable staging data.
- For production, check out the published tag in a clean dedicated checkout and
  verify its SHA. Review release notes and create a private pre-deployment backup.
  Promote the same tested image digests; do not rebuild at deployment or use mutable
  `:local`/`:latest` tags. Apply the private image override with an explicit operator
  Compose command using `up -d --no-build --pull never` after pulling the pinned images.
  The existing `bin/neural-labs update` rebuilds images and is a development path,
  not the approved-release promotion command.
- Verify service health and affected user journeys immediately. Record deployed
  source SHA, image digests, time, and outcome outside the public repository.
  On failure, stop promotion and use the rehearsed rollback/restore procedure.

## Bootstrap and protection administration

The one-time `release/github-workflow` infrastructure PR introduces CI and these
policies without declaring existing application work production-ready. Preserve
existing work on `feature/work-in-progress`; do not rewrite main or published tags.
Fast-forward `dev` to the current main history, then integrate application work by PR.
The accumulated product changes still require the `v0.4.0` candidate qualification.

After the infrastructure PR has passed CI and merged, apply the checked-in rulesets:

```bash
# Run once; on later edits use PUT against the existing ruleset ID instead.
gh api --method POST repos/Alshival-Ai/neural-labs/rulesets --input .github/branch-ruleset.json
gh api --method POST repos/Alshival-Ai/neural-labs/rulesets --input .github/tag-ruleset.json
gh api --method POST repos/Alshival-Ai/neural-labs/rulesets --input .github/main-ruleset.json
```

Read back the settings and verify all protected branches and required check names.
Use disposable `release/rehearsal-*` branches/PRs to verify failed checks block merge,
direct updates/deletion fail, and hotfix synchronization preserves ancestry. Do not
probe force pushes against real main or a published release. Monitor Actions and
release records each cycle. Ruleset changes must be deliberate operator actions;
repository validation never changes GitHub settings or host infrastructure.

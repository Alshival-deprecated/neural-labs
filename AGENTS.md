# Repository instructions

These instructions apply to the Neural Labs repository.

## Safety

- Never commit tenant credentials, provider keys, SSH keys, certificates, VPN files, or generated tenant state.
- Treat `*.example` files as public. Use obvious placeholder values only.
- Do not mount the host container socket, `/home/data-team`, `/root`, or another tenant's state into a tenant container.
- Do not add `privileged: true`, host networking, host PID/IPC namespaces, or unrestricted host devices.
- Keep the shared skill mount read-only. Personal skills belong in the tenant home.
- Bind Gateway ports to loopback until an authenticated ingress design is reviewed.
- Pin deployable images by immutable digest when promoting beyond development.
- Host changes require an explicit operator step; repository validation must remain non-mutating.

## Quality

- Run `make validate` before committing.
- Keep shell scripts compatible with Bash and pass `bash -n`.
- Keep tenant examples generic and free of personal data.
- Update the architecture decision records when a trust boundary changes.

## Version control and releases

- Follow [the release workflow](wiki/release-workflow.md).
- Start new tasks on `feature/*` or `fix/*` from current `origin/dev`, preferably
  in an isolated worktree. Preserve existing uncommitted work; never blindly stage it.
- Do not commit directly on `main`, `dev`, or `release/*`; use pull requests.
- Squash feature PRs into `dev`; use merge commits for release promotion and
  synchronization. `main` accepts only approved `release/*` or `hotfix/*` PRs.
- Keep `CHANGELOG.md` updated for user-visible work. Release versions, lockfiles,
  README, and release records must agree before tagging.
- Weekly releases need passing CI, recorded staging/rollback evidence, and human
  signoff. Agents may prepare a release; publication and host deployment are explicit
  operator actions. Never move a published version tag.

# ADR 0032: Separate development, release creation, and host deployment

Status: Accepted

## Context

Development has accumulated directly on main. The repository has version tags and
validation but no enforced GitHub merge or release gates. The maintainer works with
coding agents and needs stable main history without requiring a second human reviewer.

## Decision

Protect main, dev, and release branches with PRs and required validation, database,
and browser checks. Permit no routine bypass. Main accepts release/hotfix PRs;
features integrate through dev. Preserve existing history during the bootstrap.

GitHub-hosted CI gets read-only repository access, ephemeral fixtures, and no tenant
credentials or production access. PostgreSQL trust authentication exists only in the
isolated CI service. PR code never runs in a workflow with repository write permission.

A manually dispatched main-only workflow checks the approved SHA, version metadata,
and operator staging signoff, then reruns CI. Only its final job gets contents:write
for tag and draft-release creation. Tags cannot be changed or deleted. The maintainer
reviews and publishes the draft. GitHub never receives host deployment credentials;
image promotion, backups, migration review, and rollback remain explicit operator work.

## Consequences

Passing CI is necessary but does not certify live provider behavior or staging.
The first managed product release is blocked until separate staging and digest-pinned
image promotion are available. Release infrastructure may bootstrap before that gate.
Repository validation remains non-mutating with respect to GitHub and deployment hosts.

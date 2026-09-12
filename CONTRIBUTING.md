# Contributing

```bash
pnpm install
pnpm test
pnpm lint && pnpm type-check
```

Add a changeset (`pnpm changeset`) with anything that changes behaviour. It
becomes the changelog entry, and releases are cut from it.

## Adding or correcting a handle

Handles come from NPCI's published list of live third-party application
providers. To refresh from a newer copy:

1. Export the new list to `data/npci-tpap-list.csv`, keeping the columns
   `tpap,pspBank,handle,goLive`. Drop the original spreadsheet in `data/` too.
2. Run `pnpm sync:npci` to see what changed.
3. If it reports an app with no id, add one to `TPAP_TO_APP_ID` in
   `scripts/import-npci-list.mts`, then to `UpiAppId` and `UPI_APP_LABELS` in
   `src/apps.ts`. Ids are public API, so pick one that survives a rebrand, and
   never rename an existing one.
4. Run `pnpm sync:npci --write` and review the diff.

Two rules the script enforces, and a PR should not work around:

- **One handle, one app.** A handle that belongs to a PSP bank rather than an
  app (`@icici`, `@axisbank`) goes in `EXCLUDED_HANDLES`, not in the map.
  Mapping it produces a confident wrong answer on somebody's payment screen.
- **Nothing gets removed just because it left the list.** A handle dropping off
  NPCI's current TPAP list does not invalidate the VPAs already issued on it.
  Handles like this live in `HANDLE_TO_APP`, after the generated region, and
  the sync script never touches them.

If you are adding an app that has never been listed, say where the handle came
from: a VPA you hold, the app's own documentation, a support page.

## Adding or promoting a deep-link target

Targets in `src/targets.json` are marked `unverified` until someone has opened
the link on a real device. Add new ones as `unverified`; they are excluded from
`getUpiAppTargets` until promoted.

Promotion requires the procedure in
[docs/verify-upi-targets.md](docs/verify-upi-targets.md), on real hardware. A
simulator can only ever tell you a scheme is *un*claimed. "The app opened" is
not enough either. The payment screen has to come up with the payee and amount
already filled in. Say in the PR which device, OS version and app version you
tested on.

Verification reports for apps you do not maintain are just as useful as code.
Open an issue with the result and someone will land it.

After changing `src/targets.json`, run `pnpm docs:status --write` to
regenerate the README's status table -- CI runs `pnpm docs:status` and fails
if it's stale.

## Scope

This package covers handle detection and link construction. It does not ship
icons (they are trademarks it has no licence to redistribute), rankings of
which apps to show, or anything that talks to the network.

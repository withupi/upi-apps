---
"@withupi/upi-apps": minor
---

Add `UPI_HANDLES` and `getUpiHandleInfo()`: for every handle the package knows, the
app (or `null` for the bank-generic `EXCLUDED_HANDLES`), the PSP bank NPCI lists
for it, and its go-live month as `YYYY-MM`. `getUpiHandleInfo` also accepts a bare
handle (`"ybl"`) or `"@ybl"`, not just a full VPA. Both tables are regenerated
together by `pnpm sync:npci`, which now normalises NPCI's bank spellings
("NSDL Bank" becomes "NSDL Payments Bank").

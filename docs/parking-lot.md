# Parking lot

Ideas and open questions that are not scheduled. Newest first.

## An empty SCAN result does not say why it is empty

**Seen:** SCAN with Options, a Default model key, a BIM model selected in the dropdown. The answer was HTTP 200 with
zero rows, which looks like "this element has no properties". With the Default model selected the same key returned
its row.

**What the server does** (from `op-scan.go` in dt-server; not yet run on STG):

- `/scan` with `keys` looks the keys up as rows of the model in the URL. A key that is not a row of that model is
  skipped silently: no error, no warning, the body is just `["v1"]`.
- A malformed key (wrong length) is different: `400 Failed to parse key list query`.
- All of these look the same in the response:
  1. the key is not a row of this model
  2. the row exists but has nothing in the requested families or columns (empty rows are left out by default)
  3. the row is deleted (left out unless `includeDeleted`)

**How to tell them apart:** re-scan with `includeEmpty: true` and `includeDeleted: true`. A row that exists comes back
even with no values, a key that is not in the model still returns nothing.

**Idea:** in the key-based SCAN stubs (SCAN with Options, SCAN with Qualified Props), when keys were given and fewer
rows come back than keys, run that re-scan and print one line per key: not a row of this model (and, if found, the
model that has it, as the edge-case stubs already do), exists but empty in the chosen families, or deleted. One extra
scan, only in that case. Also a good place to say that an empty result is not an error.

**To verify first:** that `includeEmpty: true` returns an existing row with no values (read from `mdb-bson.go`,
not observed).

## Still unverified on STG

- `makeassets` through the Tandem host
- ticket create and update, and the `x:loc` format copied from the host asset
- V3 stream create, host and delete
- the `useFullKeys` flag of the model history request for V3 (the neutral model-history stub is not updated)

## Not done

- V2 `assignClassification` template format mismatch
- README and QUICKSTART for STG and the V2 | V3 switch (including the Tandem-host v3 URL), an AGENTS.md for the
  testbed, and a note that `tandem/constants.js` has diverged from tandem-sample-stats
- folding the real results of the API Edge Cases stubs into `write-calls-findings.md`

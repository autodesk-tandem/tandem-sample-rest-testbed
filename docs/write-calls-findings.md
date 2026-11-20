# Writing to Tandem with `mutate`: findings, guards, recommendations

Scope: the write STUBs of `tandem-sample-rest-testbed` (V2 and V3 schema), STG, 3-legged token.
Sources: dt-server code (`op-mutate.go`, `op-mutate-v3*.go`, `handle-modeldata.go`, `dt-schema.go`), the viewer SDK (`dt-schema.js`, `DefaultModel.js`), dt-client, `tutorial-rest` (Jan's samples).

**Status labels.** *Tested*: confirmed on STG by running it. *Code*: read in dt-server or the viewer, not exercised. *Mock*: exercised only against mocked responses. *Assumed*: our inference, to confirm.

## 1. Endpoints

| Call | V2 | V3 |
|---|---|---|
| Change existing elements | `POST /v1/modeldata/{model}/mutate` (upsert) | `POST /v3/modeldata/{model}/mutate` (update only, existing rows) |
| Create element | `POST /v1/modeldata/{model}/create` | same `/v1/.../create` (there is no `/v3` route). Default model only. |
| Create asset from BIM element | not used | `POST /v3/modeldata/{bimModel}/makeAssets` (`/v1/makeAssets` has V2 semantics) |

- Only the two `/v3` routes exist. *Code*.
- **`/v3` is not behind the APS gateway.** `developer-stg.api.autodesk.com/tandem/v3/*` answers 404, so the browser reports a CORS error. The calls go to the Tandem host instead (`https://tandem-stg.autodesk.com/api/v3`, `tandemV3BaseURL` in `config.js`). *Tested* (mutate).
- That host accepts the same Bearer token but its CORS preflight does not allow the `Region` header, so V3 calls send none. *Tested* on STG (US only).
- `/v1/mutate` on a V3 twin still works but is a compatibility path: it upserts, and it silently retargets a write on a BIM element to its asset and remaps `z:` ids. The V3 stubs never use it. *Code*.
- Annotated rate limit on `mutate` and `create`: 600 (default, per API key). Batch changes (keys and muts are parallel arrays).

## 2. Request shape

- `keys` and `muts` are **parallel arrays**: `muts[i]` applies to `keys[i]`. Several changes to one element repeat its key. Lengths must match. *Code*.
- Mutation: `[action, family, column, value]`. Actions: `i` insert/set, `c` insert if different, `d` delete the cell, `a` delete the row (soft delete). Always use `MutateActions`, `ColumnFamilies`, `ColumnNames`, `QC`.
- Keys. V3: one 24-byte key (32 base64 chars), the first 4 bytes are `ElementFlags`; never convert. The server rejects any other length. V2: scans return 20-byte short keys, other endpoints want 24-byte long keys.
- `create` is not a mutate: every mutation is an insert of one column; the response carries the new `key`. A new stream also needs `resetstreamssecrets`.

## 3. Where data may be written

| Rule | Basis |
|---|---|
| V3: write only to the **default model**. User-defined `z:` properties and overrides (`n:!n`, `n:!v`, ...) go to the asset/element there, never to a BIM model. | Server enforces it for `z:` only. *Code* |
| `z:` is accepted only on Location, Room, GenericAsset, Ticket, Stream (and FamilyType, temporary). | `canHoldDtProperties`. *Code* |
| Source family `r:` is superuser only. | `isValid`. *Code* |
| The server does **not** stop an override column being written to a BIM model in V3. | *Code*; no check found |
| A BIM element is written through its asset. If it has none, `makeAssets` creates one (409 if it already hosts one, 204 if nothing created). BIM element ↔ asset: `QC.HostOfAsset` / `QC.BimElmOfAsset`. | *Code*. makeAssets via the Tandem host: *Mock* |
| `z:` ids belong to a model's schema. The id of a BIM model is not valid in the default model. | *Code* |
| V2: `z:` properties live on the element in the model that owns it. Lists must be scoped to the selected model. | Merged lists gave wrong ids. *Tested* |

## 4. What is writable

The server rejects a direct write to `n:n`, `n:z`, `n:u`, `n:v` and `l:l` (use the override column), `n:ia` always, and the protected family. A property is writable if:

- family `z`, without the Stream flag (flag 4), not read-only (flag 8), and
- not a metric parameter: category `Tandem Metrics`. The server sets the Stream flag only for parameters mapped to a data source, so calculated-stream (metric) parameters carry no flag. Parameters of category `Streams` without a mapping cannot be told apart. *Assumed*
- built-ins: only the override column (`!` prefix) or, for the Standard family, a column with no override twin (e.g. room height `n:he`). Override pairs known to the viewer (`QCOverrides`): TandemCategory, UniformatClass, Classification, Level, Name, SystemClass, Elevation, Rooms, XRooms, Location.
- never `r:`, hidden (flag 1), `n:tol` (deprecated), or types other than Boolean, Integer, Double, Float, String, DateTime.
- not the ticket columns `n:pr`, `n:od`, `n:cd`: see section 6.

Implemented in `isWritableAttribute()` (`schemaCache.js`) and used by the dropdowns and by the by-name and by-id lookups. The lookups prefer the writable twin (`Common | Name` is both `n:n` and `n:!n`).

## 5. Values

- Convert the typed text to the attribute's data type (`typedValueFor`): Boolean to `true/false`, Integer to a whole number, Double/Float to a number, StringList to an array, else string. A non-number or a fraction for an Integer is refused.
- A String attribute with `allowedValues.list` (e.g. Priority) is picked from the list.
- Dates follow the attribute `forgeSymbol`: `date` is `YYYY-MM-DD`; `dateAndTime` is `YYYY-MM-DDTHH:mm:ss`; `isoDate` and others are UTC with `Z`. Ticket Open/Close dates cannot be in the future (the app's rule). Use the **local** date: the UTC date is already tomorrow in the evening in US time zones.
- Clearing a value uses action `d`, not an empty string.
- `n:!n`-style overrides: read the override first, then the base (`OName ?? Name`).

## 6. Tickets

A ticket is an element of the default model with `ElementFlags.Ticket` (0x01000007), `TC.Ticket` as category and a Parent xref (`x:p`) to its host. In V3 the host is an asset, room or level of the default model, and the ticket copies the host's `x:!loc` / `x:loc`. V2: the host is a BIM element (model + long key); we do not copy rooms and level, the app does.

- **Setting Priority/Open Date on any other element stores the value and nothing shows it** ("No Tickets" in the app). *Tested*
- Guards: V3 `mutateV3` refuses `n:pr/od/cd` on a key that is not a Ticket; `updateTicket` checks the flag (V3 from the key, V2 by scanning); SET Property does not offer the columns. V2 SET by qualified id cannot check the type.
- Use Create Ticket / Update Ticket. Close sets Close Date to today, reopen deletes it. *Mock*.

## 7. Streams

- Flags differ: V2 `StreamV2` 0x01000003, V3 `StreamV3` 0x01000000 (same value as a V2 family type).
- A stream's host is linked by `x:p` and must be in the default model in V3: BIM hosts are followed to their asset. For a room host also set `x:r` and the level `l:l`.
- Stream settings (`n:s`) cannot be changed with mutate (server refuses); use the stream-config API.
- Delete is `a` (soft delete) and works on **any** element, so the stub checks that every key is a stream first.

## 8. Guards in the testbed

| Guard | Where |
|---|---|
| Default model only; V3 write UI shows no model choice | `assertDefaultModel`, `mutateV3`, `defaultModelOnly` in `stubUI.js` |
| 24-byte keys, no conversion | `isV3Key`, `parseV3Keys`, `mutateV3` |
| No `r:` write; `z:` only on allowed types; ticket columns only on tickets; known action | `mutateV3` |
| keys/muts same length | `mutateV3` |
| BIM xref/URL resolved to its asset, conversions logged | `parseElementRefs`, `resolveAssetTargets` |
| Existence check in the default model, hint to give an xref | `resolveAssetTargets` |
| Stream-only and ticket-only operations check the flag | `assertStreamKeys`, `assertTicketKeys` |
| Writable-only dropdowns and lookups; read-only id refused; unknown `z:` id refused | `isWritableAttribute`, `findWritableAttribute`, SET stubs |
| Typed values and dates; priority validated | `typedValueFor`, `ticketCommon.js` |
| Per-model property lists (V2) | `stubUI.js` |

## 9. Not yet tested on STG

makeAssets through the Tandem host; create and update ticket; create stream, host assign and remove, delete (V3); the by-name SET path with typed dates and lists; whether `x:loc` accepts the concatenated base64 string we send (Jan's sample passes the scan value as is); the V3 `useFullKeys` flag for model history.

## 10. Recommendations

For the server and platform team (proposals):
1. Make the V3 mutate reject override columns on a model that is not the default one, as it does for `z:`.
2. Reject `n:pr/od/cd` on elements that are not tickets, or document that they are ignored.
3. Expose writability in the schema (or the `QCOverrides` pairs) so clients need not hardcode them, and set a flag on calculated-stream (metric) attributes.
4. Route `/v3` through the gateway, or document the Tandem host and allow the `Region` header in its CORS preflight.
5. Document `/create` for V3, the `makeAssets` status codes, and that `/v1/mutate` retargets to assets on V3 twins.

For developers writing against Tandem:
1. Write to the default model only; give BIM elements an asset first.
2. Prefer the explicit V3 endpoints; never send a V2-style short key to V3.
3. Create tickets and streams with `create` and the full set of columns; changing a property does not change the element type.
4. Send typed values and the date format of the attribute; check `allowedValues`.
5. Take override pairs from the viewer's `QCOverrides`; offer only writable properties to users.
6. Check the element type before type-specific writes and before `a` (delete row).
7. Batch mutations; one request per element wastes the rate limit.

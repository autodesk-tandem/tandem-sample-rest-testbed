# API Edge Cases (V3): test results

Results of running the **API Edge Cases (V3)** stubs of the testbed against STG.
These stubs deliberately skip the guards of the regular stubs, so each run shows what the server does with the request as sent.
The goal is a factual record of current behavior, for the team to decide what to change.

The claims these runs check are in [write-calls-findings.md](write-calls-findings.md).
A result here turns a claim labelled *Code* there into *Tested*.

The summary below is the short version.
Each finding links to the section with the runs, the requests, the server answers and the code references behind it.

## Summary

**In short:** the `/v3` write guards for user-defined (`z:`) properties and protected columns work, and say clearly why they refuse.
The problems are in what the server accepts without question, and in two places where data ends up split across a BIM element and its asset:

1. **Clearing an override hides the original value, with no way back in the Tandem app.**
2. **Making an asset from a BIM element does not move the streams hosted on it**, so the asset shows no connection.
3. **Overrides on a BIM element and on its asset drift apart**, so one wall can show two names or two categories.

### Findings

| # | Finding | Impact | Reachable from the Tandem app | Evidence | Details |
|---|---|---|---|---|---|
| 1 | A deleted or cleared override still reads as `""` and wins over the original value | High: element shows no name or no category | Yes, by clearing a Name or "Clear Selection" on a Tandem Category | *Tested* for Name and Tandem Category | [Section 3](#3-read-only-column-with-or-without--override), runs 3.2, 3.4, 3.6 |
| 2 | makeAssets does not retarget references to the BIM element, so a hosted stream stays on the BIM element | High: the asset loses its streams | Yes, a normal workflow | *Tested* for a stream host | [Section 4](#4-stream-host-on-a-bim-element-without-asset-check), run 4.3 |
| 3 | Overrides are accepted on BIM elements, and are not synced with the asset made from it | Medium: one wall, two names or categories | Likely: the BIM element's panel shows the same editable fields (not tested from the app) | *Tested* through the API for Name and Tandem Category | [Section 3](#3-read-only-column-with-or-without--override), runs 3.3 to 3.6 |
| 4 | `/v1` retargeting looks up a `z:` id without checking its family | Medium: a write could land on another property | No, REST `/v1` only | *Tested* (safe failure), *Assumed* (wrong write) | [Section 2](#2-user-defined-property-without-asset-check), run 2.7 |
| 5 | No value checks: ticket columns on any element, dates not validated, Priority list not enforced | Low to medium: junk data the app displays as real | No, the app's controls send valid values | *Tested* | [Section 1](#1-ticket-columns-on-a-non-ticket-element), runs 1.1 to 1.6 |

### 1. A cleared override hides the original value

- **What happens:** an override such as the Name override (`n:!n`) or the Tandem Category override (`n:!z`) is removed in one of two ways. A client deletes it (`d`), or the Tandem app writes an empty string. Either way, SCAN returns the cell as `""`. Both the app and the usual client code (`override ?? original`) take an empty override as the value, so the element shows **no name or no category**, although the original (`n:n`, `n:z`) is still stored.
- **Why it matters:** the Tandem app's own controls cause it. Clearing a name and choosing "Clear Selection" on a Tandem Category both write `""`. Once that's done, the app offers no way to get the original value back. The empty name also shows up in other places, for example as an empty link label on the BIM element's panel.
- **Likely scope:** every override pair (Classification, Uniformat Class, Level, System Class, ...). *Assumed* beyond Name and Tandem Category.
- **Fix options:**
  - The server returns a deleted or empty override as no value, which fixes every client at once.
  - Alternatively, every client skips empty overrides (`||` instead of `??`), and the app sends a delete instead of `""`. The app change alone is not enough, since a deleted cell also reads as `""`.
  - Our own samples need the client fix either way: `nameOf()` in the testbed, and the V3 name lookups in `tandem-sample-stats`.

### 2. makeAssets leaves streams on the BIM element

- **What happens:** a stream hosted on a BIM element keeps pointing at that element after an asset is made from it. The new asset's panel shows "No Assignable Connections", while the BIM element still shows the stream.
- **Why it is inconsistent:** the V2 to V3 upgrade does the same split but retargets every reference to the split BIM element onto its asset. Runtime makeAssets (`op-make-assets-v3.go`) does not. So the same wall ends up in different shapes depending on how its asset was made.
- **Not a bug on its own:** hosting a stream on a BIM element that has no asset. The server and the app both accept it, and the upgrade also produces it. See [Is a BIM element a valid stream host in V3?](#is-a-bim-element-a-valid-stream-host-in-v3)
- **Likely scope:** any other reference to the BIM element from the default model, since the upgrade retargets all of them. *Assumed*.
- **Fix options:**
  - Retarget the references in makeAssets, as the upgrade does. This also repairs streams hosted before the asset existed.
  - Client-side resolution can't help here, because the host was valid when it was written.

### 3. Overrides on a BIM element and its asset drift apart

- **What happens:** the server accepts overrides on a BIM element in its BIM model. makeAssets copies the overrides onto the new asset, so from then on there are two independent copies. Edit one, and the wall shows a different name or category depending on which panel is open.
- **Made worse by:**
  - The BIM element's panel is also headed "Asset Properties", so a user can't tell which element they are editing.
  - There is no way to undo makeAssets.
- **Fix options:**
  - Refuse overrides on a BIM element that hosts an asset, or route them to the asset (recommendation 1 of the [findings](write-calls-findings.md)).
  - Or decide which copy wins and show only that one.

### 4. `/v1` retargeting ignores the property family

- **What happens:** for a BIM element that hosts an asset, `/v1/mutate` retargets a `z:` write to the asset and remaps the property id. The id is looked up by its short name alone, so `z:Fw` was read as the Revit source property `r:Fw` "Mechanical / Roughness". The request failed only because the default model has no such property.
- **Risk:** where a matching property exists, the value would most likely be written to the wrong property with HTTP 200. *Assumed*, from the code.
- **Fix:** check the family in the remap (`DtPropRemapper.Remap`, `GetAttributes`).

### 5. No checks on values

- Ticket columns (`n:pr`, `n:od`, `n:cd`) are stored on any element type. The app's properties panel then shows a Tickets group for an element its Tickets panel doesn't list.
- Dates are not validated at all: `baddate` and `9090-88-77` are both stored.
- Priority is not checked against its list (Trivial to Critical). An unknown value becomes its own group in the Tickets panel, with a generated colour that can look urgent (red).

### What works

- **`z:` properties on `/v3`:** refused on element types that cannot hold them, and outside the default model, each with a clear 400. `/v1` refuses them on a BIM element with no asset. Runs 2.1 to 2.5.
- **Protected columns:** `n:n`, `n:z`, `n:u`, `n:v` and `l:l` refuse a direct write, with "use override instead". Run 3.1.
- **The supported paths:** a `z:` property on an asset in the default model (runs 2.4, 2.6), an override on an asset (run 3.2), and a stream hosted on an asset (run 4.2).

### Smaller points

- The type check reads the element type from the key, so a key sent to the wrong model is refused as "not allowed on this element type", with no hint about the model. Run 2.2.
- The `/v1` error in run 2.7 names a property of another family without saying so. Run 2.7.
- The Tandem app sends `?v3=true` on mutate. That switch forces the data model on any request, so `?v3=false` would run V2 logic against a V3 facility. *Code*, not tested. Run 3.2.

### Not covered yet

- Other references to a BIM element that becomes an asset, beyond the stream host (finding 2).
- The empty-override effect on Classification, Uniformat Class and Level (finding 1).
- Deleting an asset. `x:ha` on the BIM element would most likely keep pointing at it, which blocks a new makeAssets. *Assumed*.
- `?v3=false` on a V3 facility.
- `skipOverrideCheck`: out of scope, as the team considers it a private API.

### Test data left on STG

| Element | Left as |
|---|---|
| Asset `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA` (wall, "Overwritten val 1") | `n:pr = Trivial`, `n:od = 2026-11-18`, `n:!z = ""`, `z:Fw = asdflj` |
| Asset `AQAABb0Hs6r7hkampshcOdyrR28AAAAA` (wall) | `n:!n = ""`, `n:!z = ""` |
| BIM element `AAAAACSELi_hCUJBrw7O42GpkVgABEnp` | `n:!n = Bozo`, `n:!z = Q.Se` |
| BIM element `AAAAAK4nDhMSMkSMk5Htf-PTpSoAA_lk` | `n:!z = Q.Se` |
| Ticket `AQAAB6BcR37AyUsgjnlSQ1zxGc0AAAAA` (TestTicket3) | `n:pr = Bozo` |
| Stream `AQAAAHsiqxh36kg5q2ArRvti89UAAAAA` (Test1) | Hosted on the asset `AQAABbSAvFN…` (run 4.2) |
| The stream and BIM wall of run 4.3 | Stream still hosted on the BIM element, which now hosts an asset. Keys not recorded |

## Environment

| | |
|---|---|
| Environment | STG (`?env=stg`) |
| Schema switch | V3 |
| Branch | `jma-v3-migration` |
| Date | Nov 23, 2026 |

## How to read a run

Each run lists the options used, what the server answered, and what changed on the element.
**Observed** is only what the stub output shows.
**What this means** is our reading of it, and points to the related section of the findings.

---

## 1. Ticket columns on a non-ticket element

Writes a ticket column (`n:pr` Priority, `n:od` Open Date, `n:cd` Close Date) on an element of the default model that is not a ticket.

### Run 1.1: Priority on an asset (a wall)

**Options**

| Option | Value |
|---|---|
| Element | Asset in the default model, a Basic Wall, named "Overwritten val 1" |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset) |
| Ticket column | Priority (`n:pr`) |
| Value | `High` |
| Restore afterwards | No |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate` on the Tandem host, mutation `["i", "n", "pr", "High"]`.
- Server answered **HTTP 200** in 501 ms, body `{ "timestamp": 1795455990191 }`.
- Scan before and after:

  | Column | Before | After |
  |---|---|---|
  | `n:pr` | (empty) | `High` |
  | `n:n` | Basic Wall | Basic Wall |
  | `n:!n` | Overwritten val 1 | Overwritten val 1 |

- The element is not listed by GET Tickets.
- Not restored. The value stays on the element and in the model history.

**What this means**

- `/v3/mutate` does not check the element type before writing a ticket column: it accepted and stored `n:pr` on a GenericAsset.
- The value is stored and partly shown. The Tandem app shows it in the properties panel of the element, under a Tickets group, but its Tickets panel does not list the element: the app identifies a ticket by its element flag (`0x01000007`), which is part of the key and cannot change. See run 1.5.
- This confirms on `/v3/mutate` the *Tested* claim in [findings section 6](write-calls-findings.md#6-tickets), and supports recommendation 2 (reject `n:pr/od/cd` on non-tickets, or document that they are ignored).
- To undo: send `["d", "n", "pr", ""]` to this key.

### Run 1.2: Open Date on the same asset, then restore

**Options**

| Option | Value |
|---|---|
| Element | Same asset as run 1.1 (Basic Wall, "Overwritten val 1") |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset) |
| Ticket column | Open Date (`n:od`) |
| Value | `2025-12-13` |
| Restore afterwards | Yes |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "n", "od", "2025-12-13"]`.
- Server answered **HTTP 200** in 451 ms, body `{ "timestamp": 1795456244181 }`.
- Scan before and after: `n:od` went from (empty) to `2025-12-13`. `n:n` and `n:!n` unchanged.
- The element is not listed by GET Tickets.
- Restore: there was no value before, so the stub deleted the cell with `["d", "n", "od", ""]`. **HTTP 200** in 97 ms. The scan after shows `n:od` empty again.
- The history keeps both changes: the cell is restored, the log is not rewritten.

**What this means**

- Same result as run 1.1 for a date column: no element type check, value stored, not shown anywhere.
- The value was in the format Tandem uses for ticket dates, `YYYY-MM-DD` (what the testbed, `tutorial-rest` and the viewer SDK write).
- The server does not validate the format: dt-server stores a `DateTime` value (`AtDateTime`, "ISO 8601 date") as a plain string, the same branch as `String` in `attribute.go`. A malformed date would most likely be accepted as well. *Code*, not run.
- Deleting a cell (`d`) through `/v3/mutate` works, so the restore path of the edge-case stubs works.

### Run 1.3: a malformed Open Date, then restore

**Options**

| Option | Value |
|---|---|
| Element | Same asset as runs 1.1 and 1.2 |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset) |
| Ticket column | Open Date (`n:od`) |
| Value | `baddate` |
| Restore afterwards | Yes |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "n", "od", "baddate"]`.
- Server answered **HTTP 200** in 496 ms, body `{ "timestamp": 1795456464152 }`.
- Scan before and after: `n:od` went from `""` (an empty string, see below) to `baddate`. `n:n` and `n:!n` unchanged.
- The element is not listed by GET Tickets.
- Restore: the stub wrote the previous value back with `["i", "n", "od", ""]`. **HTTP 200** in 167 ms. The scan after shows `n:od` as `""` again.

**What this means**

- **The server does not validate dates.** `baddate` was accepted and stored in a `DateTime` column. This confirms what the code suggested in run 1.2: `AtDateTime` values are stored as plain strings.
- **A deleted cell still comes back from SCAN, as an empty string.** Before run 1.2 the scan did not return `n:od` at all (the stub shows `(empty)`). After run 1.2 deleted it with `d`, the scan returns `n:od` with the value `""`. A client cannot tell "never set" from "deleted" without the history.
- This matters for code that falls back with `??`, which only skips `null` and `undefined`. For example `element[QC.OName]?.[0] ?? element[QC.Name]?.[0]` would show an empty name for an element whose name override was deleted, instead of falling back to the name. Code that tests truthiness (`!t[QC.CloseDate]?.[0]`) is not affected. *Assumed* for `n:!n`; seen here for `n:od` only.
- Because the stub saw `""` as a previous value, the restore inserted `""` instead of deleting the cell. The result looks the same in the scan; dt-server converts an empty string to no value (`ValueFromJson` in `attribute.go`). Fixed in the stubs after this run: a previous value of `""` is now restored with a delete.

### Run 1.4: an impossible Open Date in date shape, then restore

**Options**

| Option | Value |
|---|---|
| Element | Same asset as runs 1.1 to 1.3 |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset) |
| Ticket column | Open Date (`n:od`) |
| Value | `9090-88-77` (`YYYY-MM-DD` shape, but month 88 and day 77) |
| Restore afterwards | Yes, with the restore fix from run 1.3 |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "n", "od", "9090-88-77"]`.
- Server answered **HTTP 200** in 636 ms, body `{ "timestamp": 1795456768631 }`.
- Scan before and after: `n:od` went from `""` to `9090-88-77`. `n:n` and `n:!n` unchanged.
- The element is not listed by GET Tickets.
- Restore: "There was no value before: deleting the cell". The stub sent `["d", "n", "od", ""]`, **HTTP 200** in 155 ms. The scan after shows `n:od` as `""`.

**What this means**

- **No date validation of any kind:** neither the format (run 1.3) nor the calendar (this run). Whatever string is sent is stored.
- **Confirmed: a deleted cell comes back from SCAN as `""`.** This run deleted the cell with `d`, and the scan after returns `""`, as it did before the run.
- The restore fix works: a previous value of `""` is now undone with a delete.

### Run 1.5: what the Tandem app shows (observation, no request sent)

The facility has no real ticket: GET Tickets finds none among the 286 rows of the default model, whether ticket is read from the key flags or from `n:a`.
But an element of the facility carries ticket columns. A later scan with history (run 3.6) showed which one: the wall asset of runs 1.1 to 1.4, `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, with Priority `Trivial` written at 10:02:32 and Open Date `2026-11-18` at 10:02:40 on the day of these runs, 8 seconds apart and right after run 1.4. Not left over from an earlier test, as first thought. The same history shows one more stub run that is not recorded here: Open Date `2026-08-99`, written and deleted at 09:58:11.

**Observed in the Tandem app (STG)**

- **Properties panel** of the element: a **Tickets** group with Open Date `11/18/2026` and Priority `Trivial` (with its colour and a dropdown to change it).
- **Tickets panel**: "Tickets aren't connected in this facility yet", with a "See how to connect" button.

**What this means**

- Ticket columns written on a non-ticket element are **not invisible**: the properties panel shows them, and offers to edit the Priority, as if the element were a ticket.
- The Tickets panel goes by the element flag, so it does not list the element. For a facility with no real ticket it even says tickets are not connected.
- So the same element looks like a ticket in one panel and not in the other. This is the user-facing cost of the missing server check, and supports recommendation 2 of the findings.
- Still to do: delete the `n:pr` and `n:od` cells of that asset, if a clean element is wanted.

### Run 1.6: a Priority outside the list, on a real ticket

The control case: the element is a ticket, so only the value is wrong.

**Options**

| Option | Value |
|---|---|
| Element | A ticket created with Create Ticket, named "TestTicket3" |
| Element key | `AQAAB6BcR37AyUsgjnlSQ1zxGc0AAAAA`, flags `0x01000007` (Ticket) |
| Ticket column | Priority (`n:pr`) |
| Value | `Bozo` |
| Restore afterwards | No |

**Observed**

- The stub warned "This key IS a ticket, so it is not the edge case" and sent the request anyway.
- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "n", "pr", "Bozo"]`.
- Server answered **HTTP 200** in 379 ms, body `{ "timestamp": 1795457779422 }`.
- Scan before and after: `n:pr` went from `High` to `Bozo`. `n:n` (TestTicket3) and `n:!n` (empty) unchanged.
- Not restored: the ticket's Priority is now `Bozo`. To undo, write `High` back.

**What this means**

- **The server does not check Priority against its list.** dt-server defines `n:pr` as a `String` with a list of allowed values, `Trivial`, `Low`, `Medium`, `High`, `Critical` (`QCPriority` in `btstore/dt-schema.go`), but the list is not enforced on write.
- The list is metadata for clients only. The viewer picks the Priority colour from a palette keyed by these five values (`PALETTE_TICKET_PRIORITY` in `facets/Facets.js`).
- The stub's "the expected case" message covers the element type only, not the value.

**Observed in the Tandem app (STG)**

- The Tickets panel lists TestTicket3 in its own Priority group, **`Bozo`**, labelled `Bozo` and `OPEN`, with a **red** dot.

**What this means**

- The app shows any Priority string as is, and groups tickets by it: every typo becomes a new Priority group.
- The red is not a Priority colour. `Bozo` has no entry in the priority palette, so the viewer falls back to a generated colour (`FacetsForScope.js`), which here happens to be a red close to High and Critical (`#DD2222`, `#FF0000`). A junk Priority can therefore look urgent. *Code* for the fallback; the Tickets panel itself is in the Tandem app, not in this workspace.

---

## 2. User-defined property without asset check

Writes a user-defined `z:` property on an element, without checking that the element is an asset of the default model.

### Run 2.1: a BIM element that has no asset, sent to its BIM model with `/v3/mutate`

**Options**

| Option | Value |
|---|---|
| Model | A BIM model, `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` (not the default model) |
| Property | JMA Test \| Param A, `z:Fw` in the default model's schema, data type 20 (String). Not in the BIM model's schema. |
| Value | `asdf` |
| Element key | `AAAAABeW6wC4sE6njVQEbQjNg6QABEMA`, flags `0x00000000` (SimpleElement): a BIM element, no asset made from it (`x:ha` empty) |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Use the asset instead | No |
| Restore afterwards | Not needed |

**Observed**

- Request: `POST /v3/modeldata/{bimModel}/mutate`, mutation `["i", "z", "Fw", "asdf"]`.
- Server answered **HTTP 400** in 412 ms: `{ "title": "Bad Request", "detail": "custom properties are not allowed on this element type" }`.
- Scan after: no cell changed on the element.

**What this means**

- **`/v3/mutate` refuses `z:` properties on BIM elements**, and says why. This is the guard the findings recommend, and it is in place.
- The check is on the element type, read from the first 4 bytes of the key (`canHoldDtProperties` in `btstore/op-mutate-v3.go`). Allowed: streams, locations, rooms, generic assets, tickets, and family types (the code marks these as temporary, "until we deprecate type elements tagging"). Everything else, including every BIM element, is refused.
- A second check refuses `z:` writes to any model other than the default model ("custom properties can only be mutated within the default model"). It runs after the type check, so this run did not reach it. *Code*.
- The server did not complain that `z:Fw` is not in the BIM model's schema. That check, if there is one, comes later or not at all.
- Not answered by this run: what `/v1/mutate` does with the same request. The findings say it retargets BIM elements to their asset. With no asset to retarget to, the result is open.

### Run 2.2: the same key, sent to a BIM model it does not belong to

**Options**

| Option | Value |
|---|---|
| Model | Another BIM model, `urn:adsk.dtm:HTxxCYjBRx-NEZ-BiufwmA`, where the key is not a row |
| Property | JMA Test \| Param A, `z:Fw` (default model's schema, String). Not in this model's schema. |
| Value | `asdf` |
| Element key | `AAAAABeW6wC4sE6njVQEbQjNg6QABEMA`, flags `0x00000000` (SimpleElement), same as run 2.1 |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Use the asset instead | No |

**Observed**

- Before: the scan of the target model returns no row for the key (`["v1"]`). The stub then looked in the other models: not in the default model, but in `R21 Mill Building - Arch.rvt` (`urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA`, the model of run 2.1).
- Request: `POST /v3/modeldata/{otherBimModel}/mutate`, mutation `["i", "z", "Fw", "asdf"]`.
- Server answered **HTTP 400** in 489 ms, the same message as run 2.1: "custom properties are not allowed on this element type".
- Scan after: still no row for the key in the target model.

**What this means**

- **The element-type check does not look at the row.** It reads the type from the key, so the result is the same whether or not the key is a row of the target model. The server never says the key is not in this model.
- The message is accurate but can mislead: a caller who sent the key to the wrong model is told the element type is wrong, and nothing points at the model.
- The stub reports "The element hosts no asset" when the row was not found at all. That is the stub's wording, not a server result: with no row there is nothing to read `x:ha` from.

### Run 2.3: an asset key, sent to a BIM model

**Options**

| Option | Value |
|---|---|
| Model | A BIM model, `urn:adsk.dtm:HTxxCYjBRx-NEZ-BiufwmA` (same as run 2.2) |
| Property | JMA Test \| Param A, `z:Fw` (default model's schema, String) |
| Value | `asdf` |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset), a row of the default model (the wall asset of section 1) |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Use the asset instead | No |

**Observed**

- Before: no row for the key in the target model (`["v1"]`); the stub found it in the default model.
- Request: `POST /v3/modeldata/{bimModel}/mutate`, mutation `["i", "z", "Fw", "asdf"]`.
- Server answered **HTTP 400** in 532 ms: `{ "title": "Bad Request", "detail": "custom properties can only be mutated within the default model" }`.
- Scan after: no change.

**What this means**

- **The second guard is in place too.** An element type that may hold `z:` properties still cannot get them through a model other than the default model. Together with runs 2.1 and 2.2, both `z:` checks of `/v3/mutate` are confirmed on STG.
- The checks run in this order: element type (from the key), then the model. A BIM element is refused on its type wherever it is sent; an asset is refused on the model.
- This time the message points at the actual mistake (the model), unlike run 2.2.

### Run 2.4: control case, an asset key sent to the default model

**Options**

| Option | Value |
|---|---|
| Model | The default model, `urn:adsk.dtm:TcuvzHngQluWlUvFOOnBLw` |
| Property | JMA Test \| Param A, `z:Fw` (default model's schema, String) |
| Value | `asdflj` |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset), same as run 2.3 |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Use the asset instead | No |
| Restore afterwards | No |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "z", "Fw", "asdflj"]`.
- Server answered **HTTP 200** in 413 ms, body `{ "timestamp": 1795458708017 }`.
- Scan before and after: one cell changed, `z:Fw` (JMA Test | Param A) from `TestVal3` to `asdflj`.
- Not restored. To undo, write `TestVal3` back.

**What this means**

- The supported path works as documented: a `z:` property on an asset, sent to the default model with `/v3/mutate`, is stored on the asset itself.
- With runs 2.1 to 2.3, the rule for `/v3/mutate` is: **`z:` properties go to elements of an allowed type, in the default model, and nowhere else.** Both checks give a clear 400 when broken.

### Run 2.5: the BIM element of run 2.1, through `/v1/mutate`

**Options**

| Option | Value |
|---|---|
| Model | The BIM model of run 2.1, `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Property | JMA Test \| Param A, `z:Fw` (default model's schema, String). Not in the BIM model's schema. |
| Value | `qqqq` |
| Element key | `AAAAABeW6wC4sE6njVQEbQjNg6QABEMA`, flags `0x00000000` (SimpleElement), no asset made from it (`x:ha` empty) |
| Endpoint | `POST /v1/.../mutate` (APS gateway, the compatibility path) |
| Use the asset instead | No |

**Observed**

- Request: `POST /v1/modeldata/{bimModel}/mutate` through the gateway, mutation `["i", "z", "Fw", "qqqq"]`.
- Server answered **HTTP 400** in 277 ms: `{ "title": "Bad Request", "detail": "cannot write DtProperties to a non-asset element" }`.
- Scan after: no cell changed.

**What this means**

- **`/v1/mutate` does not store `z:` properties on a BIM element either.** It retargets the write only when there is an asset to retarget to; otherwise it refuses.
- How the compatibility path decides (`op-mutate-v3-keys-resolution.go`): if the element hosts an asset (`x:ha`), the write moves to the asset in the default model and the `z:` id is remapped from the BIM model's schema to the default model's. If not, the write stays on the element's own key and the same type check as `/v3` applies (`canHoldDtProperties`). *Code* for the retargeting branch; this run took the other one.
- Same rule, different words: `/v3` says "custom properties are not allowed on this element type", `/v1` says "cannot write DtProperties to a non-asset element". The `/v1` message is clearer for this case, but "DtProperties" is an internal name.
- Still open: the retargeting branch itself, a BIM element that hosts an asset, through `/v1` without "Use the asset instead". That shows the retarget and the remap of the `z:` id.

**Who the retargeting branch is for.** Not V2 facilities: there properties live on the BIM element and there is no asset link. It serves V2-era client code writing to a facility upgraded to V3. Such a client writes `z:` on the BIM element with the id from the BIM model's own schema; the server follows `x:ha` to the asset and remaps the id to the default model's schema by the attribute's hash, which is the same in every model (`DtPropRemapper.Remap`, unit test `TestV1MutateRetargetsDtPropWithHashRemap`). *Code*.

- The remap looks the incoming id up in the **BIM model's** schema. An id from the default model's schema, which is what a V3-aware client and this stub send, either fails ("unknown DtProperties attribute in source model") or, if the same short id names another property in the BIM schema, lands on that other property. *Code*, to test.
- The facility used here was created in V3, so its BIM models most likely have no user-defined properties to send (*Assumed*), and the V2-client case cannot be run on it. It needs a facility upgraded from V2.

### Run 2.6: a BIM element that hosts an asset, "Use the asset instead" ticked, through `/v1/mutate`

**Options**

| Option | Value |
|---|---|
| Model | The BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Property | JMA Test \| Param A, `z:Fw` (default model's schema, String) |
| Value | `ssss` |
| Element key | `AAAAAK4nDhMSMkSMk5Htf-PTpSoAA_lk`, flags `0x00000000` (SimpleElement). It hosts the asset `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA` (the wall asset of section 1) through `x:ha`. |
| Endpoint | `POST /v1/.../mutate` (APS gateway, the compatibility path) |
| Use the asset instead | **Yes** |
| Restore afterwards | Yes |

**Observed**

- The stub followed `x:ha` itself: it replaced the BIM key with the asset key and sent the request to the default model. So the server did **not** retarget anything in this run.
- Request: `POST /v1/modeldata/{defaultModel}/mutate`, key `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, mutation `["i", "z", "Fw", "ssss"]`.
- Server answered **HTTP 200** in 430 ms, body `{ "timestamp": 1795459290683 }`.
- Scan before and after: one cell changed on the asset, `z:Fw` from `asdflj` to `ssss`.
- Restore: `["i", "z", "Fw", "asdflj"]` through `/v1`, **HTTP 200** in 318 ms. The stub's "After restore: no cell changed" compares with the state before the test, so the asset is back to `asdflj`.

**What this means**

- `/v1/mutate` on the default model with an asset key behaves like `/v3/mutate` (run 2.4): the value is stored on the asset.
- This is the client-side way to write a user-defined property for a BIM element in V3: follow `x:ha` to the asset, then write to the default model with the default model's `z:` id. It works on both endpoints.
- The server-side retargeting (same options with "Use the asset instead" unticked) is still to run: see run 2.7.

### Run 2.7: a BIM element that hosts an asset, server-side retargeting through `/v1/mutate`

**Options**

| Option | Value |
|---|---|
| Model | The BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Property | JMA Test \| Param A, `z:Fw` (default model's schema, String) |
| Value | `ssss` |
| Element key | `AAAAACSELi_hCUJBrw7O42GpkVgABEnp`, flags `0x00000000` (SimpleElement). It hosts the asset `AQAABb0Hs6r7hkampshcOdyrR28AAAAA` in the default model (`x:ha`). A different element from run 2.6. |
| Endpoint | `POST /v1/.../mutate` (APS gateway, the compatibility path) |
| Use the asset instead | **No**: the BIM key is sent as typed, the server does the retargeting |
| Restore afterwards | Yes (nothing to restore) |

**Observed**

- The stub reported "`z:Fw` does NOT exist in the schema of the target model" (it looks for `z:Fw` in `GET /schema` of the BIM model).
- Request: `POST /v1/modeldata/{bimModel}/mutate`, key of the BIM element, mutation `["i", "z", "Fw", "ssss"]`.
- Server answered **HTTP 400** in 270 ms: `{ "title": "Bad Request", "detail": "no matching DtProperties attribute in the default model. Attribute \"Fw\" (Mechanical / Roughness) not found" }`.
- Scan after: no cell changed, neither on the BIM element nor on the asset it hosts.

**What this means**

- **The server did start to retarget**: it got as far as remapping the property id for the asset, so the BIM element and its `x:ha` were recognised.
- **It read `Fw` as a different property.** In the BIM model's schema, `Fw` is "Mechanical / Roughness", not "JMA Test | Param A". The remapper then looked for Roughness in the default model, did not find it, and refused. This is the trap described under run 2.5, now seen on STG.
- **The family is ignored.** dt-server keys a model's attributes by their short id alone (`GetAttributes` in `op-attributes.go`), and the remapper looks up the incoming `z:` column by that id without checking that the attribute it finds is a `z:` property (`DtPropRemapper.Remap`). "Mechanical / Roughness" is a source property of the Revit file, **`r:Fw`**, which is why the stub, looking for `z:Fw`, did not see it at first. *Tested*: a second run (value `dddd`, same options, same 400) with the stub extended to look the column name up in every family reported `r:Fw "Mechanical | Roughness"` in `GET /schema` of the BIM model.
- So a `z:` write to a BIM element through `/v1` is interpreted through a property of **another family** (`r:`, read-only source data), and the error message names that property without saying it is not a `z:` one.
- **This run failed safely only by luck.** Had the default model held a "Mechanical / Roughness" attribute, the value `ssss` would most likely have been written to it on the asset, under that attribute's id, with HTTP 200. *Assumed*, from the code.
- For a client: in V3, send `z:` writes to the default model with the asset key and the default model's id (runs 2.4 and 2.6). The `/v1` retargeting only helps a client that sends the BIM model's own `z:` id, which a facility created in V3 does not have.

---

## 3. Read-only column, with or without `!` override

Writes a column the UI treats as read-only (Name, Uniformat Class, Classification, Tandem Category, Level), either the column itself or its `!` override.

### Run 3.1: Name (`n:n`) on an asset, in the default model

**Options**

| Option | Value |
|---|---|
| Model | The default model, `urn:adsk.dtm:TcuvzHngQluWlUvFOOnBLw` |
| Column | Name, `n:n` (Common \| Name) |
| Use `!` override | No |
| Value | `new name` |
| Element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, flags `0x01000005` (GenericAsset), the wall asset of section 1 |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "n", "n", "new name"]`.
- Server answered **HTTP 400** in 437 ms: `{ "title": "Bad Request", "detail": "direct n:n mutation is not allowed (use override instead) at 0" }`.
- Scan after: no cell changed. `n:n` is still `Basic Wall`, `n:!n` still `Overwritten val 1`.

**What this means**

- **The server protects the original Name**, and the message says what to do instead. `at 0` is the index of the refused mutation in `muts`.
- The rule is in the shared mutate validation (`IncomingMutation.isValid` in `btstore/op-mutate.go`), so it applies to `/v1/mutate` as well as `/v3/mutate`. It covers five columns: `n:n` Name, `n:z` Tandem Category, `n:u` Uniformat Class, `n:v` Classification, and `l:l` Level. *Code* for the columns other than Name.
- `/create` skips this check, so these columns can be set when an element is created. *Code*.
- **Open point: the check can be switched off by the caller.** It is skipped when the request body has `"skipOverrideCheck": true`. The field is hidden from the API docs (`swaggerignore`) and commented "Use with care", but the handler decodes the body straight into `MutateDesc` (`parseMutateDesc` in `model-server/handle-modeldata.go`) and does not reset it, so any client with write access appears to be able to set it. *Code*, not run. **Out of scope:** the team considers `skipOverrideCheck` a private API, so it is not tested here.

### Run 3.2: the Name override (`n:!n`) on an asset with no override, then restore

**Options**

| Option | Value |
|---|---|
| Model | The default model, `urn:adsk.dtm:TcuvzHngQluWlUvFOOnBLw` |
| Column | Name override, `n:!n` |
| Use `!` override | Yes |
| Value | `new name` |
| Element key | `AQAABb0Hs6r7hkampshcOdyrR28AAAAA`, flags `0x01000005` (GenericAsset): the asset of run 2.7, a Basic Wall with no name override |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Restore afterwards | Yes |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "n", "!n", "new name"]`.
- Server answered **HTTP 200** in 356 ms, body `{ "timestamp": 1795460064097 }`.
- Scan before and after: `n:!n` went from no cell (`(empty)`) to `new name`. `n:n` stayed `Basic Wall`.
- Restore: no override before, so the stub deleted it, `["d", "n", "!n", ""]`, **HTTP 200** in 145 ms.
- After the restore the scan returns `n:!n` as `''`, an empty string, where before the test there was no cell. The stub counts this as "1 cell changed".

**What this means**

- **The override is the supported way to rename**, and it works on `/v3/mutate`: the original `n:n` is kept, the override sits next to it.
- **Confirmed for the name override: a deleted cell comes back from SCAN as `""`** (seen for `n:od` in runs 1.3 and 1.4). After a rename is undone, the element is not back to its first state as a client sees it: it has an override cell, empty.
- For a client that picks the name with `element[QC.OName]?.[0] ?? element[QC.Name]?.[0]`, as the sample apps and AGENTS.md do, this element's name is now `""`, not `Basic Wall`. *Tested*.

**Observed in the Tandem app (STG)**

- After the restore, **the Tandem app shows the asset with no name**. The original `n:n` (`Basic Wall`) is still stored, but nothing shows it.

**What this means**

- **This is a user-visible bug.** Deleting a name override, the natural way to undo a rename, does not bring the original name back: it leaves the element with an empty name, in the Tandem app as well as in clients that read the name the usual way.
- The cause is the combination of the two findings above: after a delete, the override cell still comes back as `""`, and an empty override wins over the name.
- Where it can be fixed: either the server stops returning a deleted cell (or returns it as `null`, so `??` falls back), or every client treats an empty override as no override. The first fixes all clients at once.
- **Users hit it from the Tandem app too.** In the properties panel, giving the element a name sets the override and the app shows it. Editing the name back to an empty string does not remove the override: the app shows an empty name, not the original `Basic Wall`. So there is no way in the app to go back to the original name. *Tested* in the Tandem app on STG.
- **What the app sends** when the name is cleared (DevTools, Network tab): a mutate request with the query parameter `v3=true` and the payload `{ "keys": ["AQAABb0Hs6r7hkampshcOdyrR28AAAAA"], "muts": [["i", "n", "!n", ""]] }`. It **writes an empty string**, it does not delete the override.
- So both ways end in the same state: the app's insert of `""` (this capture) and a proper delete with `d` (the restore of this run) both leave a `n:!n` cell that SCAN returns as `""`.
- **Fixing the app alone is not enough.** Even if it sent `["d", "n", "!n", ""]`, the override would still come back as `""` and win over the name. The fix needs the server (a deleted or empty override must read as no override) or every client (skip empty overrides).
- The app calls mutate with `?v3=true`. This is a general switch, not a mutate option: a middleware of the model server (`model-server.go`) reads `v3` on every request. `v3=true` forces the V3 data model, `v3=false` forces the **V2** data model, and without it the server looks up the schema version of the model. *Tested* that the app sends it; *Code* for what it does. The full URL was not captured.
- Open point: `v3=false` lets any client run V2 logic against a V3 facility. A candidate edge case.

### Run 3.3: the Name override (`n:!n`) on a BIM element, in its BIM model

**Options**

| Option | Value |
|---|---|
| Model | The BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Column | Name override, `n:!n` |
| Use `!` override | Yes |
| Value | `Bozo` |
| Element key | `AAAAACSELi_hCUJBrw7O42GpkVgABEnp`, flags `0x00000000` (SimpleElement), a Basic Wall. It **already hosts an asset**, `AQAABb0Hs6r7hkampshcOdyrR28AAAAA` (`x:ha`), the asset of run 3.2. |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Restore afterwards | No |

**Observed**

- Request: `POST /v3/modeldata/{bimModel}/mutate`, mutation `["i", "n", "!n", "Bozo"]`.
- Server answered **HTTP 200** in 466 ms, body `{ "timestamp": 1795460658395 }`.
- On the BIM element, `n:!n` went from no cell to `Bozo`. `n:n` stayed `Basic Wall`.
- On the asset it hosts, nothing changed: its `n:!n` is still `""` from run 3.2.
- Not restored.

**What this means**

- **The server accepts an override on a BIM element in V3.** This confirms on STG what [findings section 3](write-calls-findings.md#3-where-data-may-be-written) says from the code: unlike `z:` properties, overrides are not limited to the default model. Recommendation 1 of the findings (reject them outside the default model) is now *Tested*.
- An override on a BIM element can make sense on its own: renaming an element without making it an asset.
- **But this element already has an asset, and the two names are now independent**: `Bozo` on the BIM element, `""` on the asset. Nothing links or syncs them, and which one a user sees depends on which element the app shows. *Tested*.

**Observed in the Tandem app (STG)**, properties panel of the asset:

- **Asset Properties, Common, Name**: empty (the asset's own `n:!n`, `""` since run 3.2).
- **Relationships, BIM Element**: `Bozo` (the BIM element's own `n:!n`, from this run).
- Tandem Category `Wall` is shown on the asset.

**What this means**

- The app reads each element's name from its own row, which is consistent, but the user sees **one wall with two names in the same panel**, and different data again when switching between the BIM element and the asset.
- This may be by design (the BIM element and the asset are two elements), but nothing in the app says which name is the one that counts, and nothing keeps them in sync.
- The same question applies to every override pair that makeAssets copies, not just Name: Tandem Category, Classification, Uniformat Class, Level and the others.

### Run 3.4: the Tandem Category override (`n:!z`) on the same BIM element, then restore

**Options**

| Option | Value |
|---|---|
| Model | The BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Column | Tandem Category override, `n:!z` |
| Use `!` override | Yes |
| Value | `Q.Se` (the code of Sensors) |
| Element key | `AAAAACSELi_hCUJBrw7O42GpkVgABEnp`, the BIM wall of run 3.3, which hosts the asset `AQAABb0Hs6r7hkampshcOdyrR28AAAAA` |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Restore afterwards | Yes |

**Observed**

- Request: `POST /v3/modeldata/{bimModel}/mutate`, mutation `["i", "n", "!z", "Q.Se"]`.
- Server answered **HTTP 200** in 325 ms, body `{ "timestamp": 1795461205110 }`.
- On the BIM element: `n:z` stayed `B.Wa` (the wall's original code; the asset shows "Wall" in the app), `n:!z` went from no cell to `Q.Se`.
- On the asset it hosts: no cell changed.
- Restore: `["d", "n", "!z", ""]`, **HTTP 200** in 108 ms. After it, the scan returns `n:!z` as `''`, where before the test there was no cell.

**What this means**

- **Same behavior as Name**: the Tandem Category override is accepted on a BIM element, and it changes only that element, not the asset made from it. The BIM element and its asset could have shown two different categories (Sensors and Walls).
- Tandem Category values are codes (`B.Wa` here, `Q.Se` for Sensors); the app shows a label.
- **The empty-string effect applies to Tandem Category too**: after the delete, the BIM element has an empty `n:!z`. For a client that reads `override ?? category`, this wall now has no category.

**Observed in the Tandem app (STG)**, properties panel of the BIM element:

- The **Tandem Category** dropdown shows its empty placeholder instead of the original category. The original `n:z` (`B.Wa`) is still stored, but the empty override wins.

**What this means**

- **The deleted-override bug is not limited to Name.** Any override that is set and then deleted (or cleared) leaves an empty value that hides the original. Seen for Name (run 3.2) and Tandem Category (this run); expected for every override pair (Classification, Uniformat Class, Level, System Class, ...). *Tested* for two, *Assumed* for the others.

### Run 3.5: the Tandem Category override on the BIM element, not restored

**Options**

Same as run 3.4 (BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA`, key `AAAAACSELi_hCUJBrw7O42GpkVgABEnp`, `n:!z` = `Q.Se`, `/v3/mutate`), but **Restore afterwards: No**.

**Observed**

- Request: `POST /v3/modeldata/{bimModel}/mutate`, mutation `["i", "n", "!z", "Q.Se"]`.
- Server answered **HTTP 200** in 498 ms, body `{ "timestamp": 1795461698203 }`.
- On the BIM element: `n:z` stayed `B.Wa`, `n:!z` went from `''` (left by the restore of run 3.4) to `Q.Se`.
- On the asset it hosts: no cell changed, so its category is still the one makeAssets copied.

**What this means**

- **One wall, two Tandem Categories**: Sensors (`Q.Se`) on the BIM element, Wall on the asset. Nothing in the server stops it or keeps them in sync.
- Writing a value over the empty override works: an empty override can be replaced, it just cannot be removed (runs 3.2 and 3.4).

**Observed in the Tandem app (STG)**, properties panel of the **BIM element** (title "Walls : Basic Wall : BLDG4 - Foundation"):

- The section is headed **Asset Properties**, although this is the BIM element, not its asset.
- Name: **Bozo** (the BIM element's `n:!n`, run 3.3).
- Tandem Category: **Sensor** (the BIM element's `n:!z`, this run).
- Relationships, **Asset**: the link to the asset is there but its label is **empty**, because the asset's name is the empty override of run 3.2.

**What this means**

- The app shows the BIM element's own overrides, so the BIM wall reads as a Sensor named Bozo, while its asset (run 3.3) reads as an unnamed Wall.
- The heading "Asset Properties" on the BIM element makes the two easy to mix up: the user cannot tell from the panel which of the two elements they are editing.
- The empty-name bug spreads to other elements: wherever the asset is shown as a link (here, from its BIM element), the link has no text.

**Observed in the Tandem app (STG)**, properties panel of the **asset**, before and after a page reload: Tandem Category **empty**, although after run 3.3 the same panel showed `Wall`.

A scan of the asset with history explains it: the asset has its own `n:!z = ""`, written at **11:20:31** (timestamp `1795461631275`), while its `n:z` is still `B.Wa`. None of our requests wrote it: run 3.4 (11:13) and run 3.5 (11:21:38) both went to the BIM element, and the stub saw no change on the asset. It was written in the minute before run 3.5, most likely by the Tandem app while its panels were open, but the action that caused it was not noted. Run 3.6 repeats the test on a fresh element to find out.

The same scan shows the asset's `n:!n` history after run 3.2: `Wall Override name`, `''`, `Hoboshow`, `''`, all entered in the Tandem app. Each time the name was cleared in the app, the history records an empty string.

### Run 3.6: the Tandem Category override on a fresh BIM element whose asset has a category

**Options**

| Option | Value |
|---|---|
| Model | The BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Column | Tandem Category override, `n:!z` |
| Use `!` override | Yes |
| Value | `Q.Se` (Sensors) |
| Element key | `AAAAAK4nDhMSMkSMk5Htf-PTpSoAA_lk`, the BIM element of run 2.6. It hosts the asset `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA` (the wall asset of section 1), which shows Tandem Category `Wall`. |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Restore afterwards | No |

**Observed**

- Request: `POST /v3/modeldata/{bimModel}/mutate`, mutation `["i", "n", "!z", "Q.Se"]`, at 11:31:34.
- Server answered **HTTP 200** in 427 ms, body `{ "timestamp": 1795462294483 }`.
- On the BIM element: `n:z` stayed `B.Wa`, `n:!z` went from no cell to `Q.Se`.
- On the asset: no cell changed.
- In the Tandem app: the BIM element's panel shows Tandem Category **Sensor**, the asset's panel shows **Wall**.

**What this means**

- **Confirmed on a clean element: one wall, two Tandem Categories**, each shown on its own panel. The override on the BIM element does not reach the asset, and nothing warns the user.

**Follow-up: does showing the panels write anything?**

- After both panels were opened in the Tandem app, a scan of the asset with history (family `n`) shows **no `n:!z` cell at all**, and `n:z` still `B.Wa` with its import timestamp.
- So opening the panels does not write.
- **Opening the asset's Tandem Category dropdown and closing it without choosing** wrote nothing either (scan with history: still no `n:!z`).
- **Choosing "Clear Selection" in that dropdown wrote `n:!z = ""`** on the asset at 11:37:24 (timestamp `1795462644347`), with `n:z` still `B.Wa`. An empty `n:!z` shows as no category in the panel (run 3.5).

**What this means**

- **Clearing a Tandem Category in the Tandem app writes an empty override, exactly as clearing a Name does** (run 3.2). The app offers "Clear Selection" as the way to remove a category, and it leaves the element with no visible category instead of the original one.
- This explains the empty `n:!z` on the other asset (run 3.5, 11:20:31): most likely a "Clear Selection" in the app.
- So the bug is reachable from the app's own controls for at least two override pairs, Name and Tandem Category, and it hides the imported value in both cases.

**What happens to such an override when the element is made an asset, or stops being one** (*Code*, `btstore/op-make-assets-v3.go`):

- **makeAssets copies, it does not move.** The new asset gets a copy of the BIM element's Standard, Refs and LMV families, so its `n:!n` and the other overrides go along. The BIM element keeps its own `n:!n` and only gains `x:ha`. From then on there are two copies of the override, which drift apart as soon as one is edited.
- `z:` properties are not copied (only those three families are), which fits V3: a BIM element has none.
- **A second makeAssets on the same element is refused**: HTTP 409, "source element … already hosts an asset". *Code*, not run.
- **There is no way back.** dt-server has no endpoint that undoes makeAssets, and nothing clears `x:ha`. Deleting the asset would most likely leave the BIM element's `x:ha` pointing at a deleted asset, which also blocks a new makeAssets (409) and would retarget `/v1` writes to the deleted asset. *Assumed*, to test. The only "demote" code is the one-off V2 to V3 schema upgrade, which moves `z:` properties off the BIM element onto its new asset.
- Our own samples use that pattern: `nameOf()` in the testbed's `js/stubs/v3/helpers.js`, used by several V3 stubs, and the name lookups in `tandem-sample-stats/js/v3/api.js` (levels, rooms, elements). They would show an empty name after an override is deleted. The fix on the client side is to skip empty strings (`||` instead of `??`, or an explicit check). *Code*.

---

## 4. Stream host on a BIM element, without asset check

Writes the Parent xref (`x:p`) of a stream as the xref of a BIM element in its BIM model, without following the element to its asset. In V3 a stream is hosted by an element of the default model; the guarded STUBs (Create Stream, Assign Host) use the asset, and make one when there is none.

From the code: dt-server has no check on the value of `x:p` in the mutate paths, so the write is expected to be accepted. *Code*.

### Run 4.1: a stream hosted directly on a BIM element that has no asset

**Options**

| Option | Value |
|---|---|
| Host model | The BIM model `urn:adsk.dtm:xE3IKeb9QHm_SsreErTYqA` |
| Stream key | `AQAAAHsiqxh36kg5q2ArRvti89UAAAAA`, a stream of the default model (flags `0x01000000`, StreamV3), with no host |
| Host element key | `AAAAABeW6wC4sE6njVQEbQjNg6QABEMA`, a BIM element (SimpleElement, `0x00000000`) that has no asset (`x:ha` empty) |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Restore afterwards | No |

**Observed**

- Request: `POST /v3/modeldata/{defaultModel}/mutate`, mutation `["i", "x", "p", "xE3IKeb9QHm_SsreErTYqAAAAAABeW6wC4sE6njVQEbQjNg6QABEMA"]`, where the xref is the BIM model id followed by the BIM element key.
- Server answered **HTTP 200** in 509 ms, body `{ "timestamp": 1795463732320 }`.
- On the stream: `x:p` (Common | Parent External) went from no cell to the xref of the BIM element. No other cell changed.
- The BIM element is unchanged and still has no asset: no asset was made.
- In the Tandem app, the stream's panel (stream `Test1`) shows **Host = Basic Wall** under Relationships, as a link. So the app resolves the xref into the BIM model and names the BIM element, with no sign that the host is not an asset.
- The same panel shows **Location: Select Location(s)**, i.e. no location. The stub writes only `x:p`, so this is expected; it is not a result of the BIM host.

**What this means**

- **The server accepts a stream host in a BIM model.** It checks neither that the host is an element of the default model nor that it is an asset. *Tested*.
- In V3 a stream is meant to be hosted by an element of the default model: an asset or a location. The guarded STUBs follow a BIM element to its asset, and make the asset when there is none. A client that skips that step stores a host the V3 model does not expect, and nothing tells it.
- The stream now points past the asset layer. If an asset is made from this BIM element later, the stream stays on the BIM element (makeAssets does not move references, *Code*), so the asset and the stream are not linked.
- **The Tandem app accepts it too:** it shows the BIM element as the host, like any other host. A user sees nothing wrong, so the missing asset goes unnoticed. *Tested*.
- Still to check in the Tandem app: whether the BIM element's panel lists the stream, and where the stream ends up once an asset is made from the BIM element.

### Run 4.2: control case, the same stream hosted on an asset of the default model

**Options**

| Option | Value |
|---|---|
| Host model | The default model `urn:adsk.dtm:TcuvzHngQluWlUvFOOnBLw` |
| Stream key | `AQAAAHsiqxh36kg5q2ArRvti89UAAAAA`, the stream of run 4.1 |
| Host element key | `AQAABbSAvFN_7kXdl2EbHa-mDQ8AAAAA`, the wall asset (GenericAsset, `0x01000005`) of section 1 |
| Endpoint | `POST /v3/.../mutate` (Tandem host) |
| Restore afterwards | No |

**Observed**

- Before: the stream's `x:p` was `""`, an empty cell, not a missing one. Between the runs, the host of run 4.1 had been removed in the Tandem app (the delete icon next to Host). The viewer SDK writes `""` when a host is cleared (`DefaultModel.addParentXRef`, *Code*), which matches.
- Server answered **HTTP 200** in 386 ms, body `{ "timestamp": 1795463998967 }`. `x:p` went from `""` to the xref of the asset in the default model.
- In the Tandem app, the stream's panel shows **Host = Overwritten val 1**, the asset's name. Correct.

**What this means**

- The expected case works, and looks the same in the app as run 4.1. **The app does not show whether the host is a BIM element or an asset.**
- An empty `x:p` shows as no host, so clearing a host with `""` does no visible harm, unlike Name and Tandem Category (section 3).

### Is a BIM element a valid stream host in V3?

The code says it is allowed, but only while the BIM element has no asset. *Code*:

- **The V2 to V3 upgrade keeps such hosts** (`lmv-importer/taskbase/schemaUpgrade.go`). It splits into an asset only the BIM elements marked as assets (`n:ia` = true). It then rewrites every cross-model reference in the default model, streams' `x:p` included, that points to a split BIM element so it points to the asset (`fixExDbKey`, `bimElm2Asset`). A stream hosted on a BIM element that was not an asset keeps that host. So upgraded V3 facilities can hold streams hosted on BIM elements, and run 4.1 only made the same thing on purpose.
- **But no reference should point to a BIM element that has an asset.** The upgrade makes sure of that, and the guarded STUBs follow the BIM element to its asset.
- **makeAssets does not keep that rule** (`btstore/op-make-assets-v3.go`). It writes only the new asset and the BIM element's `x:ha`; it does not retarget references to the BIM element the way the upgrade does. A stream hosted on a BIM element stays on it once the element becomes an asset.
- **The viewer SDK does not resolve the host either.** `StreamManager.updateLink` and `DefaultModel.updateHosts` write the `[urn, dbId]` they are given. Whether the Tandem app turns a picked BIM element into its asset is decided in the app itself, which is not in this workspace.

So run 4.1 is not a bug on its own: it is a state the upgrade also produces. The bug risk is in the later step. Once the BIM element gets an asset, the stream points to the BIM element and not to the asset, which differs from what the upgrade would have produced. Run 4.3 confirms it.

### Run 4.3: making an asset from a BIM element that hosts a stream

**Steps**

1. A stream was given a BIM element (`Basic Wall`) with no asset as its host.
2. That BIM element was then made an asset.
3. The new asset's panel was opened in the Tandem app.

**Observed**

- The asset's panel (`Basic Wall`, Tandem Category Wall) shows **Connections: No Assignable Connections** under Relationships, and **BIM Element: Basic Wall** as a link.
- So the new asset does not list the stream: **the stream loses its connection to the wall** from the asset's point of view. *Tested*.
- The BIM element's panel, by contrast, still shows the BIM element as the stream's host. *Tested*. So the stream still points to the BIM element, as the code predicts: makeAssets writes only the new asset and the BIM element's `x:ha`, and leaves the stream's `x:p` alone. *Code*.
- The result: one wall, two elements, and the stream is attached to the one that is no longer meant to carry data. Which one a user sees depends on which panel they open.

**What this means**

- **This is a bug.** In V3 the asset is the element that carries the wall's data in the default model, and streams are meant to hang from it. Making an asset from a BIM element that hosts streams leaves those streams on the BIM element, and the asset shows no connection.
- The V2 to V3 upgrade does this split correctly: it retargets every reference to a split BIM element onto its asset (`fixExDbKey` with `bimElm2Asset`, `schemaUpgrade.go`). makeAssets (`op-make-assets-v3.go`) does the same split at runtime without that step.
- The same gap is likely for every other reference to the BIM element from the default model, not only stream hosts, since the upgrade retargets them all. *Assumed*, not tested.
- Possible fixes, for the team to decide: retarget the references in makeAssets as the upgrade does, or have every client (Tandem app, SDK, REST) resolve a BIM element to its asset when writing a host, and refuse a BIM element that has one. The first fixes existing data too; the second does not cover hosts written before the element became an asset.

# verify-claims

The domain language of the verify-claims skill: the epistemic ledger, its on-disk shape, the
claim/question lifecycles, and the vocabulary for pinning evidence. This glossary is authoritative
for terms that are easy to conflate; it is not a spec.

## Language — structure

**Ledger**:
One complete epistemic record — its lifecycle files and `scratchpad.md`, plus a generated
`INDEX.md` **only when it carries topics or other custom files** — rooted at a single directory and
git-excluded.
_Avoid_: database, store, tracker (it is explicitly **not** a work tracker).

**Topic**:
One bounded investigation held as its **own isolated Ledger** — its own lifecycle files and its
own `INDEX.md`, kept separate from other investigations in the same repo. A Topic is a whole
Ledger, **not** a tag or field on claims that share one Ledger. Topics are named for subdomains
(pycats: `battle-graphics`, `battle-mechanics`, `tooling`, `user-interface`).
_Avoid_: tag, label, category, subject.

**Layout**:
Whether a repo's `claims-data/` carries Topic Ledgers **in addition to** its root Ledger, selected
by the boolean config key `topics`. `false` (default) = the root Ledger only. `true` = the root
Ledger **plus** `claims-data/<topic>/` Ledgers alongside it — root holds **general** claims, each
Topic holds **specific** ones. The filing location of each new Claim is the **user's** call (Claude
may suggest; the user always decides). One `topics` setting per repo.
_Avoid_: mode, structure, scheme.

## Language — the claim lifecycle

**Claim**:
A single falsifiable, objective assertion tracked through the lifecycle below. (In pmtools "claim"
means staking a ticket — an overloaded term; here it is always an epistemic assertion.)
_Avoid_: fact, finding, note, statement.

**Draft**:
A proposed Claim that Claude may add **freely, ungated**. Lives in `draft-claims.md`, carrying a
**draft-local placeholder ID** (`d1`, `d2`, … — unique within `draft-claims.md` only). Not yet
admitted to the Ledger proper; its real ID is minted only on promotion.
_Avoid_: proposal, candidate.

**Unverified**:
A Draft a **human has approved at admission** into the work queue. Lives in `unverified-claims.md`.
Its real ID (`<PREFIX>-<TYPE>-<NNN>[-<AGENT>]`) is minted at this move. Has, or is accumulating,
pinned Evidence; not yet ratified.

**Treated-as-verified**:
A **disposition on an Unverified claim** — it carries pinned Evidence and a provisional verdict
(TRUE or FALSE) but still awaits **verification**. It stays in `unverified-claims.md`; it is not yet
Verified.
_Avoid_: provisional-verified, pending (use the exact term).

**Verified**:
A Claim a **human has ratified by judgment**, at **verification**, as TRUE or FALSE. Lives in
`verified-claims.md`. Only a human promotes here; pinned Evidence is necessary but never sufficient.

**Cancelled**:
A Claim withdrawn at **any** stage once it has a real ID. Terminal, in `bad-claims.md`.
`bad`/cancelled = never-askable or withdrawn (hygiene); distinct from **FALSE** = we asked and the
answer was no. A FALSE claim is a *Verified* claim. (An abandoned pre-ID Draft is a silent discard,
not a Cancellation — it never entered the Ledger proper.)

**Admission / Verification**:
The two **human-approved transitions** — nothing self-promotes across either. **Admission** =
approval of a Draft into `unverified-claims.md`; the 11-criterion rubric applies here and the real
ID is minted here. **Verification** = the judgment that ratifies an Unverified claim into
`verified-claims.md` as TRUE or FALSE. Both are human acts; pinned Evidence is necessary but never
sufficient.

## Language — questions & evidence

**Question** lifecycle: **Open** (`open-questions.md`) → **Answered** (`answered-questions.md`),
or **Cancelled** (`cancelled-questions.md`, withdrawn / won't-answer).

**Evidence**:
A reference pinned by **SHA + date** to a **named** project entity — **without line numbers**. The
SHA+date is the as-of anchor; the name is the drift-tolerant locator. Its **kind matches the claim**:
a source's *text* → a `reference` (file / function / heading); a *behavior* claim → a `test` (a
**Claim test**); a *data* claim → a `query` (a pinned command + output). There is **no** frozen
`evidence/` store and **no `E1/E2/E3` tiers**. Evidence is necessary for a Verified claim but is
never itself the promoter (a human is — at verification). See **Statement** for non-reproducible
signal.
_Avoid_: proof, citation, source.

**Statement**:
A **WHO said/saw WHAT, WHEN** record — a decision-of-record, a report, or a one-off observation.
**Non-reproducible signal**, weighted by the **WHO**: a decider's statement is authoritative for
*that decision* (this is how a Question becomes Answered), but a statement about the world is only
minor signal and **never** verifies a factual Claim on its own. Absorbs the retired `observation`
and `attestation` kinds.
_Avoid_: proof, attestation (retired as a distinct kind), evidence.

**Claim test**:
A **red-green, non-vacuous** test (or query) written to support a Claim, living in the project's
code tree — either a dedicated `scratch/` dir or alongside the project's own tests (**user's
choice**, set by `testDir`). Its **docstring restates the Claim in full** and carries the Claim ID,
so it reads standalone without returning to `claims-data/`.
_Avoid_: evidence file, fixture.

**Pin**:
The SHA + date that freezes an Evidence reference to a point in time — the answer to "true as of
when?".

# verify-claims

The domain language of the verify-claims skill: the epistemic ledger, its on-disk shape, the
claim/question lifecycles, and the vocabulary for pinning evidence. This glossary is authoritative
for terms that are easy to conflate; it is not a spec.

## Language — structure

**Ledger**:
One complete epistemic record — its lifecycle files, `scratchpad.md`, and a generated `INDEX.md` —
rooted at a single directory and git-excluded.
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
A proposed Claim that Claude may add **freely, ungated**. Lives in `draft-claims.md`. Not yet
admitted to the Ledger proper.
_Avoid_: proposal, candidate.

**Unverified**:
A Draft a **human has approved** (Gate 1) into the work queue. Lives in `unverified-claims.md`.
Has, or is accumulating, pinned Evidence; not yet ratified.

**Treated-as-verified**:
A **disposition on an Unverified claim** — it carries pinned Evidence and a provisional verdict
(TRUE or FALSE) but still awaits Gate 2. It stays in `unverified-claims.md`; it is not yet Verified.
_Avoid_: provisional-verified, pending (use the exact term).

**Verified**:
A Claim a **human has ratified by judgment** (Gate 2) as TRUE or FALSE. Lives in
`verified-claims.md`. Only a human promotes here; pinned Evidence is necessary but never sufficient.

**Cancelled**:
A Claim withdrawn at **any** stage. Terminal, in `bad-claims.md`. `bad`/cancelled = never-askable
or withdrawn (hygiene); distinct from **FALSE** = we asked and the answer was no. A FALSE claim is
a *Verified* claim.

**Gate 1 / Gate 2**:
The two **human** decision points. Gate 1 = approval (Draft → Unverified). Gate 2 = judgment
(→ Verified). Both are human; nothing self-promotes across them.

## Language — questions & evidence

**Question** lifecycle: **Open** (`open-questions.md`) → **Answered** (`answered-questions.md`),
or **Cancelled** (`cancelled-questions.md`, withdrawn / won't-answer).

**Evidence**:
A reference pinned by **SHA + date** to a **named** project entity — **without line numbers**. The
SHA+date is the as-of anchor; the name is the drift-tolerant locator. The entity varies by claim
kind: a source's *text* points at the file/function/heading; a *behavior* claim points at a
**Claim test**; a *data* claim points at a pinned query/test. There is **no** frozen `evidence/`
store. Evidence is necessary for a Verified claim but is never itself the promoter (a human is —
Gate 2).
_Avoid_: proof, citation, source.

**Claim test**:
A **red-green, non-vacuous** test (or query) written to support a Claim, living in the project's
code tree — either a dedicated `scratch/` dir or alongside the project's own tests (**user's
choice**). Its **docstring restates the Claim in full**, so it reads standalone without returning
to `claims-data/`.
_Avoid_: evidence file, fixture.

**Pin**:
The SHA + date that freezes an Evidence reference to a point in time — the answer to "true as of
when?".

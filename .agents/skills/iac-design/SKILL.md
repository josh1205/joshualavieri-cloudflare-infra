---
name: iac-design
description: How to add or change infrastructure in a Pulumi + Cloudflare program without breaking live services — importing existing resources, the zero-diff rule, single-owner resources, account-level singletons, and refactors that preserve URNs. Read before writing any resource or running `pulumi up`.
---

# IaC design

Infrastructure code differs from application code in one way that governs
everything else: **the target already exists and is serving traffic.** A wrong
apply is not a failed build, it is an outage. Every rule below was hit at least
once while building this program.

## The two rules

**1. Import, never create.** A resource that exists in the provider and is
declared fresh in code produces a duplicate, a name conflict, or a silent
replacement. Adopt it:

```bash
pulumi import <type> <logical-name> <provider-id> --generate-code=false
```

`pulumi import` marks resources `protect`ed by default. That is a feature; leave
it on for anything whose loss is an outage.

**2. `pulumi preview` must show ZERO diffs on imported resources.** Not "only
small diffs" — zero. A diff on a live resource is the tool announcing it is
about to change production. Fix the code to match reality, never let it apply.

Intentional changes are the exception, and must be *stated* as such — in a
comment, in the README, and to whoever approves the apply. If you cannot say in
one sentence why a diff is there, it is not intentional.

## Verify the provider schema, don't recall it

Provider docstrings are frequently wrong — generated from a union type, they
describe the wrong field. In this program `DnsRecordArgs.content` is documented
as "A valid IPv4 address" on a TXT record.

Read the types directly:

```bash
awk '/export interface FooArgs/,/^\}/' node_modules/@pulumi/<provider>/foo.d.ts
grep -o 'pulumi import <provider>[^`]*' node_modules/@pulumi/<provider>/foo.d.ts
```

Then typecheck, then preview. Three cheap checks that beat one confident guess.

**Pin the provider's major version.** Majors rename resources wholesale —
Cloudflare v5→v6 turned `Record` into `DnsRecord` and `ZoneSettingsOverride`
into `ZoneSetting`. Most examples online, and most model output, are for the
older major and will not compile.

## One owner per resource

If two resources can both write the same field, they will fight, and the loser
is usually production. Cloudflare's `List` has an `items` field *and* a separate
`ListItem` resource. Declaring both makes `List` see an array it does not
control and empty it on every update — deleting the redirect entries.

Ask of every field: *can anything else write this?* Other Pulumi resources, the
dashboard, or another system entirely. A Pages custom domain auto-creates its
DNS record, so declaring that record in Pulumi too means two owners.

Prefer the owner that already exists. Do not import what another system manages
declaratively.

## Account-level singletons

Some resources are account-scoped even when everything around them is
zone-scoped — root rulesets, redirect lists, account-wide WAF. Declaring one
means owning **all** of it: `rules` is the complete set, not an addition, and
anything added in the dashboard is deleted on the next apply.

This is safe only while the account holds a single zone. Write that assumption
into the file as a comment naming what must happen if it stops being true, and
put account-scoped resources in a stack that zone stacks reference rather than
in one zone's stack.

## Some resources cannot be destroyed

`ZoneSetting` and its equivalents have no delete. Removing one from the program
drops it from state and leaves the value set. Reverting means explicitly setting
the old value. Preview warns; the warning is expected, not noise — but it means
**you cannot undo by deleting code.** Record the previous value in a comment
before changing it.

## Flags that are load-bearing

Some fields look cosmetic and carry the service. `proxied` on a Cloudflare
record is one: an apex `CNAME` resolves only because Cloudflare flattens it, and
flattening happens only while proxied. Omitting the flag defaults it to false,
un-proxies the record, and takes the site off the edge.

Mark these in code where they are set, not only in the README. The next person
to touch the line is the one who needs the warning.

## Refactors must preserve URNs

A resource's identity is its URN, built from its **logical name and parents** —
not its file. Moving declarations between files changes nothing. Wrapping them
in a `ComponentResource` reparents every URN, and Pulumi reads that as delete
plus create: for a DNS record, an outage.

So: split with plain functions, keep every name string byte-identical, and prove
it with a preview that reports the same unchanged count as before the refactor.
If a rename is genuinely wanted, use `pulumi state rename`, not a code edit.

## Stack config and secrets

The encryption key belongs to the **stack**, not the file. Renaming
`Pulumi.<stack>.yaml` on disk orphans the config from the stack that can decrypt
it; use `pulumi stack rename`, which keeps the stack ID and the key. Deleting a
stack destroys its key and the committed ciphertext becomes unreadable forever.

In a public repo, no account ID, zone ID, or resource ID belongs in source. Put
them in encrypted stack config, reference them through a single `config.ts`, and
grep before committing:

```bash
grep -rn -E '<id>|<id>' . --exclude-dir=node_modules --exclude-dir=.git
```

## Work read-only until the last step

Scan and import with a **read-only** API token. Import writes state, not
infrastructure, and preview needs no write access — so the entire program can be
built, refactored and verified before any credential capable of changing
anything is introduced. Swap to a write-scoped token only to apply.

## The program may not be at the repo root

If the Pulumi program lives in a subdirectory, three things must point at it or
CI fails in ways that look like auth errors: the action's `work-dir`, the
install step's `working-directory`, and `setup-node`'s `cache-dependency-path`.

Moving the program is otherwise safe — URNs are built from logical names, not
file paths, so state is unaffected. Only the *selected stack* is lost, because
selection is keyed to the workspace path. `pulumi stack select` restores it.

## Order of operations

1. Scan the provider's API and record what exists — IDs, and every field value.
2. Write the resource to match reality exactly.
3. Typecheck.
4. Import.
5. Preview. Expect zero diffs; investigate every one that appears.
6. Only then add new resources, and keep them visibly separate from adopted ones.

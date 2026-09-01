# joshualavieri-cloudflare-infra

Pulumi program describing the Cloudflare configuration for **joshualavieri.com**.

This repo owns the *domain*. It does not own the *applications* that sit on it.

## What's in here

```
index.ts                     composition only — calls one function per resource file
config.ts                    every parameterised value; the only place literals live
resources/
  zone-settings.ts           the zone + ssl / always_use_https / min_tls_version
  dns-cname.ts               apex and www CNAMEs pointing at Pages
  dns-mail.ts                SPF and DMARC
  bulk-redirects.ts          redirect list + account ruleset (see caveat below)
.agents/skills/iac-design/   how to change this safely; .claude/skills symlinks to it
Pulumi.yaml                  project definition
Pulumi.prd.yaml              stack config — encrypted accountId and zoneId
```

Each file in `resources/` exports exactly one function, called once from
`index.ts`.
## What this manages

| Resource | Name | State |
|---|---|---|
| Zone | `joshualavieri.com` | imported, `protect` |
| CNAME apex → `joshualavieri-com.pages.dev` | `apex` | imported, `protect` |
| CNAME `www` → `joshualavieri-com.pages.dev` | `www` | imported, `protect` |
| TXT SPF | `spf` | to create |
| TXT DMARC | `_dmarc` | to create |
| Zone settings — `ssl`, `always_use_https`, `min_tls_version` | | to create |
| Bulk redirect list + item (`pages.dev` → apex) | `redirects` | imported |
| Account redirect ruleset | `redirects` | imported |

The zone and both records are `protect`ed: `pulumi destroy` will refuse rather
than take the domain out of Cloudflare or drop the records the live site
resolves through.

## What this deliberately does not manage

**The Pages project.** It's connected to GitHub, and the repo connection, deploy
hooks, and build config don't round-trip cleanly through the provider's
`PagesProject` resource.

**Per-application resources.** D1 databases, R2 buckets, KV namespaces, Worker
bindings and secrets belong in the repo of the app that references them by name.

**Subdomain records for future projects.** When a Pages project adds a custom
domain, Cloudflare creates the CNAME itself. Declaring it here too would put two
systems in charge of one record. Let Pages create it.

The rule: *import what you'd have to hand-rebuild and would hate to lose; leave
what another system already owns declaratively.*

## Prerequisites

```bash
npm install
pulumi login          # Pulumi Cloud — free for individuals
pulumi stack select prd
```

The program needs a Cloudflare API token in the environment:

```bash
export CLOUDFLARE_API_TOKEN="...not my token"
```

## Usage

```bash
pulumi preview        # always, first
pulumi up             # only after reading the preview
pulumi refresh        # reconcile state with reality
```

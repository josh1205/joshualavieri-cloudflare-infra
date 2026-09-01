/**
 * Cloudflare infrastructure for joshualavieri.com
 *
 * This file is composition only — every resource lives in `resources/`, and
 * every value they are parameterised by lives in `config.ts`.
 *
 * Deliberately NOT managed here — see README.md:
 *   - the `joshualavieri-com` Pages project (owned by its GitHub integration)
 *   - per-application resources (D1, R2, KV) — those live with the app
 */

import { zoneAndSettings } from './resources/zone-settings'
import { dnsCnames } from './resources/dns-cname'
import { dnsMail } from './resources/dns-mail'
import { bulkRedirects } from './resources/bulk-redirects'

const { zone, ssl, alwaysHttps, minTls } = zoneAndSettings()
const { apex, www } = dnsCnames()
const { spf, dmarc } = dnsMail()
const { list, ruleset } = bulkRedirects()

export const zoneName = zone.name

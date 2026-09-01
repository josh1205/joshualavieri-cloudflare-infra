/**
 * Every value this program is parameterised by.
 *
 * Resources live in `resources/`; nothing in there declares a literal that
 * belongs here. This repo is public, so identifiers come from encrypted stack
 * config rather than being written into source.
 */

import * as pulumi from '@pulumi/pulumi'

const stackConfig = new pulumi.Config()

/** Apex domain. The zone this program manages. */
const domain = 'joshualavieri.com'

/** Pages deployment that the apex, www, and the bulk redirect all reference. */
const pagesHost = 'joshualavieri-com.pages.dev'

export const config = {
  accountId: stackConfig.requireSecret('accountId'),
  zoneId: stackConfig.requireSecret('zoneId'),

  domain,
  pagesHost,

  dns: {
    /** Proxied is load-bearing: apex CNAME flattening depends on it. */
    proxied: true,
    /** 1 = automatic, the only TTL permitted on a proxied record. */
    ttl: 1,
  },

  mail: {
    spf: '"v=spf1 -all"',
    dmarc: '"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s"',
  },

  zoneSettings: {
    ssl: 'strict',
    alwaysUseHttps: 'on',
    minTlsVersion: '1.2',
  },

  bulkRedirects: {
    listName: 'joshualavieri_com_bulk_redirects',
    listDescription: 'Bulk redirects for joshualavieri.com',
    ruleDescription: 'joshualavieri_pages_to_main',
  },
} as const

/**
 * The two CNAMEs that resolve the site, both pointing at Pages.
 *
 */

import * as cloudflare from '@pulumi/cloudflare'
import { config } from '../config'

export function dnsCnames() {
  const apex = new cloudflare.DnsRecord(
    'apex',
    {
      zoneId: config.zoneId,
      name: config.domain,
      type: 'CNAME',
      content: config.pagesHost,
      proxied: config.dns.proxied,
      ttl: config.dns.ttl,
    },
    { protect: true },
  )

  const www = new cloudflare.DnsRecord(
    'www',
    {
      zoneId: config.zoneId,
      name: `www.${config.domain}`,
      type: 'CNAME',
      content: config.pagesHost,
      proxied: config.dns.proxied,
      ttl: config.dns.ttl,
    },
    { protect: true },
  )

  return { apex, www }
}

/**
 * SPF and DMARC — two TXT records that stop other people sending email that
 * claims to be from joshualavieri.com.
 *
 * Email never checks who a message is really from: anyone can put
 * `From: josh@joshualavieri.com` on a message and send it. The domain doesn't
 * need email of its own for someone to forge mail as it. Since nothing here
 * sends email, these two records say so as strongly as possible.
 *
 *   SPF   "v=spf1 -all"     the list of servers allowed to send as this
 *                           domain — empty, and `-all` rejects everything
 *                           not on it. So: nobody.
 *
 *   DMARC "p=reject; ..."   what receivers should do about a failure.
 *                           Reject it outright, subdomains too (`sp`), and
 *                           require an exact domain match (`aspf`/`adkim`).
 *
 * BEFORE ADDING EMAIL: `-all` blocks *sending*. Receiving is unaffected (that's
 * MX). But add Email Routing, Google Workspace, or a form that sends via
 * SendGrid/Resend, and this SPF record must be updated FIRST or that mail fails.
 */

import * as cloudflare from '@pulumi/cloudflare'
import { config } from '../config'

export function dnsMail() {
  const spf = new cloudflare.DnsRecord('spf', {
    zoneId: config.zoneId,
    name: config.domain,
    type: 'TXT',
    content: config.mail.spf,
    ttl: config.dns.ttl,
    comment: 'Managed by Pulumi — no sender authorised',
  })

  const dmarc = new cloudflare.DnsRecord('dmarc', {
    zoneId: config.zoneId,
    name: `_dmarc.${config.domain}`,
    type: 'TXT',
    content: config.mail.dmarc,
    ttl: config.dns.ttl,
    comment: 'Managed by Pulumi',
  })

  return { spf, dmarc }
}

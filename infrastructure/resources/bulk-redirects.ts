/**
 * Bulk redirect sending the bare Pages hostname to the real domain, so the site
 * has one canonical origin.
 *
 * ---------------------------------------------------------------------------
 * ACCOUNT-LEVEL RESOURCE — READ BEFORE ADDING A SECOND ZONE
 * ---------------------------------------------------------------------------
 * The ruleset below is the ROOT ruleset for the `http_request_redirect` phase,
 * which is a singleton for the WHOLE ACCOUNT — not per-zone. Both it and the
 * redirect list are account-scoped, while everything else in this program is
 * zone-scoped.
 *
 * This is safe only because exactly one zone is expected in this account. Two
 * consequences follow while that holds:
 *
 *   - Pulumi owns EVERY account bulk-redirect rule. A rule added later in the
 *     dashboard is deleted on the next `up` unless it is also declared here.
 *   - `rules` below is the complete set, not an addition to what exists.
 *
 * IF A SECOND ZONE IS EVER ADDED TO THIS ACCOUNT, THIS FILE MUST MOVE. It no
 * longer belongs to a single-zone program: one zone's stack would silently own
 * and delete the other zone's redirects. Move it to an account-scoped stack
 * that both zone stacks reference, and have each zone contribute its own rules.
 * ---------------------------------------------------------------------------
 */

import * as cloudflare from '@pulumi/cloudflare'
import { config } from '../config'

export function bulkRedirects() {
  const list = new cloudflare.List('redirects', {
    accountId: config.accountId,
    name: config.bulkRedirects.listName,
    kind: 'redirect',
    description: config.bulkRedirects.listDescription,
    // Declared inline, NOT as a separate cloudflare.ListItem. With both, the
    // List sees an `items` array it doesn't control and empties the list on
    // every update — which deletes the redirect. One owner only.
    items: [
      {
        redirect: {
          sourceUrl: `${config.pagesHost}/`,
          targetUrl: `https://${config.domain}/`,
          statusCode: 301,
          preserveQueryString: true,
          preservePathSuffix: true,
          subpathMatching: true,
        },
      },
    ],
  })

  const ruleset = new cloudflare.Ruleset('redirects', {
    accountId: config.accountId,
    name: 'default',
    kind: 'root',
    phase: 'http_request_redirect',
    rules: [
      {
        action: 'redirect',
        description: config.bulkRedirects.ruleDescription,
        enabled: true,
        expression: `http.request.full_uri in $${config.bulkRedirects.listName}`,
        actionParameters: {
          fromList: {
            key: 'http.request.full_uri',
            name: config.bulkRedirects.listName,
          },
        },
      },
    ],
  })

  return { list, ruleset }
}

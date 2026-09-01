/**
 * The zone itself and the settings hung off it.
 *
 */

import * as cloudflare from '@pulumi/cloudflare'
import { config } from '../config'

export function zoneAndSettings() {
  const zone = new cloudflare.Zone(
    'main',
    {
      account: { id: config.accountId },
      name: config.domain,
      type: 'full',
    },
    { protect: true },
  )

  /** full → strict. Pages serves a valid cert, so strict verifies the origin. */
  const ssl = new cloudflare.ZoneSetting('ssl', {
    zoneId: config.zoneId,
    settingId: 'ssl',
    value: config.zoneSettings.ssl,
  })

  /** off → on. Redirect plain HTTP rather than serving it. */
  const alwaysHttps = new cloudflare.ZoneSetting('always-use-https', {
    zoneId: config.zoneId,
    settingId: 'always_use_https',
    value: config.zoneSettings.alwaysUseHttps,
  })

  /** 1.0 → 1.2. TLS 1.0/1.1 are deprecated. */
  const minTls = new cloudflare.ZoneSetting('min-tls-version', {
    zoneId: config.zoneId,
    settingId: 'min_tls_version',
    value: config.zoneSettings.minTlsVersion,
  })

  return { zone, ssl, alwaysHttps, minTls }
}

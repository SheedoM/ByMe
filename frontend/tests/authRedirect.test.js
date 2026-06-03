import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildLoginRedirect,
  getSafeRedirectPath,
} from '../src/utils/authRedirect.js'

describe('auth redirect helpers', () => {
  it('builds login redirects that preserve the current protected path', () => {
    assert.equal(
      buildLoginRedirect('/onboarding', '?step=upload'),
      '/login?redirectTo=%2Fonboarding%3Fstep%3Dupload',
    )
  })

  it('uses app as the default post-login target', () => {
    assert.equal(getSafeRedirectPath(''), '/app')
  })

  it('allows same-origin absolute paths', () => {
    assert.equal(getSafeRedirectPath('/onboarding'), '/onboarding')
  })

  it('rejects external redirect URLs', () => {
    assert.equal(getSafeRedirectPath('https://evil.example/phish'), '/app')
    assert.equal(getSafeRedirectPath('//evil.example/phish'), '/app')
  })
})

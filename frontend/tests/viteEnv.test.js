import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { validateFrontendEnv } from '../vite.env.js'

describe('validateFrontendEnv', () => {
  it('rejects localhost API URLs during Vercel production builds', () => {
    assert.throws(
      () =>
        validateFrontendEnv({
          mode: 'production',
          env: { VITE_API_URL: 'http://localhost:8005' },
          processEnv: { VERCEL: '1' },
        }),
      /must point to your deployed backend/,
    )
  })

  it('rejects missing API URLs during Vercel production builds', () => {
    assert.throws(
      () =>
        validateFrontendEnv({
          mode: 'production',
          env: {},
          processEnv: { VERCEL: '1' },
        }),
      /VITE_API_URL is required/,
    )
  })

  it('allows deployed API URLs during Vercel production builds', () => {
    assert.doesNotThrow(() =>
      validateFrontendEnv({
        mode: 'production',
        env: { VITE_API_URL: 'https://byme-api.onrender.com' },
        processEnv: { VERCEL: '1' },
      }),
    )
  })

  it('allows localhost API URLs for local builds', () => {
    assert.doesNotThrow(() =>
      validateFrontendEnv({
        mode: 'production',
        env: { VITE_API_URL: 'http://localhost:8005' },
        processEnv: {},
      }),
    )
  })
})

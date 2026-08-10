/**
 * Tests for plugin/core/sessionMove.js
 * 
 * Run with: node --test test/unit/sessionMove.test.js
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'

import { moveSessionDirectory } from '../../plugin/core/sessionMove.js'

describe('moveSessionDirectory', () => {
  test('posts the move to the experimental endpoint', async () => {
    const calls = []
    const client = {
      session: {},
      _client: {
        post: async (req) => { calls.push(req); return { status: 200 } },
      },
    }

    const ok = await moveSessionDirectory(client, 'ses_123', '/path/to/worktree')

    assert.strictEqual(ok, true)
    assert.strictEqual(calls.length, 1)
    assert.strictEqual(calls[0].url, '/experimental/control-plane/move-session')
    assert.deepStrictEqual(calls[0].body, {
      sessionID: 'ses_123',
      destination: { directory: '/path/to/worktree' },
      moveChanges: false,
    })
  })

  test('returns false for a 4xx/5xx response', async () => {
    const client = {
      session: {},
      _client: { post: async () => ({ status: 400 }) },
    }

    assert.strictEqual(await moveSessionDirectory(client, 'ses_123', '/path'), false)
  })

  test('returns false and does not throw when the API throws', async () => {
    const client = {
      session: {},
      _client: { post: async () => { throw new Error('api down') } },
    }

    const ok = await moveSessionDirectory(client, 'ses_123', '/path')

    assert.strictEqual(ok, false)
  })
})

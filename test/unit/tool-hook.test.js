/**
 * Tests for the tool.execute.before hook in plugin/index.js
 * 
 * Run with: node --test test/unit/tool-hook.test.js
 */

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { devcontainers } from '../../plugin/index.js'
import { saveSession, deleteSession } from '../../plugin/helpers.js'

let testDir
let sessionID

const stubClient = {
  path: { get: async () => ({ data: { config: undefined } }) },
  session: { list: async () => ({ data: [] }) },
  tui: { showToast: async () => {} },
}

beforeEach(async () => {
  testDir = join(tmpdir(), `ocw-hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(testDir, { recursive: true })
  process.env.OCDC_SESSIONS_DIR = testDir
  process.env.OCDC_CACHE_DIR = testDir
  process.env.OCDC_CLONES_DIR = testDir
  process.env.OCDC_WORKTREES_DIR = testDir
  sessionID = 'hook-test-session'
})

afterEach(() => {
  deleteSession(sessionID)
  delete process.env.OCDC_SESSIONS_DIR
  delete process.env.OCDC_CACHE_DIR
  delete process.env.OCDC_CLONES_DIR
  delete process.env.OCDC_WORKTREES_DIR
  rmSync(testDir, { recursive: true, force: true })
})

async function runHook(command, sessionData) {
  saveSession(sessionID, sessionData)
  const plugin = await devcontainers({ client: stubClient })
  const output = { args: { command } }
  await plugin['tool.execute.before']({ tool: 'bash', sessionID }, output)
  return output
}

describe('tool.execute.before', () => {
  test('leaves worktree session commands unwrapped and unmodified', async () => {
    const output = await runHook('git status', {
      type: 'worktree',
      workspace: '/tmp/worktree',
      branch: 'feature-x',
      mainRepo: '/tmp/main',
    })

    assert.strictEqual(output.args.command, 'git status')
    assert.strictEqual(output.args.workdir, undefined)
  })

  test('does not strip HOST: prefixes for worktree sessions', async () => {
    const output = await runHook('HOST: npm install', {
      type: 'worktree',
      workspace: '/tmp/worktree',
      branch: 'feature-x',
      mainRepo: '/tmp/main',
    })

    assert.strictEqual(output.args.command, 'HOST: npm install')
    assert.strictEqual(output.args.workdir, undefined)
  })

  test('still wraps devcontainer session commands', async () => {
    const output = await runHook('npm test', {
      type: 'devcontainer',
      workspace: '/tmp/clone',
      branch: 'feature-x',
      repoName: 'repo',
    })

    assert.ok(output.args.command.includes('devcontainer exec'))
  })

  test('ignores non-bash tools', async () => {
    saveSession(sessionID, {
      type: 'worktree',
      workspace: '/tmp/worktree',
      branch: 'feature-x',
      mainRepo: '/tmp/main',
    })
    const plugin = await devcontainers({ client: stubClient })
    const output = { args: { command: 'git status' } }
    await plugin['tool.execute.before']({ tool: 'read', sessionID }, output)

    assert.strictEqual(output.args.command, 'git status')
  })
})

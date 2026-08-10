/**
 * Tests for command registration: parser + config hook wiring
 *
 * Run with: node --test test/unit/commands.test.js
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { parseCommandFile } from '../../plugin/helpers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COMMAND_DIR = join(__dirname, '..', '..', 'plugin', 'command')

describe('parseCommandFile', () => {
  test('parses description from frontmatter and body as template', () => {
    const parsed = parseCommandFile(`---
description: Do a thing - /thing <arg>
---

Call the \`thing\` tool with \`target\`: $ARGUMENTS
`)
    assert.deepStrictEqual(parsed, {
      description: 'Do a thing - /thing <arg>',
      template: 'Call the `thing` tool with `target`: $ARGUMENTS',
    })
  })

  test('returns null when description is missing', () => {
    assert.strictEqual(parseCommandFile('---\nname: x\n---\nbody'), null)
  })
})

describe('plugin config hook', () => {
  test('registers all three commands from plugin/command', async () => {
    const { devcontainers } = await import('../../plugin/index.js')
    const hooks = await devcontainers({ client: {} })
    const config = { command: {} }
    await hooks.config(config)

    for (const name of ['devcontainer', 'worktree', 'workspaces']) {
      const cmd = config.command[name]
      assert.ok(cmd, `command ${name} is registered`)
      assert.ok(cmd.description, `${name} has a description`)
      assert.ok(cmd.template.includes('$ARGUMENTS'), `${name} template uses $ARGUMENTS`)
    }

    assert.deepStrictEqual(Object.keys(config.command).sort(), ['devcontainer', 'workspaces', 'worktree'])

    const source = readFileSync(join(COMMAND_DIR, 'devcontainer.md'), 'utf8')
    assert.strictEqual(
      config.command.devcontainer.description,
      parseCommandFile(source).description,
      'description matches the md file',
    )
  })
})

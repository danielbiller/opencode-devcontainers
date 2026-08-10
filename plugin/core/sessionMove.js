/**
 * Session directory moves for worktree sessions.
 * 
 * In opencode 1.18.x the plugin SDK does not expose session.move (verified
 * live: client.session has no `move`), so the raw HTTP endpoint
 * /experimental/control-plane/move-session is used via client._client.
 * Never throws; returns whether the move succeeded.
 */

const MOVE_URL = "/experimental/control-plane/move-session"

/**
 * Move a session to a directory via the experimental session.move API.
 * 
 * @param {object} client - The opencode plugin client
 * @param {string} sessionID - Session ID to move
 * @param {string} directory - Target directory for the session
 * @returns {Promise<boolean>} True if the move succeeded, false otherwise
 */
export async function moveSessionDirectory(client, sessionID, directory) {
  try {
    const res = await client._client.post({
      url: MOVE_URL,
      body: { sessionID, destination: { directory }, moveChanges: false },
    })
    return !(typeof res?.status === "number" && res.status >= 400)
  } catch {
    return false
  }
}

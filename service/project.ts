import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { DatabaseSync } from 'node:sqlite';

const run = promisify(execFile);
const ROOT_COMMIT = /^[0-9a-f]{40}$/;

export type ProjectRef = {
  id: string;
  source: 'session-map' | 'git-root';
};

export type ProjectResolution = {
  project: ProjectRef | null;
  reason: string | null;
};

const gitRootCommit = async (directory: string): Promise<string | null> => {
  try {
    const { stdout } = await run('git', ['-C', directory, 'rev-list', '--max-parents=0', 'HEAD'], {
      timeout: 2_000,
      maxBuffer: 8_192,
    });
    const sha = stdout.trim().split('\n')[0] ?? '';
    return ROOT_COMMIT.test(sha) ? sha : null;
  } catch {
    return null;
  }
};

/**
 * `session_projects` is the authoritative map for a live session. Without one,
 * a git directory's root commit is the same identity Magic Context stores.
 */
export const resolveProject = async (
  db: DatabaseSync | null,
  { sessionId, directory }: { sessionId: string | null; directory: string | null },
): Promise<ProjectResolution> => {
  if (sessionId && db) {
    const row = db.prepare('SELECT project_path FROM session_projects WHERE session_id = ?').get(sessionId);
    const mapped = row?.project_path;
    if (typeof mapped === 'string' && mapped.length > 0) {
      return { project: { id: mapped, source: 'session-map' }, reason: null };
    }
  }
  if (directory) {
    const sha = await gitRootCommit(directory);
    if (sha) return { project: { id: `git:${sha}`, source: 'git-root' }, reason: null };
  }
  return {
    project: null,
    reason: sessionId ? 'session-unmapped' : directory ? 'not-a-git-repository' : 'no-session-or-directory',
  };
};

export const isSessionId = (value: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(value);

export const isProjectDirectory = (value: string): boolean =>
  value.startsWith('/') && value.length <= 4096 && !value.includes('\0');

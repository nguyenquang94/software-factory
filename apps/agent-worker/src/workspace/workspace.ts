import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from '../config.js';

const execFileAsync = promisify(execFile);

export interface GitCommand {
  args: string[];
  cwd?: string;
}

export function buildGitCommands(
  repo: { github: string; base_branch: string; work_branch: string },
  workspaceDir: string
): GitCommand[] {
  return [
    {
      args: ['clone', '--filter=blob:none', `https://github.com/${repo.github}.git`, workspaceDir],
    },
    {
      args: ['checkout', repo.base_branch],
      cwd: workspaceDir,
    },
    {
      args: ['checkout', '-b', repo.work_branch],
      cwd: workspaceDir,
    },
  ];
}

export class Workspace {
  public workspaceDir: string | null = null;

  constructor(private keepWorkspace: boolean = config.keepWorkspace) {}

  async init(repo: { github: string; base_branch: string; work_branch: string }): Promise<string> {
    const tmpDir = os.tmpdir();
    // Create a prefix for the temp directory
    const prefix = path.join(tmpDir, 'factory-worker-');
    this.workspaceDir = await fs.mkdtemp(prefix);

    const commands = buildGitCommands(repo, this.workspaceDir);

    for (const cmd of commands) {
      try {
        await execFileAsync('git', cmd.args, { cwd: cmd.cwd });
      } catch (error) {
        // Cleanup on failure
        await this.cleanup(true); // force cleanup on init failure
        const errMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Git command failed: git ${cmd.args.join(' ')}. Error: ${errMsg}`);
      }
    }

    return this.workspaceDir;
  }

  // Extracted to be easily mockable in unit tests
  async removeDirectory(dir: string): Promise<void> {
    await fs.rm(dir, { recursive: true, force: true });
  }

  async cleanup(force = false): Promise<void> {
    if (!this.workspaceDir) {
      return;
    }

    if (this.keepWorkspace && !force) {
      console.log(`[Workspace] Keeping workspace directory at: ${this.workspaceDir}`);
      return;
    }

    try {
      await this.removeDirectory(this.workspaceDir);
      console.log(`[Workspace] Cleaned up workspace directory at: ${this.workspaceDir}`);
      this.workspaceDir = null;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Workspace] Failed to delete workspace directory ${this.workspaceDir}: ${errMsg}`);
    }
  }
}

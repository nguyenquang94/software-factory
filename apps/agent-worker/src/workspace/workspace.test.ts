import { test } from 'node:test';
import * as assert from 'node:assert';
import { buildGitCommands, Workspace } from './workspace.js';

test('workspace - buildGitCommands returns correct git arguments and cwd', () => {
  const repo = {
    github: 'google/antigravity',
    base_branch: 'main',
    work_branch: 'factory/feature-1',
  };
  const workspaceDir = '/tmp/dummy-workspace';

  const commands = buildGitCommands(repo, workspaceDir);

  assert.equal(commands.length, 3);

  // Clone command
  assert.deepEqual(commands[0], {
    args: ['clone', '--filter=blob:none', 'https://github.com/google/antigravity.git', workspaceDir],
  });

  // Checkout base branch
  assert.deepEqual(commands[1], {
    args: ['checkout', 'main'],
    cwd: workspaceDir,
  });

  // Checkout work branch
  assert.deepEqual(commands[2], {
    args: ['checkout', '-b', 'factory/feature-1'],
    cwd: workspaceDir,
  });
});

test('workspace - Workspace cleanup respects keepWorkspace configuration', async () => {
  // Test keeping workspace
  const wsKeep = new Workspace(true);
  wsKeep.workspaceDir = '/tmp/fake-dir';
  
  let deleted = false;
  wsKeep.removeDirectory = async (dir: string) => {
    void dir;
    deleted = true;
  };

  // Under normal cleanup, it should NOT delete if keepWorkspace is true
  await wsKeep.cleanup();
  assert.equal(deleted, false);

  // If we force it, it should delete
  await wsKeep.cleanup(true);
  assert.equal(deleted, true);

  // Test not keeping workspace (keepWorkspace = false)
  deleted = false;
  const wsNoKeep = new Workspace(false);
  wsNoKeep.workspaceDir = '/tmp/fake-dir';
  wsNoKeep.removeDirectory = async (dir: string) => {
    void dir;
    deleted = true;
  };

  await wsNoKeep.cleanup();
  assert.equal(deleted, true);
});

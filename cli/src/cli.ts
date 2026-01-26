#!/usr/bin/env node

import { Command } from 'commander';
import { getRepoName } from './core/repo';
import { newPlan } from './commands/new';
import { savePlan } from './commands/plan';
import { saveReview } from './commands/review';
import { saveInstruction } from './commands/instruction';
import { gateCommand } from './commands/gate';
import { listPlans } from './commands/ls';
import { startImplementation } from './commands/start';
import { saveImpl } from './commands/impl';
import { saveImplReview } from './commands/impl-review';
import { syncCommand } from './commands/sync';

const repoName = getRepoName();

function output(line: string): void {
  console.log(`REPO=${repoName}\t${line}`);
}

function error(message: string): void {
  console.error(`ERROR: ${message}`);
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', reject);
  });
}

const program = new Command();

program
  .name('vdev')
  .description('Plan management CLI v3.0')
  .version('3.0.0');

program
  .command('new <name>')
  .description('Create a new plan topic')
  .option('--force', 'Force sync CLAUDE.md even if differs')
  .action((name: string, options: { force?: boolean }) => {
    const result = newPlan(name, options.force ?? false);
    if (result.success) {
      output(`CREATED\t${result.topic}\t${result.path}`);
      if (result.syncResult && !result.syncResult.success) {
        if (result.syncResult.globalMissing) {
          error(
            'CLAUDE.md not found in system/adapters/claude/'
          );
        } else if (result.syncResult.hasDiff) {
          error(
            'CLAUDE.md differs from source (system/adapters/claude/CLAUDE.md)'
          );
          console.error("Hint: run 'vdev sync --force' to overwrite repo CLAUDE.md");
        }
        process.exit(1);
      }
      // Warning: vdev-flow.md issues
      if (result.vdevFlowResult && !result.vdevFlowResult.success) {
        if (result.vdevFlowResult.globalMissing) {
          console.error(
            'Warning: vdev-flow.md not found in system/docs/flow/'
          );
        } else if (result.vdevFlowResult.hasDiff) {
          console.error('Warning: vdev-flow.md differs from source');
          console.error("Hint: run 'vdev sync --force' to overwrite repo vdev-flow.md");
        }
      }
      // Warning: .claude issues
      if (result.claudeDirResult && !result.claudeDirResult.success) {
        if (result.claudeDirResult.sourceMissing) {
          console.error(
            'Warning: system/adapters/claude not found (skipped)'
          );
        } else if (result.claudeDirResult.hasDiff) {
          console.error(
            'Warning: .claude differs from source (system/adapters/claude)'
          );
          console.error("Hint: run 'vdev sync --force' to overwrite repo .claude");
        }
      }
      // Warning: .claude/knowledges issues
      if (result.knowledgesResult && !result.knowledgesResult.success) {
        if (result.knowledgesResult.manifestMissing) {
          // No longer uses manifest - this shouldn't happen
          console.error(
            'Warning: knowledges source files missing in system/docs/'
          );
        } else if (result.knowledgesResult.missingFiles.length > 0) {
          console.error(
            `Warning: Missing files in system/docs/: ${result.knowledgesResult.missingFiles.join(', ')}`
          );
        } else if (result.knowledgesResult.hasDiff) {
          console.error('Warning: .claude/knowledges differs from source');
          console.error("Hint: run 'vdev sync --force' to overwrite repo .claude/knowledges");
        }
      }
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('instruction <topic>')
  .description('Save instruction.md from stdin')
  .option('--stdin', 'Read from stdin')
  .action(async (topic: string, options: { stdin?: boolean }) => {
    if (!options.stdin) {
      error('--stdin flag required');
      process.exit(1);
    }
    const content = await readStdin();
    const result = saveInstruction(topic, content);
    if (result.success) {
      output(`INSTRUCTION_SAVED\t${result.topic}`);
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('plan <topic>')
  .description('Save plan.md from stdin')
  .option('--stdin', 'Read from stdin')
  .action(async (topic: string, options: { stdin?: boolean }) => {
    if (!options.stdin) {
      error('--stdin flag required');
      process.exit(1);
    }
    const content = await readStdin();
    const result = savePlan(topic, content);
    if (result.success) {
      output(`PLAN_SAVED\t${result.topic}`);
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('review <topic>')
  .description('Save design-review.md from stdin')
  .option('--stdin', 'Read from stdin')
  .action(async (topic: string, options: { stdin?: boolean }) => {
    if (!options.stdin) {
      error('--stdin flag required');
      process.exit(1);
    }
    const content = await readStdin();
    const result = saveReview(topic, content);
    if (result.success) {
      output(`REVIEW_SAVED\t${result.topic}\t${result.status}`);
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('start <topic>')
  .description('Start implementation (DESIGN_APPROVED -> IMPLEMENTING)')
  .action((topic: string) => {
    const result = startImplementation(topic);
    if (result.success) {
      output(`IMPLEMENTING\t${topic}`);
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('impl <topic>')
  .description('Save impl.md from stdin')
  .option('--stdin', 'Read from stdin')
  .action(async (topic: string, options: { stdin?: boolean }) => {
    if (!options.stdin) {
      error('--stdin flag required');
      process.exit(1);
    }
    const content = await readStdin();
    const result = saveImpl(topic, content);
    if (result.success) {
      output(`IMPL_SAVED\t${result.topic}`);
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('impl-review <topic>')
  .description('Save impl-review.md from stdin')
  .option('--stdin', 'Read from stdin')
  .action(async (topic: string, options: { stdin?: boolean }) => {
    if (!options.stdin) {
      error('--stdin flag required');
      process.exit(1);
    }
    const content = await readStdin();
    const result = saveImplReview(topic, content);
    if (result.success) {
      output(`IMPL_REVIEW_SAVED\t${result.topic}\t${result.status}`);
    } else {
      error(result.message);
      process.exit(1);
    }
  });

program
  .command('gate <topic>')
  .description('Check gate status for a topic')
  .action((topic: string) => {
    const result = gateCommand(topic);
    output(`${result.status}\t${topic}\t${result.message}`);
    process.exit(result.exitCode);
  });

program
  .command('sync')
  .description('Sync CLAUDE.md and other assets from system/')
  .option('--force', 'Force overwrite even if differs')
  .action((options: { force?: boolean }) => {
    const result = syncCommand(options.force ?? false);

    // CLAUDE.md result determines success/failure
    if (result.success) {
      output(`SYNCED\t${result.message}`);

      // Output vdev-flow.md result (success only)
      if (result.vdevFlowResult?.success) {
        output(`SYNCED\t${result.vdevFlowResult.message}`);
      }

      // Output .claude result (success only)
      if (result.claudeDirResult?.success) {
        output(`SYNCED\t${result.claudeDirResult.message}`);
      }

      // Output .claude/knowledges result (success only)
      if (result.knowledgesResult?.success) {
        output(`SYNCED\t${result.knowledgesResult.message}`);
      }
    } else {
      // CLAUDE.md error handling
      if (result.syncResult.globalMissing) {
        error(
          'CLAUDE.md not found in system/adapters/claude/'
        );
      } else if (result.syncResult.hasDiff) {
        error(
          'CLAUDE.md differs from source (system/adapters/claude/CLAUDE.md)'
        );
        console.error("Hint: run 'vdev sync --force' to overwrite repo CLAUDE.md");
      } else {
        error(result.message);
      }
      process.exit(1);
    }

    // Warning: vdev-flow.md issues
    if (result.vdevFlowResult && !result.vdevFlowResult.success) {
      if (result.vdevFlowResult.globalMissing) {
        console.error(
          'Warning: vdev-flow.md not found in system/docs/flow/'
        );
      } else if (result.vdevFlowResult.hasDiff) {
        console.error('Warning: vdev-flow.md differs from source');
        console.error("Hint: run 'vdev sync --force' to overwrite repo vdev-flow.md");
      }
    }
    // Warning: .claude issues
    if (result.claudeDirResult && !result.claudeDirResult.success) {
      if (result.claudeDirResult.sourceMissing) {
        console.error(
          'Warning: system/adapters/claude not found (skipped)'
        );
      } else if (result.claudeDirResult.hasDiff) {
        console.error(
          'Warning: .claude differs from source (system/adapters/claude)'
        );
        console.error("Hint: run 'vdev sync --force' to overwrite repo .claude");
      }
    }
    // Warning: .claude/knowledges issues
    if (result.knowledgesResult && !result.knowledgesResult.success) {
      if (result.knowledgesResult.manifestMissing) {
        // No longer uses manifest
        console.error(
          'Warning: knowledges source files missing in system/docs/'
        );
      } else if (result.knowledgesResult.missingFiles.length > 0) {
        console.error(
          `Warning: Missing files in system/docs/: ${result.knowledgesResult.missingFiles.join(', ')}`
        );
      } else if (result.knowledgesResult.hasDiff) {
        console.error('Warning: .claude/knowledges differs from source');
        console.error("Hint: run 'vdev sync --force' to overwrite repo .claude/knowledges");
      }
    }
  });

program
  .command('ls')
  .description('List all plans')
  .action(() => {
    const entries = listPlans();
    for (const entry of entries) {
      output(`${entry.topic}\t${entry.status}\t${entry.title}\t${entry.updatedAt}`);
    }
  });

program.parse();

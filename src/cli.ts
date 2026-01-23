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
  .description('Plan management CLI v2.0')
  .version('2.0.0');

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
            'Global CLAUDE.md not found (~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md)'
          );
        } else if (result.syncResult.hasDiff) {
          error(
            'CLAUDE.md differs from global rules (source=~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md)'
          );
          console.error("Hint: run 'vdev sync --force' to overwrite repo CLAUDE.md");
        }
        process.exit(1);
      }
      // 【警告】vdev-flow.md の問題は警告として出力（exit code は変えない）
      if (result.vdevFlowResult && !result.vdevFlowResult.success) {
        if (result.vdevFlowResult.globalMissing) {
          console.error(
            'Warning: Global vdev-flow.md not found (~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-flow.md)'
          );
        } else if (result.vdevFlowResult.hasDiff) {
          console.error('Warning: vdev-flow.md differs from global rules');
          console.error("Hint: run 'vdev sync --force' to overwrite repo vdev-flow.md");
        }
        // exit(1) しない - 警告のみ
      }
      // 【警告】.claude の問題は警告として出力（exit code は変えない）
      if (result.claudeDirResult && !result.claudeDirResult.success) {
        if (result.claudeDirResult.sourceMissing) {
          console.error(
            'Warning: ~/projects/ai-resources/vibe-coding-partner/claude not found (skipped)'
          );
        } else if (result.claudeDirResult.hasDiff) {
          console.error(
            'Warning: .claude differs from source (~/projects/ai-resources/vibe-coding-partner/claude)'
          );
          console.error("Hint: run 'vdev sync --force' to overwrite repo .claude");
        }
        // exit(1) しない - 警告のみ
      }
      // 【警告】.claude/knowledges の問題は警告として出力（exit code は変えない）
      if (result.knowledgesResult && !result.knowledgesResult.success) {
        if (result.knowledgesResult.manifestMissing) {
          console.error(
            'Warning: knowledge-manifest.txt not found (~/projects/ai-resources/vibe-coding-partner/claude/knowledge-manifest.txt)'
          );
        } else if (result.knowledgesResult.missingFiles.length > 0) {
          console.error(
            `Warning: Missing files in knowledges/: ${result.knowledgesResult.missingFiles.join(', ')}`
          );
        } else if (result.knowledgesResult.hasDiff) {
          console.error('Warning: .claude/knowledges differs from source');
          console.error("Hint: run 'vdev sync --force' to overwrite repo .claude/knowledges");
        }
        // exit(1) しない - 警告のみ
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
  .description('Sync CLAUDE.md from global source')
  .option('--force', 'Force overwrite even if differs')
  .action((options: { force?: boolean }) => {
    const result = syncCommand(options.force ?? false);

    // CLAUDE.md の結果で成功/失敗を判定（従来通り）
    if (result.success) {
      output(`SYNCED\t${result.message}`);

      // vdev-flow.md の結果を追加出力（成功時のみ）
      if (result.vdevFlowResult?.success) {
        output(`SYNCED\t${result.vdevFlowResult.message}`);
      }

      // .claude の結果を追加出力（成功時のみ）
      if (result.claudeDirResult?.success) {
        output(`SYNCED\t${result.claudeDirResult.message}`);
      }

      // .claude/knowledges の結果を追加出力（成功時のみ）
      if (result.knowledgesResult?.success) {
        output(`SYNCED\t${result.knowledgesResult.message}`);
      }
    } else {
      // CLAUDE.md のエラー処理
      if (result.syncResult.globalMissing) {
        error(
          'Global CLAUDE.md not found (~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md)'
        );
      } else if (result.syncResult.hasDiff) {
        error(
          'CLAUDE.md differs from global rules (source=~/projects/ai-resources/vibe-coding-partner/claude/CLAUDE.md)'
        );
        console.error("Hint: run 'vdev sync --force' to overwrite repo CLAUDE.md");
      } else {
        error(result.message);
      }
      process.exit(1);
    }

    // 【警告】vdev-flow.md の問題は警告として出力（exit code は変えない）
    if (result.vdevFlowResult && !result.vdevFlowResult.success) {
      if (result.vdevFlowResult.globalMissing) {
        console.error(
          'Warning: Global vdev-flow.md not found (~/projects/ai-resources/vibe-coding-partner/knowledges/vdev-flow.md)'
        );
      } else if (result.vdevFlowResult.hasDiff) {
        console.error('Warning: vdev-flow.md differs from global rules');
        console.error("Hint: run 'vdev sync --force' to overwrite repo vdev-flow.md");
      }
      // exit(1) しない - 警告のみ
    }
    // 【警告】.claude の問題は警告として出力（exit code は変えない）
    if (result.claudeDirResult && !result.claudeDirResult.success) {
      if (result.claudeDirResult.sourceMissing) {
        console.error(
          'Warning: ~/projects/ai-resources/vibe-coding-partner/claude not found (skipped)'
        );
      } else if (result.claudeDirResult.hasDiff) {
        console.error(
          'Warning: .claude differs from source (~/projects/ai-resources/vibe-coding-partner/claude)'
        );
        console.error("Hint: run 'vdev sync --force' to overwrite repo .claude");
      }
      // exit(1) しない - 警告のみ
    }
    // 【警告】.claude/knowledges の問題は警告として出力（exit code は変えない）
    if (result.knowledgesResult && !result.knowledgesResult.success) {
      if (result.knowledgesResult.manifestMissing) {
        console.error(
          'Warning: knowledge-manifest.txt not found (~/projects/ai-resources/vibe-coding-partner/claude/knowledge-manifest.txt)'
        );
      } else if (result.knowledgesResult.missingFiles.length > 0) {
        console.error(
          `Warning: Missing files in knowledges/: ${result.knowledgesResult.missingFiles.join(', ')}`
        );
      } else if (result.knowledgesResult.hasDiff) {
        console.error('Warning: .claude/knowledges differs from source');
        console.error("Hint: run 'vdev sync --force' to overwrite repo .claude/knowledges");
      }
      // exit(1) しない - 警告のみ
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

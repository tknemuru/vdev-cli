#!/usr/bin/env node

import { Command } from 'commander';
import { getRepoName } from './core/repo';
import { newPlan } from './commands/new';
import { savePlan } from './commands/plan';
import { saveReview } from './commands/review';
import { saveInstruction } from './commands/instruction';
import { gateCommand } from './commands/gate';
import { listPlans } from './commands/ls';
import { checkRun } from './commands/run';

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
  .description('Plan management CLI')
  .version('0.1.0');

program
  .command('new <name>')
  .description('Create a new plan topic')
  .action((name: string) => {
    const result = newPlan(name);
    if (result.success) {
      output(`CREATED\t${result.topic}\t${result.path}`);
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
  .description('Save review.md from stdin')
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
  .command('gate <topic>')
  .description('Check gate status for a topic')
  .action((topic: string) => {
    const result = gateCommand(topic);
    output(`${result.status}\t${topic}\t${result.message}`);
    process.exit(result.exitCode);
  });

program
  .command('run <topic>')
  .description('Check if implementation is allowed')
  .action((topic: string) => {
    const result = checkRun(topic);
    if (result.allowed) {
      output(`RUN_ALLOWED\t${topic}`);
    } else {
      output(`RUN_BLOCKED\t${topic}\t${result.status}`);
    }
    process.exit(result.exitCode);
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

#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageInfo = require('../package.json');

const program = new Command();

program
  .name('shell-plugin')
  .description('Shell Platform Plugin Development Kit')
  .version(packageInfo.version);

// Create command
program
  .command('create')
  .description('Create a new plugin')
  .argument('<name>', 'plugin name')
  .option('-t, --template <template>', 'plugin template to use', 'basic')
  .option('-d, --directory <directory>', 'output directory', '.')
  .option('--typescript', 'use TypeScript template', false)
  .option('--no-git', 'skip git repository initialization', false)
  .action(require('./commands/create'));

// Dev command
program
  .command('dev')
  .description('Start development server for plugin')
  .option('-p, --port <port>', 'development server port', '3001')
  .option('-h, --host <host>', 'development server host', 'localhost')
  .option('--hot', 'enable hot module replacement', true)
  .action(require('./commands/dev'));

// Build command
program
  .command('build')
  .description('Build plugin for production')
  .option('-o, --output <directory>', 'output directory', 'dist')
  .option('--analyze', 'analyze bundle size', false)
  .option('--source-map', 'generate source maps', false)
  .action(require('./commands/build'));

// Validate command
program
  .command('validate')
  .description('Validate plugin configuration and code')
  .option('-f, --fix', 'automatically fix issues where possible', false)
  .option('--strict', 'use strict validation rules', false)
  .action(require('./commands/validate'));

// Test command
program
  .command('test')
  .description('Run plugin tests')
  .option('--watch', 'watch mode', false)
  .option('--coverage', 'generate coverage report', false)
  .option('--ci', 'run in CI mode', false)
  .action(require('./commands/test'));

// Package command
program
  .command('package')
  .description('Package plugin for distribution')
  .option('-o, --output <file>', 'output file path')
  .option('--registry <url>', 'target registry URL')
  .option('--sign', 'sign the package', false)
  .action(require('./commands/package'));

// Publish command
program
  .command('publish')
  .description('Publish plugin to registry')
  .option('--registry <url>', 'registry URL')
  .option('--access <level>', 'package access level', 'public')
  .option('--dry-run', 'perform a dry run', false)
  .action(require('./commands/publish'));

// Install command
program
  .command('install')
  .description('Install plugin dependencies')
  .option('--production', 'install production dependencies only', false)
  .option('--frozen-lockfile', 'use exact versions from lockfile', false)
  .action(require('./commands/install'));

// Lint command
program
  .command('lint')
  .description('Lint plugin code')
  .option('-f, --fix', 'automatically fix issues', false)
  .option('--quiet', 'report errors only', false)
  .action(require('./commands/lint'));

// Generate command
program
  .command('generate')
  .alias('g')
  .description('Generate plugin components and files')
  .argument('<type>', 'type of file to generate (component, service, hook, etc.)')
  .argument('<name>', 'name of the generated file')
  .option('-d, --directory <directory>', 'target directory', 'src')
  .option('--typescript', 'generate TypeScript files', true)
  .action(require('./commands/generate'));

// Info command
program
  .command('info')
  .description('Display plugin information and environment')
  .option('--json', 'output as JSON', false)
  .action(require('./commands/info'));

// Docs command
program
  .command('docs')
  .description('Generate plugin documentation')
  .option('-o, --output <directory>', 'output directory', 'docs')
  .option('--serve', 'serve documentation locally', false)
  .option('--port <port>', 'documentation server port', '3000')
  .action(require('./commands/docs'));

// Doctor command
program
  .command('doctor')
  .description('Diagnose plugin development environment')
  .action(require('./commands/doctor'));

// Upgrade command
program
  .command('upgrade')
  .description('Upgrade plugin dependencies and configuration')
  .option('--latest', 'upgrade to latest versions', false)
  .option('--interactive', 'interactive upgrade', false)
  .action(require('./commands/upgrade'));

// Error handling
program.configureOutput({
  outputError: (str, write) => write(chalk.red(str))
});

program.exitOverride();

try {
  program.parse();
} catch (err) {
  if (err.code === 'commander.unknownCommand') {
    console.error(chalk.red(`Unknown command: ${err.message}`));
    console.log(chalk.yellow('Run "shell-plugin --help" to see available commands'));
  } else if (err.code === 'commander.missingArgument') {
    console.error(chalk.red(`Missing argument: ${err.message}`));
  } else {
    console.error(chalk.red('An error occurred:'), err.message);
  }
  process.exit(1);
}
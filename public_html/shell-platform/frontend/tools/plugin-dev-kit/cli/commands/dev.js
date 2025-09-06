const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');

async function dev(options) {
  try {
    console.log(chalk.blue('🚀 Starting plugin development server...\n'));

    // Check if we're in a plugin directory
    const pluginConfig = await findPluginConfig();
    if (!pluginConfig) {
      console.error(chalk.red('❌ Not in a plugin directory. Run this command from your plugin root.'));
      process.exit(1);
    }

    console.log(chalk.green(`📦 Plugin: ${pluginConfig.name}`));
    console.log(chalk.green(`🌐 Port: ${options.port}`));
    console.log(chalk.green(`🏠 Host: ${options.host}`));
    
    if (options.hot) {
      console.log(chalk.green('🔥 Hot Module Replacement: Enabled'));
    }

    const spinner = ora('Starting development server...').start();

    // Check if package.json has dev script
    const hasDevScript = await checkDevScript();
    if (!hasDevScript) {
      spinner.fail(chalk.red('❌ No "dev" script found in package.json'));
      console.log(chalk.yellow('💡 Make sure your package.json has a "dev" script configured.'));
      process.exit(1);
    }

    spinner.stop();

    // Start the development server
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: options.port,
        HOST: options.host,
        HOT: options.hot ? 'true' : 'false'
      }
    });

    // Handle process events
    devProcess.on('error', (error) => {
      console.error(chalk.red('❌ Failed to start development server:'), error.message);
      process.exit(1);
    });

    devProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`❌ Development server exited with code ${code}`));
        process.exit(code);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'));
      devProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'));
      devProcess.kill('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('\nError starting development server:'), error.message);
    process.exit(1);
  }
}

async function findPluginConfig() {
  const cwd = process.cwd();
  
  // Check for package.json
  const packagePath = path.join(cwd, 'package.json');
  if (await fs.pathExists(packagePath)) {
    const packageJson = await fs.readJson(packagePath);
    
    // Basic validation for plugin structure
    if (packageJson.name && 
        (packageJson.name.includes('plugin') || 
         packageJson.description?.includes('plugin') ||
         packageJson.keywords?.includes('plugin'))) {
      return packageJson;
    }
  }
  
  // Check for plugin.config.js
  const configPath = path.join(cwd, 'plugin.config.js');
  if (await fs.pathExists(configPath)) {
    try {
      return require(configPath);
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to load plugin.config.js'));
    }
  }
  
  return null;
}

async function checkDevScript() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (await fs.pathExists(packagePath)) {
    const packageJson = await fs.readJson(packagePath);
    return !!(packageJson.scripts && packageJson.scripts.dev);
  }
  
  return false;
}

module.exports = dev;
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { execSync } = require('child_process');
const handlebars = require('handlebars');

const TEMPLATES = {
  basic: 'Basic plugin with minimal setup',
  dashboard: 'Dashboard plugin with charts and widgets',
  crud: 'CRUD plugin with forms and data management',
  settings: 'Settings plugin with configuration UI',
  integration: 'Integration plugin for external services'
};

async function create(name, options) {
  try {
    console.log(chalk.blue('\n🚀 Shell Platform Plugin Generator\n'));

    // Validate plugin name
    if (!isValidPluginName(name)) {
      console.error(chalk.red('❌ Invalid plugin name. Use lowercase letters, numbers, and hyphens only.'));
      process.exit(1);
    }

    // Get template choice if not specified
    let template = options.template;
    if (!TEMPLATES[template]) {
      const { selectedTemplate } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedTemplate',
          message: 'Choose a plugin template:',
          choices: Object.entries(TEMPLATES).map(([key, description]) => ({
            name: `${key} - ${description}`,
            value: key
          }))
        }
      ]);
      template = selectedTemplate;
    }

    // Get additional information
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'displayName',
        message: 'Plugin display name:',
        default: name.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      },
      {
        type: 'input',
        name: 'description',
        message: 'Plugin description:',
        default: `A ${template} plugin for Shell Platform`
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: 'Your Name'
      },
      {
        type: 'input',
        name: 'version',
        message: 'Initial version:',
        default: '1.0.0'
      },
      {
        type: 'input',
        name: 'port',
        message: 'Development server port:',
        default: '3001',
        validate: (input) => {
          const port = parseInt(input);
          return (port >= 1024 && port <= 65535) ? true : 'Port must be between 1024 and 65535';
        }
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select additional features:',
        choices: [
          { name: 'TypeScript support', value: 'typescript', checked: options.typescript },
          { name: 'Testing setup (Jest + Testing Library)', value: 'testing' },
          { name: 'Linting (ESLint + Prettier)', value: 'linting' },
          { name: 'Hot module replacement', value: 'hmr' },
          { name: 'Bundle analyzer', value: 'analyzer' },
          { name: 'Storybook integration', value: 'storybook' },
          { name: 'Docker support', value: 'docker' }
        ]
      },
      {
        type: 'checkbox',
        name: 'permissions',
        message: 'Required permissions:',
        choices: [
          { name: 'Read dashboard data', value: 'read:dashboard' },
          { name: 'Write dashboard data', value: 'write:dashboard' },
          { name: 'Read user data', value: 'read:users' },
          { name: 'Write user data', value: 'write:users' },
          { name: 'Read analytics data', value: 'read:analytics' },
          { name: 'Read settings', value: 'read:settings' },
          { name: 'Write settings', value: 'write:settings' },
          { name: 'File operations', value: 'read:files' }
        ]
      }
    ]);

    const pluginDir = path.join(options.directory, name);
    
    // Check if directory exists
    if (await fs.pathExists(pluginDir)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${name} already exists. Overwrite?`,
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('❌ Plugin creation cancelled.'));
        process.exit(0);
      }
      
      await fs.remove(pluginDir);
    }

    const spinner = ora('Creating plugin structure...').start();

    try {
      // Create plugin directory
      await fs.ensureDir(pluginDir);

      // Template data
      const templateData = {
        name,
        displayName: answers.displayName,
        description: answers.description,
        author: answers.author,
        version: answers.version,
        port: answers.port,
        features: answers.features,
        permissions: answers.permissions,
        template,
        typescript: answers.features.includes('typescript'),
        testing: answers.features.includes('testing'),
        linting: answers.features.includes('linting'),
        hmr: answers.features.includes('hmr'),
        analyzer: answers.features.includes('analyzer'),
        storybook: answers.features.includes('storybook'),
        docker: answers.features.includes('docker'),
        kebabCase: name,
        pascalCase: name.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(''),
        camelCase: name.split('-').map((word, index) => 
          index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
        ).join(''),
        containerName: name.replace(/-/g, '_'),
        year: new Date().getFullYear()
      };

      // Copy and process template files
      await copyTemplate(template, pluginDir, templateData);
      
      spinner.text = 'Installing dependencies...';

      // Install dependencies
      if (answers.features.includes('testing') || answers.features.includes('linting')) {
        await installDependencies(pluginDir, templateData);
      }

      spinner.text = 'Initializing git repository...';

      // Initialize git if requested
      if (options.git) {
        await initializeGit(pluginDir);
      }

      spinner.succeed(chalk.green('✅ Plugin created successfully!'));

      // Print success message
      printSuccessMessage(name, pluginDir, templateData);

    } catch (error) {
      spinner.fail(chalk.red('❌ Failed to create plugin'));
      throw error;
    }

  } catch (error) {
    console.error(chalk.red('\nError creating plugin:'), error.message);
    process.exit(1);
  }
}

function isValidPluginName(name) {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name) && name.length >= 3 && name.length <= 50;
}

async function copyTemplate(templateName, targetDir, data) {
  const templateDir = path.join(__dirname, '../../templates', templateName);
  
  if (!await fs.pathExists(templateDir)) {
    // Use basic template as fallback
    const basicTemplateDir = path.join(__dirname, '../../templates/basic');
    await copyTemplateFiles(basicTemplateDir, targetDir, data);
  } else {
    await copyTemplateFiles(templateDir, targetDir, data);
  }
}

async function copyTemplateFiles(sourceDir, targetDir, data) {
  const files = await fs.readdir(sourceDir);
  
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file.replace(/^_/, '.'));
    
    const stat = await fs.stat(sourcePath);
    
    if (stat.isDirectory()) {
      await fs.ensureDir(targetPath);
      await copyTemplateFiles(sourcePath, targetPath, data);
    } else {
      // Process template files
      if (file.endsWith('.hbs') || file.endsWith('.template')) {
        const content = await fs.readFile(sourcePath, 'utf8');
        const template = handlebars.compile(content);
        const processed = template(data);
        const finalPath = targetPath.replace(/\.(hbs|template)$/, '');
        await fs.writeFile(finalPath, processed);
      } else {
        await fs.copy(sourcePath, targetPath);
      }
    }
  }
}

async function installDependencies(pluginDir, data) {
  const packageManagerChoices = ['npm', 'yarn', 'pnpm'];
  
  // Detect available package managers
  const availableManagers = packageManagerChoices.filter(manager => {
    try {
      execSync(`${manager} --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });

  if (availableManagers.length === 0) {
    console.warn(chalk.yellow('⚠️  No package manager found. Please install dependencies manually.'));
    return;
  }

  const packageManager = availableManagers.includes('yarn') ? 'yarn' : availableManagers[0];

  try {
    execSync(`${packageManager} install`, {
      cwd: pluginDir,
      stdio: 'ignore'
    });
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to install dependencies. Please run manually:'));
    console.log(chalk.gray(`   cd ${path.basename(pluginDir)} && ${packageManager} install`));
  }
}

async function initializeGit(pluginDir) {
  try {
    execSync('git init', { cwd: pluginDir, stdio: 'ignore' });
    execSync('git add .', { cwd: pluginDir, stdio: 'ignore' });
    execSync('git commit -m "Initial commit: Plugin scaffolding"', { 
      cwd: pluginDir, 
      stdio: 'ignore' 
    });
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to initialize git repository'));
  }
}

function printSuccessMessage(name, pluginDir, data) {
  console.log(chalk.green('\n🎉 Plugin created successfully!\n'));
  console.log(chalk.bold('Plugin Details:'));
  console.log(`  Name: ${chalk.cyan(data.displayName)}`);
  console.log(`  ID: ${chalk.cyan(name)}`);
  console.log(`  Template: ${chalk.cyan(data.template)}`);
  console.log(`  Directory: ${chalk.cyan(pluginDir)}`);
  console.log(`  Port: ${chalk.cyan(data.port)}`);
  
  if (data.features.length > 0) {
    console.log(`  Features: ${chalk.cyan(data.features.join(', '))}`);
  }
  
  if (data.permissions.length > 0) {
    console.log(`  Permissions: ${chalk.cyan(data.permissions.join(', '))}`);
  }

  console.log(chalk.bold('\nNext steps:'));
  console.log(chalk.gray(`  cd ${path.basename(pluginDir)}`));
  console.log(chalk.gray('  npm run dev          # Start development server'));
  console.log(chalk.gray('  npm run build        # Build for production'));
  console.log(chalk.gray('  npm test             # Run tests'));
  
  console.log(chalk.bold('\nUseful commands:'));
  console.log(chalk.gray('  shell-plugin dev     # Start with hot reload'));
  console.log(chalk.gray('  shell-plugin build   # Production build'));
  console.log(chalk.gray('  shell-plugin test    # Run tests'));
  console.log(chalk.gray('  shell-plugin lint    # Lint code'));
  console.log(chalk.gray('  shell-plugin docs    # Generate docs'));
  
  console.log(chalk.blue('\nHappy coding! 🚀\n'));
}

module.exports = create;
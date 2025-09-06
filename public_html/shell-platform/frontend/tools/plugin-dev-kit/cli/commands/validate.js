const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Joi = require('joi');
const ora = require('ora');

// Plugin configuration schema
const pluginConfigSchema = Joi.object({
  name: Joi.string()
    .pattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': 'Plugin name should contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Plugin name should be at least 3 characters long',
      'string.max': 'Plugin name should be no more than 50 characters long'
    }),
  
  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/)
    .required()
    .messages({
      'string.pattern.base': 'Version should follow semantic versioning (e.g., 1.0.0)'
    }),
  
  description: Joi.string().required(),
  author: Joi.string().required(),
  
  main: Joi.string().default('dist/remoteEntry.js'),
  
  scripts: Joi.object({
    dev: Joi.string().required(),
    build: Joi.string().required(),
    test: Joi.string().optional(),
    lint: Joi.string().optional()
  }).required(),
  
  dependencies: Joi.object().pattern(
    Joi.string(),
    Joi.string().pattern(/^[\^~]?\d+\.\d+\.\d+/)
  ).optional(),
  
  devDependencies: Joi.object().pattern(
    Joi.string(),
    Joi.string()
  ).optional(),
  
  peerDependencies: Joi.object({
    'react': Joi.string().required(),
    'react-dom': Joi.string().required()
  }).required(),
  
  keywords: Joi.array().items(Joi.string()).optional(),
  license: Joi.string().optional(),
  
  // Plugin-specific fields
  pluginConfig: Joi.object({
    category: Joi.string().valid(
      'dashboard', 'user-management', 'analytics', 'settings', 
      'file-management', 'communication', 'productivity', 'integration'
    ).required(),
    
    permissions: Joi.array().items(
      Joi.string().valid(
        'read:dashboard', 'write:dashboard', 'read:users', 'write:users',
        'delete:users', 'manage:roles', 'manage:permissions', 'read:analytics',
        'write:analytics', 'read:reports', 'generate:reports', 'read:settings',
        'write:settings', 'admin:settings', 'read:files', 'write:files',
        'delete:files', 'upload:files', 'download:files', 'read:metrics'
      )
    ).required(),
    
    routes: Joi.array().items(
      Joi.object({
        path: Joi.string().pattern(/^\//).required(),
        component: Joi.string().required(),
        exact: Joi.boolean().default(true),
        title: Joi.string().optional(),
        protected: Joi.boolean().default(true),
        permissions: Joi.array().items(Joi.string()).optional()
      })
    ).optional(),
    
    menuItems: Joi.array().items(
      Joi.object({
        id: Joi.string().required(),
        label: Joi.string().required(),
        icon: Joi.string().optional(),
        path: Joi.string().optional(),
        order: Joi.number().required(),
        permissions: Joi.array().items(Joi.string()).optional(),
        children: Joi.array().items(Joi.link('#menuItem')).optional()
      }).id('menuItem')
    ).optional(),
    
    settings: Joi.array().items(
      Joi.object({
        key: Joi.string().required(),
        label: Joi.string().required(),
        type: Joi.string().valid('string', 'number', 'boolean', 'select', 'multi-select').required(),
        defaultValue: Joi.any().required(),
        options: Joi.when('type', {
          is: Joi.valid('select', 'multi-select'),
          then: Joi.array().items(
            Joi.object({
              label: Joi.string().required(),
              value: Joi.any().required()
            })
          ).required(),
          otherwise: Joi.optional()
        }),
        required: Joi.boolean().default(false),
        description: Joi.string().optional()
      })
    ).optional(),
    
    features: Joi.array().items(Joi.string()).optional()
  }).optional()
}).unknown(true);

async function validate(options) {
  const spinner = ora('Validating plugin...').start();
  
  try {
    const results = {
      packageJson: { valid: false, errors: [], warnings: [] },
      structure: { valid: false, errors: [], warnings: [] },
      code: { valid: false, errors: [], warnings: [] },
      security: { valid: false, errors: [], warnings: [] }
    };

    // Validate package.json
    await validatePackageJson(results.packageJson, options);
    
    // Validate project structure
    await validateProjectStructure(results.structure, options);
    
    // Validate code quality
    await validateCode(results.code, options);
    
    // Validate security
    await validateSecurity(results.security, options);
    
    spinner.stop();
    
    // Print results
    printValidationResults(results);
    
    // Auto-fix issues if requested
    if (options.fix) {
      await autoFixIssues(results);
    }
    
    // Exit with error if validation failed
    const hasErrors = Object.values(results).some(result => !result.valid);
    if (hasErrors) {
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ Plugin validation passed!'));
    }
    
  } catch (error) {
    spinner.fail(chalk.red('❌ Validation failed'));
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function validatePackageJson(result, options) {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!await fs.pathExists(packagePath)) {
    result.errors.push('package.json not found');
    return;
  }
  
  try {
    const packageJson = await fs.readJson(packagePath);
    
    // Validate against schema
    const { error, value } = pluginConfigSchema.validate(packageJson, {
      abortEarly: false,
      allowUnknown: true
    });
    
    if (error) {
      result.errors.push(...error.details.map(detail => detail.message));
    } else {
      result.valid = true;
    }
    
    // Additional checks
    if (!packageJson.name?.endsWith('-plugin')) {
      result.warnings.push('Plugin name should end with "-plugin"');
    }
    
    if (!packageJson.keywords?.includes('shell-platform')) {
      result.warnings.push('Consider adding "shell-platform" to keywords');
    }
    
    // Check for required peer dependencies
    const requiredPeers = ['react', 'react-dom'];
    for (const peer of requiredPeers) {
      if (!packageJson.peerDependencies?.[peer]) {
        result.errors.push(`Missing peer dependency: ${peer}`);
      }
    }
    
    // Check scripts
    const requiredScripts = ['dev', 'build'];
    for (const script of requiredScripts) {
      if (!packageJson.scripts?.[script]) {
        result.errors.push(`Missing required script: ${script}`);
      }
    }
    
    // Check for common dev dependencies
    const recommendedDevDeps = ['typescript', 'eslint', '@types/react', '@types/react-dom'];
    const missingDevDeps = recommendedDevDeps.filter(dep => 
      !packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]
    );
    
    if (missingDevDeps.length > 0) {
      result.warnings.push(`Consider adding dev dependencies: ${missingDevDeps.join(', ')}`);
    }
    
  } catch (error) {
    result.errors.push(`Invalid package.json: ${error.message}`);
  }
}

async function validateProjectStructure(result, options) {
  const requiredFiles = [
    'package.json',
    'src',
    'vite.config.ts',
    'tsconfig.json'
  ];
  
  const recommendedFiles = [
    'README.md',
    '.gitignore',
    '.eslintrc.js',
    'jest.config.js',
    'src/index.tsx'
  ];
  
  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!await fs.pathExists(filePath)) {
      result.errors.push(`Missing required file/directory: ${file}`);
    }
  }
  
  // Check recommended files
  for (const file of recommendedFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!await fs.pathExists(filePath)) {
      result.warnings.push(`Missing recommended file: ${file}`);
    }
  }
  
  // Check src structure
  const srcPath = path.join(process.cwd(), 'src');
  if (await fs.pathExists(srcPath)) {
    const srcFiles = await fs.readdir(srcPath);
    
    if (!srcFiles.some(file => file.includes('Plugin') || file === 'index.tsx')) {
      result.warnings.push('No main plugin component found in src/');
    }
    
    // Check for TypeScript files
    const hasTS = srcFiles.some(file => file.endsWith('.ts') || file.endsWith('.tsx'));
    const hasJS = srcFiles.some(file => file.endsWith('.js') || file.endsWith('.jsx'));
    
    if (hasJS && hasTS) {
      result.warnings.push('Mixed JavaScript and TypeScript files found. Consider using one consistently.');
    }
  }
  
  // Check Vite config
  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  if (await fs.pathExists(viteConfigPath)) {
    try {
      const viteConfig = await fs.readFile(viteConfigPath, 'utf8');
      
      if (!viteConfig.includes('@originjs/vite-plugin-federation')) {
        result.errors.push('Vite config missing Module Federation plugin');
      }
      
      if (!viteConfig.includes('exposes')) {
        result.errors.push('Vite config missing module exposes configuration');
      }
      
      if (!viteConfig.includes('shared')) {
        result.warnings.push('Vite config missing shared dependencies configuration');
      }
      
    } catch (error) {
      result.errors.push(`Error reading vite.config.ts: ${error.message}`);
    }
  }
  
  result.valid = result.errors.length === 0;
}

async function validateCode(result, options) {
  const srcPath = path.join(process.cwd(), 'src');
  
  if (!await fs.pathExists(srcPath)) {
    result.errors.push('Source directory not found');
    return;
  }
  
  try {
    const files = await fs.readdir(srcPath, { recursive: true });
    const codeFiles = files.filter(file => 
      file.endsWith('.ts') || file.endsWith('.tsx') || 
      file.endsWith('.js') || file.endsWith('.jsx')
    );
    
    if (codeFiles.length === 0) {
      result.errors.push('No source code files found');
      return;
    }
    
    // Check for main component
    const hasMainComponent = codeFiles.some(file => 
      file.includes('Plugin') || file === 'index.tsx' || file === 'index.ts'
    );
    
    if (!hasMainComponent) {
      result.errors.push('No main plugin component found');
    }
    
    // Basic code quality checks
    for (const file of codeFiles) {
      const filePath = path.join(srcPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for React import
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        if (!content.includes('import React') && !content.includes('import * as React')) {
          result.warnings.push(`${file}: Missing React import`);
        }
      }
      
      // Check for console.log in production code
      if (content.includes('console.log(')) {
        result.warnings.push(`${file}: Contains console.log statements`);
      }
      
      // Check for TODO/FIXME comments
      const todos = content.match(/\/\/.*?(TODO|FIXME)/gi);
      if (todos) {
        result.warnings.push(`${file}: Contains ${todos.length} TODO/FIXME comments`);
      }
      
      // Check for proper TypeScript types
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        if (content.includes(': any')) {
          result.warnings.push(`${file}: Contains 'any' types`);
        }
      }
    }
    
    result.valid = result.errors.length === 0;
    
  } catch (error) {
    result.errors.push(`Error validating code: ${error.message}`);
  }
}

async function validateSecurity(result, options) {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (await fs.pathExists(packagePath)) {
    try {
      const packageJson = await fs.readJson(packagePath);
      
      // Check for potentially dangerous dependencies
      const dangerousDeps = ['eval', 'vm2', 'child_process', 'fs-extra'];
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      for (const dep of dangerousDeps) {
        if (allDeps[dep]) {
          result.warnings.push(`Potentially dangerous dependency: ${dep}`);
        }
      }
      
      // Check for outdated dependencies (simplified check)
      const outdatedPatterns = [/\d+\.\d+\.\d+-alpha/, /\d+\.\d+\.\d+-beta/, /\d+\.\d+\.\d+-rc/];
      
      for (const [name, version] of Object.entries(allDeps || {})) {
        if (typeof version === 'string' && outdatedPatterns.some(pattern => pattern.test(version))) {
          result.warnings.push(`Pre-release dependency: ${name}@${version}`);
        }
      }
      
    } catch (error) {
      result.errors.push(`Error checking dependencies: ${error.message}`);
    }
  }
  
  // Check source code for security issues
  const srcPath = path.join(process.cwd(), 'src');
  if (await fs.pathExists(srcPath)) {
    try {
      const files = await fs.readdir(srcPath, { recursive: true });
      const codeFiles = files.filter(file => 
        file.endsWith('.ts') || file.endsWith('.tsx') || 
        file.endsWith('.js') || file.endsWith('.jsx')
      );
      
      for (const file of codeFiles) {
        const filePath = path.join(srcPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Check for dangerous patterns
        const dangerousPatterns = [
          { pattern: /eval\s*\(/, message: 'Use of eval() function' },
          { pattern: /innerHTML\s*=/, message: 'Direct innerHTML assignment' },
          { pattern: /dangerouslySetInnerHTML/, message: 'Use of dangerouslySetInnerHTML' },
          { pattern: /document\.write/, message: 'Use of document.write' },
          { pattern: /<script/i, message: 'Inline script tags' }
        ];
        
        for (const { pattern, message } of dangerousPatterns) {
          if (pattern.test(content)) {
            result.warnings.push(`${file}: ${message}`);
          }
        }
      }
      
    } catch (error) {
      result.warnings.push(`Error scanning code for security issues: ${error.message}`);
    }
  }
  
  result.valid = result.errors.length === 0;
}

function printValidationResults(results) {
  console.log(chalk.bold('\n📋 Validation Results\n'));
  
  for (const [category, result] of Object.entries(results)) {
    const icon = result.valid ? '✅' : '❌';
    const status = result.valid ? chalk.green('PASSED') : chalk.red('FAILED');
    
    console.log(`${icon} ${chalk.bold(category.toUpperCase())}: ${status}`);
    
    if (result.errors.length > 0) {
      console.log(chalk.red('  Errors:'));
      result.errors.forEach(error => {
        console.log(chalk.red(`    • ${error}`));
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('  Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`    • ${warning}`));
      });
    }
    
    console.log();
  }
}

async function autoFixIssues(results) {
  console.log(chalk.blue('🔧 Auto-fixing issues...\n'));
  
  let fixCount = 0;
  
  // Fix common package.json issues
  const packagePath = path.join(process.cwd(), 'package.json');
  if (await fs.pathExists(packagePath)) {
    try {
      const packageJson = await fs.readJson(packagePath);
      let modified = false;
      
      // Add missing keywords
      if (!packageJson.keywords?.includes('shell-platform')) {
        packageJson.keywords = packageJson.keywords || [];
        packageJson.keywords.push('shell-platform', 'plugin');
        modified = true;
        fixCount++;
      }
      
      // Add missing scripts
      if (!packageJson.scripts?.lint) {
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts.lint = 'eslint . --ext .ts,.tsx,.js,.jsx';
        modified = true;
        fixCount++;
      }
      
      if (!packageJson.scripts?.test) {
        packageJson.scripts.test = 'jest';
        modified = true;
        fixCount++;
      }
      
      if (modified) {
        await fs.writeJson(packagePath, packageJson, { spaces: 2 });
        console.log(chalk.green('✅ Fixed package.json issues'));
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Failed to fix package.json issues'));
    }
  }
  
  // Create missing files
  const missingFiles = [
    { name: '.gitignore', content: 'node_modules/\ndist/\n*.log\n.env\n.env.local\n' },
    { name: 'README.md', content: '# Plugin\n\nDescription of your plugin.\n\n## Development\n\n```bash\nnpm run dev\n```\n' }
  ];
  
  for (const file of missingFiles) {
    const filePath = path.join(process.cwd(), file.name);
    if (!await fs.pathExists(filePath)) {
      await fs.writeFile(filePath, file.content);
      console.log(chalk.green(`✅ Created ${file.name}`));
      fixCount++;
    }
  }
  
  if (fixCount > 0) {
    console.log(chalk.green(`\n🎉 Fixed ${fixCount} issues automatically!`));
  } else {
    console.log(chalk.blue('\n💡 No auto-fixable issues found.'));
  }
}

module.exports = validate;
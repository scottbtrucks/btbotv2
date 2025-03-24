#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

async function checkSetup() {
  console.log(chalk.blue('🔍 Checking project setup...'));

  const requiredFiles = [
    '.env.example',
    '.eslintrc.json',
    '.gitignore',
    '.prettierrc',
    'jest.config.js',
    'jest.setup.js',
    'next.config.mjs',
    'package.json',
    'project.config.js',
    'tsconfig.json',
    'README.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'CODE_OF_CONDUCT.md'
  ];

  const requiredDirs = [
    'app',
    'components',
    'lib',
    'public',
    'styles',
    'tests',
    'types',
    '.github',
    '.husky'
  ];

  // Check required files
  console.log(chalk.yellow('\nChecking required files:'));
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      console.log(chalk.green(`✓ ${file} exists`));
    } catch {
      console.log(chalk.red(`✗ ${file} missing`));
    }
  }

  // Check required directories
  console.log(chalk.yellow('\nChecking required directories:'));
  for (const dir of requiredDirs) {
    try {
      await fs.access(dir);
      console.log(chalk.green(`✓ ${dir} exists`));
    } catch {
      console.log(chalk.red(`✗ ${dir} missing`));
    }
  }

  // Check git setup
  console.log(chalk.yellow('\nChecking Git setup:'));
  try {
    execSync('git rev-parse --is-inside-work-tree');
    console.log(chalk.green('✓ Git repository initialized'));
  } catch {
    console.log(chalk.red('✗ Git repository not initialized'));
  }

  // Check dependencies
  console.log(chalk.yellow('\nChecking dependencies:'));
  try {
    execSync('npm ls --json');
    console.log(chalk.green('✓ Dependencies installed correctly'));
  } catch {
    console.log(chalk.red('✗ Dependency issues found'));
  }

  // Check TypeScript
  console.log(chalk.yellow('\nChecking TypeScript:'));
  try {
    execSync('npx tsc --noEmit');
    console.log(chalk.green('✓ TypeScript compilation successful'));
  } catch {
    console.log(chalk.red('✗ TypeScript errors found'));
  }

  // Check ESLint
  console.log(chalk.yellow('\nChecking ESLint:'));
  try {
    execSync('npx eslint --quiet .');
    console.log(chalk.green('✓ No ESLint errors'));
  } catch {
    console.log(chalk.red('✗ ESLint errors found'));
  }

  console.log(chalk.blue('\n✨ Setup check complete!'));
}

checkSetup().catch(console.error);
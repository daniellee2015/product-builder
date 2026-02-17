#!/usr/bin/env node

/**
 * Product Builder CLI Entry Point
 *
 * This is the main entry point for the pb command-line tool.
 * It delegates to the compiled TypeScript code in dist/cli/
 */

const path = require('path');
const fs = require('fs');

// Check if compiled code exists
const distPath = path.join(__dirname, '../dist/cli/index.js');

if (!fs.existsSync(distPath)) {
  console.error('Error: Product Builder is not compiled yet.');
  console.error('Please run: npm run build');
  process.exit(1);
}

// Load and execute the compiled CLI
require(distPath);

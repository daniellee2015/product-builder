/**
 * Product Builder - Main Entry Point
 *
 * This is the main entry point for the Product Builder library.
 * It exports all public APIs for programmatic usage.
 */

// Configuration
export * from './config';

// Checkers
export * from './checkers';

// Installers
export * from './installers';

// Generators
export * from './generators';

// Orchestrator
export * from './orchestrator';

// CLI (for programmatic usage)
export { showMainMenu } from './cli/menu';

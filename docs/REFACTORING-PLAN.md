# Architecture Refactoring Plan

## Overview
Refactor the codebase to achieve clear separation of concerns between menu navigation logic and content display logic, with proper i18n support.

## Current Issues
1. Menu files contain both navigation logic and content display logic
2. Text content is hardcoded instead of using i18n keys
3. No clear separation between application code and shared libraries
4. Flat directory structure doesn't reflect menu hierarchy

## New Directory Structure

### Application Code (`src/`)
```
src/
  libs/                      # Shared libraries
    i18n/                    # Internationalization
      index.ts               # i18n initialization and exports
      loader.ts              # Language file loader
      types.ts               # i18n types

    display/                 # Display utilities
      formatters.ts          # Formatting functions (dates, numbers, etc.)
      renderers.ts           # Rendering helpers

    menu/                    # Menu utilities
      utils.ts               # Common menu utilities
      navigation.ts          # Navigation helpers

    theme/                   # Theme and colors
      colors.ts              # Color constants and configurations
      styles.ts              # Style configurations

    constants/               # Standard constants
      app.ts                 # Application-level constants
      workflow.ts            # Workflow-related constants
      paths.ts               # Path constants

    types/                   # Shared type definitions
      common.ts              # Common types
      menu.ts                # Menu-related types
      display.ts             # Display-related types

    config/                  # Configuration utilities
      loader.ts              # Configuration loader
      validator.ts           # Configuration validator
      defaults.ts            # Default configurations

    storage/                 # Storage utilities
      paths.ts               # User data path management
      loader.ts              # Load user data
      saver.ts               # Save user data

    validators/              # Validators
      input.ts               # Input validation
      schema.ts              # Schema validation

  cli/                       # CLI modules
    workflow/                # Workflow configuration module
      menu.ts                # Menu navigation logic only
      display.ts             # Content display logic

    llm/                     # LLM CLI configuration module
      menu.ts
      display.ts

    arch-tools/              # Architecture tools module
      menu.ts
      display.ts

    jobs-tasks/              # Jobs & tasks module
      menu.ts
      display.ts

    status/                  # Status module
      menu.ts
      display.ts

    main-menu.ts             # Main menu entry point
    menu-registry.ts         # Menu registry (stays at root)

  config/                    # Application configuration files
    workflow.json            # Default workflow configuration

  services/                  # Business logic services
    workflow-service.ts

  types/                     # Global type definitions
    workflow.ts
```

### User Data Structure (`~/.pb/`)
```
~/.pb/                       # User data directory
  workflows/                 # User workflows
    custom-*.json            # User imported/exported workflows

  config/                    # User configurations
    preferences.json         # User preferences
    llm-config.json          # LLM configuration

  cache/                     # Cache files
  logs/                      # Log files
  temp/                      # Temporary files
```

### Language Files (`src/libs/i18n/locales/`)
```
src/libs/i18n/
  locales/
    en.json                  # English translations
    zh.json                  # Chinese translations (if needed)
  index.ts
  loader.ts
  types.ts
```

## Refactoring Steps

### Phase 1: Setup Infrastructure
1. Create new directory structure
2. Setup i18n system
   - Create i18n loader and utilities
   - Create language files with keys
3. Create shared libraries structure
   - Move common utilities to libs/
   - Create theme/colors configuration
   - Create constants files

### Phase 2: Extract Display Logic
1. **workflow module**
   - Extract `displayWorkflow` from `workflow-menu.ts` to `workflow/display.ts`
   - Replace hardcoded strings with i18n keys
   - Keep only menu navigation logic in `workflow/menu.ts`

2. **llm module**
   - Extract display logic to `llm/display.ts`
   - Replace hardcoded strings with i18n keys

3. **arch-tools module**
   - Extract display logic to `arch-tools/display.ts`
   - Replace hardcoded strings with i18n keys

4. **jobs-tasks module**
   - Extract display logic to `jobs-tasks/display.ts`
   - Replace hardcoded strings with i18n keys

5. **status module**
   - Extract display logic to `status/display.ts`
   - Replace hardcoded strings with i18n keys

### Phase 3: Update Imports and References
1. Update all import statements to reflect new structure
2. Update menu registry to use new module paths
3. Update main menu to use new structure

### Phase 4: Testing and Validation
1. Test all menu navigation
2. Test all display functions
3. Test i18n key resolution
4. Verify no functionality is broken

## i18n Key Structure

### Example keys for workflow module
```json
{
  "workflow": {
    "menu": {
      "title": "Workflow Configuration",
      "view": "View workflow",
      "switchMode": "Switch mode",
      "edit": "Edit workflow",
      "import": "Import workflow",
      "export": "Export workflow",
      "reset": "Reset workflow"
    },
    "display": {
      "overview": "Workflow Overview",
      "basicInfo": "Basic Information",
      "workflowPhases": "Workflow Phases",
      "mode": "Mode",
      "description": "Description",
      "tools": "Tools",
      "activeSteps": "Active Steps",
      "reviewGates": "Review Gates",
      "version": "Version",
      "phase": "Phase"
    }
  }
}
```

## Benefits of New Architecture

1. **Clear Separation of Concerns**
   - Menu logic separate from display logic
   - Easy to test and maintain

2. **i18n Support**
   - All text externalized to language files
   - Easy to add new languages

3. **Modular Structure**
   - Each feature in its own module
   - Related code grouped together

4. **Reusable Libraries**
   - Common utilities in libs/
   - Shared across all modules

5. **Scalability**
   - Easy to add new modules
   - Clear patterns to follow

## Migration Strategy

1. Create new structure alongside existing code
2. Migrate one module at a time
3. Test each module after migration
4. Remove old code once migration is complete
5. Update documentation

## Notes

- Keep backward compatibility during migration
- Ensure all tests pass after each phase
- Document any breaking changes
- Update README with new structure

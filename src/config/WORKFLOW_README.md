# Workflow Configuration Guide

## Overview

`workflow.json` defines the Product Builder CLI's end-to-end workflow system with support for three progressive modes (Lite, Standard, Full) and runtime mode switching.

## Architecture

### Dual-Structure Design

The workflow uses two complementary structures:

1. **`phases` (Array)**: Unified Phase 0-4 view
   - Purpose: UI/progress tracking across all modes
   - Structure: Linear array of 5 phases
   - Usage: Display progress, show current phase

2. **`phase_registry` (Object)**: Modular step group library
   - Purpose: Execution engine, mode composition
   - Structure: 16 modules with mode-specific variants
   - Usage: Assemble workflows via `pipeline` arrays

### Three Progressive Modes

```
Lite (15 steps)
  ↓ adds OpenSpec, multi-model review
Standard (50 steps)
  ↓ adds auto-loop, independent testing
Full (55 steps)
```

Each mode composes different modules from `phase_registry`:

- **Lite**: `intake → planning_lite → execution_lite → testing_lite → review_lite → archiving_lite`
- **Standard**: `research → ideate → planning → execution_standard → optimize → review → archiving`
- **Full**: `research → ideate → planning → execution → testing → optimize → review → archiving`

### Mode Switching & Degradation

**Automatic Degradation** (when tools unavailable):
- Full → Standard (ralph unavailable)
- Full/Standard → Lite (ccb/cca unavailable)

**Manual Switching**: Supported at runtime via mode selection

## Naming Conventions

### Step IDs

Format: `P{phase}-{ACTION}_{OBJECT}`

Examples:
- `P0-COLLECT_USER_REQUIREMENT`
- `P1-GENERATE_PLANNING_DOCS`
- `P2-EXECUTE_TASK`

**Standards**:
- Use full words: `DOCUMENT` not `DOC`, `GIT_BRANCH` not `BRANCH`
- Use semantic IDs for execution
- Use `display_id` field for UI display (e.g., "P0-01")

### Module IDs

Format: `{function}_{mode_variant?}`

Examples:
- `intake` (Lite only)
- `planning_lite`, `planning_standard`, `planning` (Full)
- `execution_lite`, `execution_standard`, `execution` (Full)

## Maintenance Guidelines

### Before Editing

1. **Understand the dual structure**: Changes to `phase_registry` affect execution; changes to `phases` affect UI only
2. **Check mode implications**: Ensure changes respect Lite ⊂ Standard ⊂ Full relationship
3. **Verify tool dependencies**: Match tool requirements with mode capabilities

### Common Tasks

#### Adding a New Step

1. Add step definition to appropriate `phase_registry` module
2. Update mode's `enabled_steps` array
3. Add transitions in `transitions` array
4. Update `phases` if needed for UI display

#### Creating a Mode Variant

1. Create new module in `phase_registry` (e.g., `planning_standard`)
2. Define mode-specific steps
3. Update mode's `pipeline` array
4. Test degradation paths

#### Modifying Tool Requirements

1. Update `metadata.tools` (authoritative source)
2. Update `tool_registry`
3. Update mode's `required_tools` arrays
4. Verify consistency across all three locations

### Validation Checklist

Before committing changes:

- [ ] All step IDs in `enabled_steps` exist in `phase_registry`
- [ ] All `pipeline` modules exist in `phase_registry`
- [ ] All `transitions` reference valid step IDs
- [ ] Tool requirements are consistent across metadata/registry/modes
- [ ] Mode invariants are respected (e.g., Lite requires user confirmation)
- [ ] Schema version matches `$schema` URL

## CI Validation (Recommended)

Implement automated checks for:

1. **Reference Integrity**
   - All step IDs resolve correctly
   - All pipeline modules exist
   - All transitions have valid endpoints

2. **Mode Consistency**
   - Lite ⊂ Standard ⊂ Full relationship
   - Tool requirements match capabilities
   - Invariants are enforced

3. **Naming Standards**
   - Step IDs follow convention
   - No `*_DOC` vs `*_DOCUMENT` inconsistencies
   - No `*_BRANCH` vs `*_GIT_BRANCH` inconsistencies

4. **Schema Compliance**
   - Valid JSON structure
   - Schema version consistency
   - Required fields present

## Migration Notes

### Ongoing: Numeric to Semantic IDs

**From**: `P0-01`, `P0-02`, etc.
**To**: `P0-COLLECT_USER_REQUIREMENT`, `P0-DETECT_REQUIREMENT_TYPE`, etc.

**Strategy**:
- Add `display_id` field to preserve numeric IDs for UI
- Update all references to use semantic IDs
- Maintain backward compatibility during transition

## Troubleshooting

### "Step ID not found" errors
- Check `phase_registry` for step definition
- Verify step is in mode's `enabled_steps`
- Check for typos in step ID

### Mode degradation not working
- Verify `degradation_policy` configuration
- Check tool availability detection
- Ensure fallback mode has required steps

### UI showing wrong progress
- Check `phases` array for correct phase definitions
- Verify `display_id` fields are set
- Check phase-to-registry mapping

## Version History

- **v2.0** (2026-02-20): Added dual-structure documentation, fixed critical data issues
- **v1.0** (2026-02-17): Initial workflow configuration

## References

- Schema: `https://product-builder.dev/schemas/workflow.v2.json`
- Design Discussion: See git history for multi-model review sessions
- Related Files: `src/cli/workflow/`, `src/types/workflow.ts`

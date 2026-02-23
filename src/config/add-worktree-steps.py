#!/usr/bin/env python3
"""
Add worktree steps to workflow source files.

This script:
1. Adds P2-CHECK_PARALLEL_NEED and P2-CREATE_WORKTREE to execution modules
2. Adds P4-MERGE_WORKTREE_BRANCH and P4-CLEANUP_WORKTREE to archiving module
3. Updates modes.json to include new steps in enabled_steps
4. Cleans up any auto-generated fields (display_id)
"""

import json
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent / "workflow-source"
MODULES_DIR = BASE_DIR / "modules"

# New steps definitions (only essential fields)
P2_STEPS = [
    {
        "id": "P2-CHECK_PARALLEL_NEED",
        "name": "Check Parallel Development Need",
        "description": "Detect if parallel development is needed based on task complexity and team size.",
        "input": [
            "exports/jobs/{job_id}/parsed/unified.json",
            "exports/jobs/{job_id}/analysis/roadmap.json"
        ],
        "output": [
            "parallel.needed"
        ],
        "min_mode": "standard",
        "required_tools": [
            "ccb"
        ]
    },
    {
        "id": "P2-CREATE_WORKTREE",
        "name": "Create Worktree",
        "description": "Create git worktree for parallel development with isolated workspace.",
        "input": [
            "parallel.needed",
            "git.branch.name",
            "exports/jobs/{job_id}/metadata.json"
        ],
        "output": [
            "worktree.path",
            "worktree.branch"
        ],
        "condition": "parallel_needed",
        "min_mode": "standard",
        "required_tools": [
            "git",
            "ccb-worktree"
        ]
    }
]

P4_STEPS = [
    {
        "id": "P4-MERGE_WORKTREE_BRANCH",
        "name": "Merge Worktree Branch",
        "description": "Merge worktree branch to main branch if worktree was used.",
        "input": [
            "worktree.branch",
            "git.branch.name",
            "human_approval.final"
        ],
        "output": [
            "worktree.merge.result"
        ],
        "condition": "worktree_exists",
        "min_mode": "standard",
        "required_tools": [
            "git"
        ]
    },
    {
        "id": "P4-CLEANUP_WORKTREE",
        "name": "Cleanup Worktree",
        "description": "Remove worktree and optionally delete the feature branch.",
        "input": [
            "worktree.path",
            "worktree.branch",
            "worktree.merge.result"
        ],
        "output": [
            "worktree.cleanup.result"
        ],
        "condition": "worktree_exists",
        "min_mode": "standard",
        "required_tools": [
            "git",
            "ccb-worktree"
        ]
    }
]


def clean_step(step):
    """Remove auto-generated fields from step."""
    fields_to_remove = ['display_id']
    for field in fields_to_remove:
        step.pop(field, None)
    return step


def add_steps_to_execution(module_file):
    """Add worktree steps to execution module."""
    with open(module_file, 'r') as f:
        data = json.load(f)

    # Clean existing steps
    data['steps'] = [clean_step(step) for step in data['steps']]

    # Find insertion point (after P2-CREATE_GITHUB_ISSUE or at beginning)
    insert_index = 0
    for i, step in enumerate(data['steps']):
        if step['id'] == 'P2-CREATE_GITHUB_ISSUE':
            insert_index = i + 1
            break

    # Check if steps already exist
    existing_ids = {step['id'] for step in data['steps']}
    if 'P2-CHECK_PARALLEL_NEED' not in existing_ids:
        # Insert new steps
        for i, new_step in enumerate(P2_STEPS):
            data['steps'].insert(insert_index + i, new_step)

        # Update groups if they exist
        for group in data.get('groups', []):
            if 'P2-CREATE_GITHUB_ISSUE' in group.get('step_ids', []):
                idx = group['step_ids'].index('P2-CREATE_GITHUB_ISSUE')
                group['step_ids'].insert(idx + 1, 'P2-CHECK_PARALLEL_NEED')
                group['step_ids'].insert(idx + 2, 'P2-CREATE_WORKTREE')

    with open(module_file, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return len(data['steps'])


def add_steps_to_archiving():
    """Add worktree steps to archiving module."""
    module_file = MODULES_DIR / "archiving.json"

    with open(module_file, 'r') as f:
        data = json.load(f)

    # Clean existing steps
    data['steps'] = [clean_step(step) for step in data['steps']]

    # Find insertion point (before P4-MERGE_GIT_BRANCH)
    insert_index = 0
    for i, step in enumerate(data['steps']):
        if step['id'] == 'P4-MERGE_GIT_BRANCH':
            insert_index = i
            break

    # Check if steps already exist
    existing_ids = {step['id'] for step in data['steps']}
    if 'P4-MERGE_WORKTREE_BRANCH' not in existing_ids:
        # Insert new steps
        for i, new_step in enumerate(P4_STEPS):
            data['steps'].insert(insert_index + i, new_step)

        # Update groups
        for group in data.get('groups', []):
            if 'P4-MERGE_GIT_BRANCH' in group.get('step_ids', []):
                idx = group['step_ids'].index('P4-MERGE_GIT_BRANCH')
                group['step_ids'].insert(idx, 'P4-MERGE_WORKTREE_BRANCH')
                group['step_ids'].insert(idx + 1, 'P4-CLEANUP_WORKTREE')

    with open(module_file, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return len(data['steps'])


def update_modes():
    """Update modes.json to include new steps in enabled_steps."""
    modes_file = BASE_DIR / "modes.json"

    with open(modes_file, 'r') as f:
        data = json.load(f)

    new_p2_steps = ['P2-CHECK_PARALLEL_NEED', 'P2-CREATE_WORKTREE']
    new_p4_steps = ['P4-MERGE_WORKTREE_BRANCH', 'P4-CLEANUP_WORKTREE']

    for mode_name in ['standard', 'full']:
        mode = data['available_modes'][mode_name]
        enabled_steps = mode['enabled_steps']

        # Add P2 steps after P2-CREATE_GITHUB_ISSUE
        if 'P2-CREATE_GITHUB_ISSUE' in enabled_steps and 'P2-CHECK_PARALLEL_NEED' not in enabled_steps:
            idx = enabled_steps.index('P2-CREATE_GITHUB_ISSUE')
            for i, step_id in enumerate(new_p2_steps):
                enabled_steps.insert(idx + 1 + i, step_id)

        # Add P4 steps before P4-MERGE_GIT_BRANCH
        if 'P4-MERGE_GIT_BRANCH' in enabled_steps and 'P4-MERGE_WORKTREE_BRANCH' not in enabled_steps:
            idx = enabled_steps.index('P4-MERGE_GIT_BRANCH')
            for i, step_id in enumerate(new_p4_steps):
                enabled_steps.insert(idx + i, step_id)

        # Update step count
        mode['steps'] = len(enabled_steps)

    with open(modes_file, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return {
        'standard': data['available_modes']['standard']['steps'],
        'full': data['available_modes']['full']['steps']
    }


def main():
    print("🔧 Adding worktree steps to workflow source files...\n")

    # Add to execution modules
    print("📝 Updating execution modules:")
    execution_files = [
        'execution.json',
        'execution_standard.json'
    ]

    for filename in execution_files:
        module_file = MODULES_DIR / filename
        if module_file.exists():
            step_count = add_steps_to_execution(module_file)
            print(f"  ✓ {filename}: {step_count} steps")

    # Add to archiving module
    print("\n📝 Updating archiving module:")
    step_count = add_steps_to_archiving()
    print(f"  ✓ archiving.json: {step_count} steps")

    # Update modes
    print("\n📝 Updating modes.json:")
    mode_steps = update_modes()
    for mode_name, count in mode_steps.items():
        print(f"  ✓ {mode_name}: {count} steps")

    print("\n✨ Done! Run 'npm run build:workflow' to generate workflow.json")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Fix worktree steps position - move from P2 (Execution) to P1 (Ideation)
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).parent / "workflow-source"
MODULES_DIR = BASE_DIR / "modules"

# New P1 steps (correct IDs)
P1_WORKTREE_STEPS = [
    {
        "id": "P1-CHECK_PARALLEL_NEED",
        "name": "Check Parallel Development Need",
        "description": "Detect if parallel development is needed for multiple tasks to avoid conflicts.",
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
        "id": "P1-CREATE_WORKTREE",
        "name": "Create Worktree",
        "description": "Create git worktrees for parallel task development with isolated workspaces.",
        "input": [
            "parallel.needed",
            "git.branch.name",
            "exports/jobs/{job_id}/metadata.json"
        ],
        "output": [
            "worktree.paths",
            "worktree.branches"
        ],
        "condition": "parallel_needed",
        "min_mode": "standard",
        "required_tools": [
            "git",
            "ccb-worktree"
        ]
    }
]


def remove_p2_worktree_steps():
    """Remove P2-CHECK_PARALLEL_NEED and P2-CREATE_WORKTREE from execution modules."""
    for filename in ['execution.json', 'execution_standard.json']:
        module_file = MODULES_DIR / filename
        if not module_file.exists():
            continue

        with open(module_file, 'r') as f:
            data = json.load(f)

        # Remove P2 worktree steps
        data['steps'] = [
            step for step in data['steps']
            if step['id'] not in ['P2-CHECK_PARALLEL_NEED', 'P2-CREATE_WORKTREE']
        ]

        # Remove from groups
        for group in data.get('groups', []):
            step_ids = group.get('step_ids', [])
            group['step_ids'] = [
                sid for sid in step_ids
                if sid not in ['P2-CHECK_PARALLEL_NEED', 'P2-CREATE_WORKTREE']
            ]

        with open(module_file, 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Removed P2 worktree steps from {filename}")


def add_p1_worktree_steps():
    """Add P1-CHECK_PARALLEL_NEED and P1-CREATE_WORKTREE to ideate module."""
    module_file = MODULES_DIR / "ideate.json"

    with open(module_file, 'r') as f:
        data = json.load(f)

    # Find insertion point (after P1-CREATE_GIT_BRANCH)
    insert_index = None
    for i, step in enumerate(data['steps']):
        if step['id'] == 'P1-CREATE_GIT_BRANCH':
            insert_index = i + 1
            break

    if insert_index is None:
        print("  ⚠ P1-CREATE_GIT_BRANCH not found, adding at end")
        insert_index = len(data['steps'])

    # Check if already exists
    existing_ids = {step['id'] for step in data['steps']}
    if 'P1-CHECK_PARALLEL_NEED' in existing_ids:
        print("  ℹ P1 worktree steps already exist")
        return

    # Insert new steps
    for i, new_step in enumerate(P1_WORKTREE_STEPS):
        data['steps'].insert(insert_index + i, new_step)

    # Update groups if they exist
    for group in data.get('groups', []):
        if 'P1-CREATE_GIT_BRANCH' in group.get('step_ids', []):
            idx = group['step_ids'].index('P1-CREATE_GIT_BRANCH')
            group['step_ids'].insert(idx + 1, 'P1-CHECK_PARALLEL_NEED')
            group['step_ids'].insert(idx + 2, 'P1-CREATE_WORKTREE')

    with open(module_file, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  ✓ Added P1 worktree steps to ideate.json")


def update_modes():
    """Update modes.json to use P1 step IDs instead of P2."""
    modes_file = BASE_DIR / "modes.json"

    with open(modes_file, 'r') as f:
        data = json.load(f)

    for mode_name in ['standard', 'full']:
        mode = data['available_modes'][mode_name]
        enabled_steps = mode['enabled_steps']

        # Replace P2 IDs with P1 IDs
        for i, step_id in enumerate(enabled_steps):
            if step_id == 'P2-CHECK_PARALLEL_NEED':
                enabled_steps[i] = 'P1-CHECK_PARALLEL_NEED'
            elif step_id == 'P2-CREATE_WORKTREE':
                enabled_steps[i] = 'P1-CREATE_WORKTREE'

    with open(modes_file, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  ✓ Updated modes.json with P1 step IDs")


def main():
    print("🔧 Fixing worktree steps position...\n")

    print("📝 Removing P2 worktree steps from execution modules:")
    remove_p2_worktree_steps()

    print("\n📝 Adding P1 worktree steps to ideate module:")
    add_p1_worktree_steps()

    print("\n📝 Updating modes.json:")
    update_modes()

    print("\n✨ Done! Run 'npm run build:workflow' to regenerate workflow.json")


if __name__ == '__main__':
    main()

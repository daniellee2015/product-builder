#!/usr/bin/env bash
set -Eeuo pipefail

# Product Builder refactor migration script
# - Phase 1: CLI refactor
# - Phase 2: Python runtime refactor
# - Phase 3: Docs reorg
# - Phase 4: Cleanup
#
# Usage:
#   bash migrate-refactor.sh
#
# Optional:
#   AUTO_ROLLBACK=0 bash migrate-refactor.sh   # disable auto rollback on error
#
# Safety:
# - Requires a clean git working tree before running.
# - Uses git mv / git rm where possible to preserve history.
# - On error, rolls back to START_SHA by default.

AUTO_ROLLBACK="${AUTO_ROLLBACK:-1}"
START_SHA=""

log() { echo "[INFO] $*"; }
warn() { echo "[WARN] $*" >&2; }
err() { echo "[ERROR] $*" >&2; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    err "Required command not found: $1"
    exit 1
  }
}

require_exists() {
  local p="$1"
  [[ -e "$p" ]] || {
    err "Required path does not exist: $p"
    exit 1
  }
}

require_clean_tree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    err "Working tree is not clean. Please commit/stash all changes before running."
    git status --short
    exit 1
  fi
}

is_tracked_path() {
  local p="$1"
  git ls-files -- "$p" | grep -q .
}

move_path() {
  local src="$1"
  local dst="$2"

  if [[ ! -e "$src" ]]; then
    warn "Skip (not found): $src"
    return 0
  fi

  mkdir -p "$(dirname "$dst")"

  if is_tracked_path "$src"; then
    git mv "$src" "$dst"
  else
    # fallback for untracked files (should be rare)
    mv "$src" "$dst"
  fi
  log "Moved: $src -> $dst"
}

run_move_map() {
  local map="$1"
  while IFS='|' read -r src dst; do
    [[ -z "${src:-}" ]] && continue
    [[ "${src:0:1}" == "#" ]] && continue
    move_path "$src" "$dst"
  done <<< "$map"
}

delete_path() {
  local p="$1"
  [[ -e "$p" ]] || return 0

  if is_tracked_path "$p"; then
    git rm -r -- "$p"
  else
    rm -rf -- "$p"
  fi
  log "Deleted: $p"
}

remove_dir_if_empty() {
  local d="$1"
  [[ -d "$d" ]] || return 0
  if [[ -z "$(find "$d" -mindepth 1 -print -quit)" ]]; then
    rmdir "$d"
    log "Removed empty dir: $d"
  fi
}

on_error() {
  local line="$1"
  err "Migration failed at line $line"

  if [[ "${AUTO_ROLLBACK}" == "1" && -n "${START_SHA}" ]]; then
    warn "Auto rollback enabled. Reverting to $START_SHA ..."
    git reset --hard "$START_SHA"
    git clean -fd
    log "Rollback completed."
  else
    warn "Auto rollback disabled. You can rollback manually:"
    warn "  git reset --hard $START_SHA"
    warn "  git clean -fd"
  fi
  exit 1
}

trap 'on_error $LINENO' ERR

phase() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

main() {
  require_cmd git

  # Ensure we run from repo root
  local repo_root
  repo_root="$(git rev-parse --show-toplevel)"
  cd "$repo_root"

  START_SHA="$(git rev-parse HEAD)"
  log "Repo root: $repo_root"
  log "Start SHA : $START_SHA"

  require_clean_tree

  ###########################################################################
  # Phase 1: CLI Refactor
  ###########################################################################
  phase "Phase 1: CLI Refactor"

  require_exists "src/cli"
  require_exists "src/config"

  mkdir -p \
    src/cli/core \
    src/cli/shared/utils \
    src/cli/features/setup/actions \
    src/cli/features/setup/lib \
    src/cli/features/project \
    src/cli/features/workflow/actions \
    src/cli/features/jobs \
    src/cli/features/agents/actions \
    src/cli/features/ai/actions \
    src/cli/features/ai/lib \
    src/cli/features/tools/architecture \
    src/cli/features/tools/dependencies \
    src/cli/features/tools/docs \
    src/cli/features/settings/actions \
    src/cli/legacy/menus \
    examples/cli

  CLI_MOVES="$(cat <<'EOF'
src/config/menu-registry.ts|src/cli/core/menu-registry.ts
src/cli/init-cli.ts|src/cli/core/init-cli.ts
src/cli/init.ts|src/cli/features/setup/actions/initialize-project.ts
src/cli/checkers.ts|src/cli/features/setup/lib/dependency-checkers.ts
src/cli/api-manager.ts|src/cli/features/ai/lib/api-manager.ts

src/cli/agents/menu.ts|src/cli/features/agents/menu.ts
src/cli/project-mgmt/menu.ts|src/cli/features/project/menu.ts
src/cli/setup/menu.ts|src/cli/features/setup/menu.ts
src/cli/tools/menu.ts|src/cli/features/tools/menu.ts
src/cli/arch-tools/menu.ts|src/cli/features/tools/architecture/menu.ts

src/cli/job-mgmt/menu.ts|src/cli/features/jobs/menu.ts
src/cli/jobs-tasks/menu.ts|src/cli/legacy/jobs-tasks-menu.ts

src/cli/workflow/menu.ts|src/cli/features/workflow/menu.ts
src/cli/workflow/view.ts|src/cli/features/workflow/actions/view.ts
src/cli/workflow/edit.ts|src/cli/features/workflow/actions/edit.ts
src/cli/workflow/switch.ts|src/cli/features/workflow/actions/switch.ts
src/cli/workflow/import.ts|src/cli/features/workflow/actions/import.ts
src/cli/workflow/export.ts|src/cli/features/workflow/actions/export.ts
src/cli/workflow/reset.ts|src/cli/features/workflow/actions/reset.ts

src/cli/settings/menu.ts|src/cli/features/settings/menu.ts
src/cli/settings/index.ts|src/cli/features/settings/index.ts

src/cli/status/menu.ts|src/cli/features/setup/actions/status.ts
src/cli/status/display.ts|src/cli/features/setup/lib/status-display.ts

src/cli/llm/providers.ts|src/cli/features/ai/lib/providers.ts
src/cli/llm/display.ts|src/cli/features/ai/lib/display.ts
src/cli/llm/config-writer.ts|src/cli/features/ai/lib/config-writer.ts
src/cli/llm/menu.ts|src/cli/features/ai/actions/llm-menu.ts
src/cli/ai-gateway/menu.ts|src/cli/features/ai/menu.ts

src/cli/menu-cli-menu-kit-example.ts|examples/cli/menu-cli-menu-kit-example.ts
src/cli/menus/utils.ts|src/cli/shared/utils/menu-utils.ts

src/cli/menu-functions.ts|src/cli/legacy/menu-functions.ts
src/cli/menus/arch-tools-menu.ts|src/cli/legacy/menus/arch-tools-menu.ts
src/cli/menus/jobs-tasks-menu.ts|src/cli/legacy/menus/jobs-tasks-menu.ts
src/cli/menus/llm-cli-menu.ts|src/cli/legacy/menus/llm-cli-menu.ts
src/cli/menus/status-menu.ts|src/cli/legacy/menus/status-menu.ts
src/cli/menus/workflow-menu.ts|src/cli/legacy/menus/workflow-menu.ts
src/cli/menus/index.ts|src/cli/legacy/menus/index.ts
EOF
)"
  run_move_map "$CLI_MOVES"

  ###########################################################################
  # Phase 2: Python Runtime Refactor (scripts/python -> python/)
  ###########################################################################
  phase "Phase 2: Python Runtime Refactor"

  require_exists "scripts/python"

  mkdir -p \
    python/src/product_builder_runtime/execution \
    python/src/product_builder_runtime/scheduler \
    python/src/product_builder_runtime/adapters \
    python/src/product_builder_runtime/db/schema \
    python/src/product_builder_runtime/db/migrations \
    python/scripts/dev \
    python/tests/fixtures

  PY_MOVES="$(cat <<'EOF'
scripts/python/orchestrator.py|python/src/product_builder_runtime/orchestrator.py
scripts/python/parallel_step_executor.py|python/src/product_builder_runtime/execution/parallel_step_executor.py
scripts/python/step_dependency_analyzer.py|python/src/product_builder_runtime/execution/step_dependency_analyzer.py
scripts/python/scheduler.py|python/src/product_builder_runtime/scheduler/scheduler.py
scripts/python/worker.py|python/src/product_builder_runtime/scheduler/worker.py
scripts/python/product_builder_cli.py|python/src/product_builder_runtime/cli.py

scripts/python/adapters/__init__.py|python/src/product_builder_runtime/adapters/__init__.py
scripts/python/adapters/git_adapter.py|python/src/product_builder_runtime/adapters/git_adapter.py
scripts/python/adapters/github_adapter.py|python/src/product_builder_runtime/adapters/github_adapter.py
scripts/python/adapters/test_adapter.py|python/src/product_builder_runtime/adapters/test_adapter.py

scripts/python/workflow_db.py|python/src/product_builder_runtime/db/workflow_db.py
scripts/python/workflow_db_phase1.py|python/src/product_builder_runtime/db/workflow_db_phase1.py
scripts/python/workflow_db_scheduler.py|python/src/product_builder_runtime/db/workflow_db_scheduler.py
scripts/python/workflow_db_git.py|python/src/product_builder_runtime/db/workflow_db_git.py

scripts/python/db_schema.sql|python/src/product_builder_runtime/db/schema/core.sql
scripts/python/db_schema_phase1.sql|python/src/product_builder_runtime/db/schema/phase1.sql
scripts/python/db_schema_phase2.sql|python/src/product_builder_runtime/db/schema/phase2.sql
scripts/python/db_schema_phase2_supplement.sql|python/src/product_builder_runtime/db/schema/phase2_supplement.sql
scripts/python/db_schema_scheduling.sql|python/src/product_builder_runtime/db/schema/scheduling.sql
scripts/python/db_schema_jobs_extension.sql|python/src/product_builder_runtime/db/schema/jobs_extension.sql
scripts/python/db_schema_extension.sql|python/src/product_builder_runtime/db/schema/extension.sql
scripts/python/db_migration_004_fix_resource_locks.sql|python/src/product_builder_runtime/db/migrations/004_fix_resource_locks.sql

scripts/python/init_database.py|python/scripts/init_database.py
scripts/python/echo_test_message.py|python/scripts/dev/echo_test_message.py
scripts/python/echo_final_message.py|python/scripts/dev/echo_final_message.py

scripts/python/test_cli.py|python/tests/test_cli.py
scripts/python/test_db_integration.py|python/tests/test_db_integration.py
scripts/python/test_git_integration.py|python/tests/test_git_integration.py
scripts/python/test_multi_worker.py|python/tests/test_multi_worker.py
scripts/python/test_orchestrator.py|python/tests/test_orchestrator.py
scripts/python/test_parallel_execution.py|python/tests/test_parallel_execution.py
scripts/python/test_scheduler.py|python/tests/test_scheduler.py
scripts/python/test_scheduler_adapter.py|python/tests/test_scheduler_adapter.py
scripts/python/test_scheduling_tables.py|python/tests/test_scheduling_tables.py
scripts/python/test_unit.py|python/tests/test_unit.py
scripts/python/test_workflow.json|python/tests/fixtures/test_workflow.json
EOF
)"
  run_move_map "$PY_MOVES"

  ###########################################################################
  # Phase 3: Documentation Reorg
  ###########################################################################
  phase "Phase 3: Documentation Reorg"

  mkdir -p \
    docs/runtime-python \
    docs/runtime-python/architecture \
    docs/runtime-python/database \
    docs/runtime-python/guides \
    docs/runtime-python/status \
    docs/runtime-python/archive \
    docs/runtime-python/examples \
    docs/runtime-python/testing \
    docs/runtime-python/adapters

  DOC_MOVES="$(cat <<'EOF'
scripts/python/README.md|docs/runtime-python/README.md
scripts/python/QUICKSTART.md|docs/runtime-python/QUICKSTART.md
scripts/python/ARCHITECTURE.md|docs/runtime-python/architecture/ARCHITECTURE.md
scripts/python/DATABASE_SCHEMA_SUMMARY.md|docs/runtime-python/database/DATABASE_SCHEMA_SUMMARY.md
scripts/python/INTEGRATION_GUIDE.md|docs/runtime-python/guides/INTEGRATION_GUIDE.md
scripts/python/PRODUCT_BUILDER_INTEGRATION.md|docs/runtime-python/guides/PRODUCT_BUILDER_INTEGRATION.md
scripts/python/IMPLEMENTATION_STATUS.md|docs/runtime-python/status/IMPLEMENTATION_STATUS.md
scripts/python/IMPLEMENTATION_STATUS_UPDATED.md|docs/runtime-python/status/IMPLEMENTATION_STATUS_UPDATED.md
scripts/python/PHASE_2_3_PLAN.md|docs/runtime-python/archive/PHASE_2_3_PLAN.md
scripts/python/USAGE_EXAMPLES.sh|docs/runtime-python/examples/USAGE_EXAMPLES.sh
scripts/python/docs/TESTING-SUMMARY.md|docs/runtime-python/testing/TESTING-SUMMARY.md

docs/WORKFLOW-EXECUTOR-PROGRESS.md|docs/runtime-python/status/WORKFLOW-EXECUTOR-PROGRESS.md
docs/WORKFLOW-ENGINE-INTEGRATION.md|docs/runtime-python/guides/WORKFLOW-ENGINE-INTEGRATION.md
docs/WORKFLOW-EXECUTOR-DISCUSSION.md|docs/runtime-python/guides/WORKFLOW-EXECUTOR-DISCUSSION.md
docs/archive/ADAPTER-ARCHITECTURE.md|docs/runtime-python/adapters/ADAPTER-ARCHITECTURE.md
EOF
)"
  run_move_map "$DOC_MOVES"

  ###########################################################################
  # Phase 4: Cleanup
  ###########################################################################
  phase "Phase 4: Cleanup"

  # Delete obsolete files
  delete_path "src/cli/.DS_Store"
  delete_path "src/cli/menus/workflow-menu.ts.backup"

  # Remove cache/runtime artifacts from old python location
  delete_path "scripts/python/__pycache__"
  delete_path "scripts/python/adapters/__pycache__"
  delete_path "scripts/python/.product-builder"
  delete_path "scripts/python/workflow.db"

  # Remove old empty CLI dirs
  remove_dir_if_empty "src/cli/agents"
  remove_dir_if_empty "src/cli/ai-gateway"
  remove_dir_if_empty "src/cli/arch-tools"
  remove_dir_if_empty "src/cli/job-mgmt"
  remove_dir_if_empty "src/cli/jobs-tasks"
  remove_dir_if_empty "src/cli/llm"
  remove_dir_if_empty "src/cli/menus"
  remove_dir_if_empty "src/cli/project-mgmt"
  remove_dir_if_empty "src/cli/setup"
  remove_dir_if_empty "src/cli/status"
  remove_dir_if_empty "src/cli/tools"
  remove_dir_if_empty "src/cli/workflow"
  remove_dir_if_empty "src/cli/settings"
  remove_dir_if_empty "src/cli/components"

  # Remove old empty python dirs
  remove_dir_if_empty "scripts/python/docs"
  remove_dir_if_empty "scripts/python/adapters"
  remove_dir_if_empty "scripts/python"

  echo
  log "Migration finished successfully."
  log "Next steps:"
  log "  1) Update import paths (menu.ts, index.ts, and feature modules)."
  log "  2) Split src/cli/legacy/menu-functions.ts into feature-specific action files."
  log "  3) Run build/tests."
  log "  4) Commit by phase or as one migration commit."
  echo
  git status --short
}

main "$@"

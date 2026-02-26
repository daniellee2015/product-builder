# Product Builder Database Schema - Final Summary

## 📊 Database Architecture: 22 Tables

Based on Codex recommendations for **Option C (Hybrid, Lean)** architecture.

### Architecture Decision

**Recommended Approach:** Local scheduler for scenarios 2-3, with clean interfaces for external orchestration (scenario 4).

**Scenarios Supported:**
- **Scenario 2:** Workflow-internal step parallelism (Product Builder)
- **Scenario 3:** Multi-workflow concurrency across tmux panes (Product Builder)
- **Scenario 4:** Upper orchestration layer (External scheduler - future/optional)

**Lobster Positioning:** Use as workflow runtime component, not as complete scenario-4 scheduler.

---

## 🗄️ Complete Table List (22 Tables)

### Core Workflow Tables (13 tables - Phase 1)
1. **projects** - Project/workspace identity
2. **workflow_definitions** - Versioned workflow JSON snapshots
3. **workflow_steps** - Queryable step metadata
4. **workflow_transitions** - Queryable transition graph
5. **jobs** - Job queue + lifecycle + resume pointer
6. **step_executions** - Every step attempt
7. **transition_history** - Actual control-flow edges taken
8. **job_variables** - Runtime variables
9. **review_results** - Review cycle scores
10. **review_findings** - Structured issues
11. **llm_interactions** - LLM call records
12. **config_entries** - Configuration management
13. **error_events** - Error tracking

### Git/GitHub Integration (4 tables)
14. **git_operations** - Git command audit
15. **github_issues** - Issue linkage/state
16. **github_pull_requests** - PR linkage/state
17. **artifacts** - File pointers for large outputs

### Scheduling Support (4 tables - NEW)
18. **job_dependencies** - Cross-job DAG edges
19. **job_leases** - Safe job claiming by concurrent workers
20. **resource_locks** - Prevent conflicting runs on shared resources
21. **scheduler_events** - Audit scheduler decisions

### System Tables (1 table)
22. **schema_migrations** - Migration version tracking

---

## 🔧 Jobs Table Extensions

The `jobs` table has been extended with scheduler-related fields:

- `priority` INTEGER DEFAULT 100
- `not_before_at` TEXT (delayed execution)
- `retry_count` INTEGER DEFAULT 0
- `max_retries` INTEGER DEFAULT 3
- `scheduler_state` TEXT (queued/runnable/blocked/running/completed/failed/cancelled)
- `parent_job_id` TEXT (job hierarchies)
- `root_job_id` TEXT (top-level job)

---

## 📈 Migration History

| Version | Description | Applied |
|---------|-------------|---------|
| 001 | Initial 13 tables from Phase 1 | 2026-02-25 |
| 002 | Added git_operations, github_*, artifacts, schema_migrations | 2026-02-25 |
| 003 | Added scheduling support (4 tables) | 2026-02-26 |

---

## 🚀 Implementation Roadmap

### P0 (Now) ✅
- [x] 22 core tables implemented
- [ ] Local scheduler implementation
- [ ] Step parallelism (scenario 2)
- [ ] Multi-workflow concurrency (scenario 3)

### P1 (Next)
- [ ] Agent-assisted scheduling decision hooks
- [ ] Queue fairness and quota controls
- [ ] Provider/repository-based resource management

### P2 (Future)
- [ ] External scheduler integration (if scenario 4 grows)
- [ ] Multi-host execution support
- [ ] Global org-wide prioritization

---

## 🎯 Design Principles

**What We Built:**
- Deterministic execution engine
- Local scheduling for parallel workflows
- Strong audit trail
- Clean APIs for external orchestration

**What We Avoided (Overdesign):**
- Full agent runtime tables (agents/sessions/messages)
- Cross-node event bus architecture
- Dynamic agent discovery system
- Realtime sync infrastructure beyond lease+lock

**Future Extensibility:**
- Clean interfaces for external schedulers
- Stable status enums and contracts
- Idempotent operations by job_id
- Deterministic resume from persisted state

---

## 📝 Database Files

- `db_schema_phase1.sql` - Initial 13 core tables
- `db_schema_extension.sql` - Git/GitHub/artifacts tables
- `db_schema_scheduling.sql` - Scheduling support tables
- `db_schema_jobs_extension.sql` - Jobs table extensions (already applied)
- `workflow_db_phase1.py` - Database adapter class

---

## 🔗 References

- Codex Architecture Decision: Request ID 20260226-094445-371-44596-23
- Lobster Evaluation: https://github.com/openclaw/lobster
- OpenClaw Docs: https://docs.openclaw.ai/

---

**Status:** ✅ Database schema complete (22 tables)
**Next Step:** Implement local scheduler logic

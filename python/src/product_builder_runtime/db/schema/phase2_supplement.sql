-- Product Builder Workflow Database Schema - Phase 2 Supplement
-- Tool Registry and LLM Provider Configuration
-- Addresses: tool definitions, LLM API keys, provider configs

-- ==================== Tool Registry ====================

-- Tool Definitions: Registry of available CLI tools and their capabilities
CREATE TABLE IF NOT EXISTS tool_definitions (
    tool_id TEXT PRIMARY KEY,
    tool_name TEXT NOT NULL UNIQUE,  -- e.g., 'codex', 'gemini', 'git', 'gh'
    tool_type TEXT NOT NULL CHECK(tool_type IN ('llm','vcs','ci','utility','custom')),
    version TEXT,
    executable_path TEXT,  -- Path to the tool binary/script
    description TEXT,
    capabilities_json TEXT,  -- JSON array of capabilities
    parameters_schema_json TEXT,  -- JSON schema for tool parameters
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tool Usage Stats: Track tool invocation statistics
CREATE TABLE IF NOT EXISTS tool_usage_stats (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_id TEXT NOT NULL,
    job_id TEXT,
    step_execution_id INTEGER,
    invocation_count INTEGER NOT NULL DEFAULT 1,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (tool_id) REFERENCES tool_definitions(tool_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE
);

-- ==================== LLM Provider Configuration ====================

-- LLM Providers: Registry of LLM providers and their configurations
CREATE TABLE IF NOT EXISTS llm_providers (
    provider_id TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL UNIQUE,  -- e.g., 'openai', 'anthropic', 'google'
    provider_type TEXT NOT NULL CHECK(provider_type IN ('api','local','proxy')),
    base_url TEXT,  -- API endpoint base URL
    api_version TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    default_model TEXT,
    supported_models_json TEXT,  -- JSON array of supported model names
    rate_limit_rpm INTEGER,  -- Requests per minute
    rate_limit_tpm INTEGER,  -- Tokens per minute
    timeout_seconds INTEGER DEFAULT 60,
    retry_config_json TEXT,  -- JSON: max_retries, backoff_factor, etc.
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- LLM Credentials: Secure storage for API keys and authentication
-- IMPORTANT: Values should be encrypted before storage
CREATE TABLE IF NOT EXISTS llm_credentials (
    credential_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT NOT NULL,
    credential_type TEXT NOT NULL CHECK(credential_type IN ('api_key','oauth_token','service_account')),
    credential_name TEXT NOT NULL,  -- e.g., 'production', 'development', 'personal'
    encrypted_value TEXT NOT NULL,  -- Encrypted API key or token
    encryption_method TEXT NOT NULL DEFAULT 'aes256',  -- Encryption algorithm used
    key_prefix TEXT,  -- First few chars for identification (e.g., 'sk-...')
    scope TEXT,  -- 'global', 'project', 'user'
    expires_at TEXT,  -- Expiration timestamp for tokens
    is_active INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES llm_providers(provider_id) ON DELETE CASCADE,
    UNIQUE(provider_id, credential_name, scope)
);

-- LLM Model Configs: Per-model configuration overrides
CREATE TABLE IF NOT EXISTS llm_model_configs (
    config_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature REAL,
    max_tokens INTEGER,
    top_p REAL,
    frequency_penalty REAL,
    presence_penalty REAL,
    stop_sequences_json TEXT,  -- JSON array
    custom_params_json TEXT,  -- Additional provider-specific params
    cost_per_1k_input_tokens REAL,  -- For cost tracking
    cost_per_1k_output_tokens REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES llm_providers(provider_id) ON DELETE CASCADE,
    UNIQUE(provider_id, model_name)
);

-- ==================== Indexes ====================

-- Tool Definitions
CREATE INDEX IF NOT EXISTS idx_tools_type ON tool_definitions(tool_type, is_enabled);
CREATE INDEX IF NOT EXISTS idx_tools_name ON tool_definitions(tool_name);

-- Tool Usage Stats
CREATE INDEX IF NOT EXISTS idx_tool_usage_tool ON tool_usage_stats(tool_id, last_used_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_job ON tool_usage_stats(job_id);

-- LLM Providers
CREATE INDEX IF NOT EXISTS idx_llm_providers_type ON llm_providers(provider_type, is_enabled);

-- LLM Credentials
CREATE INDEX IF NOT EXISTS idx_llm_creds_provider ON llm_credentials(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_llm_creds_scope ON llm_credentials(scope, is_active);

-- LLM Model Configs
CREATE INDEX IF NOT EXISTS idx_llm_model_configs_provider ON llm_model_configs(provider_id, model_name);

-- ==================== Views ====================

-- Active Tools: View of enabled tools with their latest usage
CREATE VIEW IF NOT EXISTS v_active_tools AS
SELECT
    td.tool_id,
    td.tool_name,
    td.tool_type,
    td.version,
    td.is_enabled,
    COUNT(DISTINCT tus.job_id) as jobs_used_count,
    SUM(tus.invocation_count) as total_invocations,
    SUM(tus.success_count) as total_successes,
    SUM(tus.failure_count) as total_failures,
    MAX(tus.last_used_at) as last_used_at
FROM tool_definitions td
LEFT JOIN tool_usage_stats tus ON td.tool_id = tus.tool_id
WHERE td.is_enabled = 1
GROUP BY td.tool_id;

-- LLM Provider Summary: Overview of providers with credential status
CREATE VIEW IF NOT EXISTS v_llm_provider_summary AS
SELECT
    p.provider_id,
    p.provider_name,
    p.provider_type,
    p.is_enabled,
    p.default_model,
    COUNT(DISTINCT c.credential_id) as credential_count,
    COUNT(DISTINCT CASE WHEN c.is_active = 1 THEN c.credential_id END) as active_credential_count,
    COUNT(DISTINCT mc.model_name) as configured_model_count,
    MAX(c.last_used_at) as last_credential_used_at
FROM llm_providers p
LEFT JOIN llm_credentials c ON p.provider_id = c.provider_id
LEFT JOIN llm_model_configs mc ON p.provider_id = mc.provider_id
GROUP BY p.provider_id;

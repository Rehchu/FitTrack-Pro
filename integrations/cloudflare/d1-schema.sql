-- FitTrack Pro D1 Database Schema
-- Serverless SQL database for edge caching and analytics
-- Deploy with: wrangler d1 execute fittrack-pro-db --file=d1-schema.sql

-- ==================== ANALYTICS TRACKING ====================

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,              -- 'api_request', 'profile_view', 'ai_request', etc.
  trainer_id INTEGER,                     -- User ID (trainer or client)
  client_id INTEGER,                      -- Related client ID
  metadata TEXT,                          -- JSON metadata (path, method, etc.)
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_analytics_trainer ON analytics_events(trainer_id, timestamp);
CREATE INDEX idx_analytics_client ON analytics_events(client_id, timestamp);
CREATE INDEX idx_analytics_type ON analytics_events(event_type, timestamp);
CREATE INDEX idx_analytics_time ON analytics_events(timestamp);

-- ==================== EDGE SESSION CACHE ====================

CREATE TABLE IF NOT EXISTS edge_sessions (
  session_id TEXT PRIMARY KEY,            -- JWT token hash or session ID
  user_id INTEGER NOT NULL,               -- Trainer or client ID
  user_type TEXT NOT NULL,                -- 'trainer' or 'client'
  data TEXT NOT NULL,                     -- JSON session data
  expires_at INTEGER NOT NULL             -- Unix timestamp
);

CREATE INDEX idx_sessions_user ON edge_sessions(user_id, user_type);
CREATE INDEX idx_sessions_expiry ON edge_sessions(expires_at);

-- Cleanup expired sessions
-- Run via cron: DELETE FROM edge_sessions WHERE expires_at < strftime('%s', 'now')

-- ==================== PROFILE CACHE ====================

CREATE TABLE IF NOT EXISTS profile_cache (
  cache_key TEXT PRIMARY KEY,             -- 'profile:token' or 'client:id'
  client_id INTEGER NOT NULL,             -- Client ID
  profile_data TEXT NOT NULL,             -- JSON profile data
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL             -- Unix timestamp
);

CREATE INDEX idx_cache_client ON profile_cache(client_id);
CREATE INDEX idx_cache_expiry ON profile_cache(expires_at);

-- ==================== AI REQUEST TRACKING ====================

CREATE TABLE IF NOT EXISTS ai_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,               -- Trainer or client ID
  model TEXT NOT NULL,                    -- AI model used
  prompt_tokens INTEGER DEFAULT 0,        -- Input tokens
  completion_tokens INTEGER DEFAULT 0,    -- Output tokens
  total_tokens INTEGER DEFAULT 0,         -- Total tokens used
  request_type TEXT,                      -- 'meal_plan', 'workout', 'insights'
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_ai_user_time ON ai_requests(user_id, timestamp);
CREATE INDEX idx_ai_model ON ai_requests(model, timestamp);

-- ==================== RATE LIMITING ====================

CREATE TABLE IF NOT EXISTS rate_limits (
  limit_key TEXT PRIMARY KEY,             -- 'ai:{userId}:{date}', 'api:{userId}:{date}'
  count INTEGER DEFAULT 1,                -- Current count
  reset_at INTEGER NOT NULL               -- Unix timestamp when limit resets
);

CREATE INDEX idx_rate_limit_reset ON rate_limits(reset_at);

-- ==================== API RESPONSE CACHE ====================

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,             -- Hash of endpoint + params
  endpoint TEXT NOT NULL,                 -- API endpoint
  response_data TEXT NOT NULL,            -- JSON response
  cached_at INTEGER DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL             -- Unix timestamp
);

CREATE INDEX idx_api_cache_endpoint ON api_cache(endpoint, expires_at);
CREATE INDEX idx_api_cache_expiry ON api_cache(expires_at);

-- ==================== SHARE TOKEN TRACKING ====================

CREATE TABLE IF NOT EXISTS share_tokens (
  token TEXT PRIMARY KEY,                 -- Share token
  client_id INTEGER NOT NULL,             -- Client ID
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL,            -- Unix timestamp
  view_count INTEGER DEFAULT 0,           -- Track views
  last_viewed_at INTEGER                  -- Last view timestamp
);

CREATE INDEX idx_share_client ON share_tokens(client_id);
CREATE INDEX idx_share_expiry ON share_tokens(expires_at);

-- ==================== FEATURE FLAGS ====================

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name TEXT PRIMARY KEY,             -- Feature flag name
  enabled INTEGER DEFAULT 0,              -- 0 = disabled, 1 = enabled
  rollout_percentage INTEGER DEFAULT 0,   -- 0-100 for gradual rollout
  metadata TEXT,                          -- JSON metadata
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- ==================== SCHEDULED TASKS LOG ====================

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_name TEXT NOT NULL,                -- 'cleanup_cache', 'send_reminders', etc.
  status TEXT NOT NULL,                   -- 'pending', 'running', 'completed', 'failed'
  started_at INTEGER,
  completed_at INTEGER,
  error_message TEXT,
  metadata TEXT                           -- JSON metadata
);

CREATE INDEX idx_tasks_status ON scheduled_tasks(status, started_at);
CREATE INDEX idx_tasks_name ON scheduled_tasks(task_name, completed_at);

-- ==================== INITIAL DATA ====================

-- Feature flags (all disabled by default)
INSERT OR IGNORE INTO feature_flags (flag_name, enabled, rollout_percentage) VALUES
  ('ai_meal_suggestions', 1, 100),
  ('ai_workout_plans', 1, 100),
  ('semantic_search', 1, 100),
  ('real_time_chat', 1, 100),
  ('progress_insights', 1, 50),
  ('advanced_analytics', 0, 0);

-- ==================== VIEWS FOR ANALYTICS ====================

-- Daily request counts by trainer
CREATE VIEW IF NOT EXISTS daily_requests_by_trainer AS
SELECT 
  trainer_id,
  DATE(timestamp, 'unixepoch') as date,
  event_type,
  COUNT(*) as request_count
FROM analytics_events
GROUP BY trainer_id, date, event_type
ORDER BY date DESC, request_count DESC;

-- AI usage summary
CREATE VIEW IF NOT EXISTS ai_usage_summary AS
SELECT 
  user_id,
  model,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens_used,
  DATE(timestamp, 'unixepoch') as date
FROM ai_requests
GROUP BY user_id, model, date
ORDER BY date DESC, total_tokens_used DESC;

-- Profile view counts
CREATE VIEW IF NOT EXISTS profile_view_stats AS
SELECT 
  client_id,
  COUNT(*) as view_count,
  MAX(timestamp) as last_viewed
FROM analytics_events
WHERE event_type = 'profile_view'
GROUP BY client_id
ORDER BY view_count DESC;

-- ==================== CLEANUP QUERIES ====================

-- Delete expired cache entries (run daily via cron)
-- DELETE FROM edge_sessions WHERE expires_at < strftime('%s', 'now');
-- DELETE FROM profile_cache WHERE expires_at < strftime('%s', 'now');
-- DELETE FROM api_cache WHERE expires_at < strftime('%s', 'now');
-- DELETE FROM share_tokens WHERE expires_at < strftime('%s', 'now');
-- DELETE FROM rate_limits WHERE reset_at < strftime('%s', 'now');

-- Delete old analytics (keep last 90 days)
-- DELETE FROM analytics_events WHERE timestamp < strftime('%s', 'now', '-90 days');
-- DELETE FROM ai_requests WHERE timestamp < strftime('%s', 'now', '-90 days');

-- Vacuum to reclaim space
-- VACUUM;

-- ==================== USEFUL QUERIES ====================

-- Get top 10 most active trainers (last 7 days)
-- SELECT 
--   trainer_id,
--   COUNT(*) as total_requests,
--   COUNT(DISTINCT DATE(timestamp, 'unixepoch')) as active_days
-- FROM analytics_events
-- WHERE timestamp > strftime('%s', 'now', '-7 days')
-- GROUP BY trainer_id
-- ORDER BY total_requests DESC
-- LIMIT 10;

-- Get AI usage by model (last 30 days)
-- SELECT 
--   model,
--   COUNT(*) as requests,
--   SUM(total_tokens) as total_tokens,
--   AVG(total_tokens) as avg_tokens_per_request
-- FROM ai_requests
-- WHERE timestamp > strftime('%s', 'now', '-30 days')
-- GROUP BY model
-- ORDER BY requests DESC;

-- Get most viewed profiles
-- SELECT 
--   client_id,
--   COUNT(*) as views,
--   MAX(timestamp) as last_viewed
-- FROM analytics_events
-- WHERE event_type = 'profile_view'
-- GROUP BY client_id
-- ORDER BY views DESC
-- LIMIT 20;

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_trainer_type_time 
  ON analytics_events(trainer_id, event_type, timestamp);

CREATE INDEX IF NOT EXISTS idx_ai_user_model_time 
  ON ai_requests(user_id, model, timestamp);

-- ==================== SCHEMA VERSION ====================

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER DEFAULT (strftime('%s', 'now'))
);

INSERT INTO schema_version (version) VALUES (1);

-- ==================== NOTES ====================
--
-- Total Tables: 10
-- - analytics_events: Event tracking
-- - edge_sessions: Session cache
-- - profile_cache: Profile data cache
-- - ai_requests: AI usage tracking
-- - rate_limits: Rate limiting
-- - api_cache: API response cache
-- - share_tokens: Share token tracking
-- - feature_flags: Feature toggles
-- - scheduled_tasks: Background job log
-- - schema_version: Schema migration tracking
--
-- Total Views: 3
-- - daily_requests_by_trainer: Daily analytics
-- - ai_usage_summary: AI usage stats
-- - profile_view_stats: Profile popularity
--
-- Free Tier Limits:
-- - 5GB storage
-- - 5M reads/day
-- - 100K writes/day
--
-- Estimated Usage:
-- - ~1KB per analytics event
-- - ~5KB per cached profile
-- - ~0.5KB per AI request
-- - 5GB = ~1M profiles or ~5M events

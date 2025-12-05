-- Migration: Add indexes to telemetry_events table for performance optimization
-- Date: 2025-12-05
-- Issue: Performance report endpoint taking 24+ seconds due to full table scans
-- Expected improvement: Query time should drop from ~24s to <1s

-- ============================================================================
-- INDEXES FOR telemetry_events TABLE
-- ============================================================================

-- Index on driver_external_id (used in WHERE clause to filter by driver)
CREATE INDEX IF NOT EXISTS idx_telemetry_events_driver_external_id
ON telemetry_events (driver_external_id);

-- Index on event_type_external_id (used in WHERE clause with IN operator)
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_type_external_id
ON telemetry_events (event_type_external_id);

-- Index on event_timestamp (used in WHERE clause for date range filtering)
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_timestamp
ON telemetry_events (event_timestamp);

-- Composite index optimized for the performance report query pattern:
-- WHERE driver_external_id = ? AND event_type_external_id IN (...) AND event_timestamp BETWEEN ? AND ?
-- This is the most impactful index for the specific query pattern
CREATE INDEX IF NOT EXISTS idx_telemetry_events_performance_report
ON telemetry_events (driver_external_id, event_timestamp, event_type_external_id);

-- ============================================================================
-- OPTIONAL: Analyze table after creating indexes
-- ============================================================================
ANALYZE telemetry_events;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to confirm indexes exist)
-- ============================================================================
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'telemetry_events';

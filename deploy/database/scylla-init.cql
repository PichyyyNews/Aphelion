-- Create Keyspace for activity feed
CREATE KEYSPACE IF NOT EXISTS aphelion_activity 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Create basic activity table structure (Wide-column store)
USE aphelion_activity;

CREATE TABLE IF NOT EXISTS activity_log (
    user_id text,
    activity_id uuid,
    type text,
    metadata text,
    created_at timestamp,
    PRIMARY KEY (user_id, created_at, activity_id)
) WITH CLUSTERING ORDER BY (created_at DESC, activity_id ASC);

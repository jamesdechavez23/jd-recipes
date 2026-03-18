DROP TABLE IF EXISTS recipes CASCADE;

CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recipes_created_at_idx ON recipes (created_at DESC);

CREATE INDEX recipes_name_idx ON recipes (name);
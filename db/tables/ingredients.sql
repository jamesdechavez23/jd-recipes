DROP TABLE IF EXISTS ingredients CASCADE;

CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    default_unit VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ingredients_name_idx ON ingredients (name);

CREATE INDEX ingredients_category_idx ON ingredients (category);
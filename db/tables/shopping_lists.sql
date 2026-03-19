DROP TABLE IF EXISTS shopping_lists CASCADE;

CREATE TABLE shopping_lists (
    id SERIAL PRIMARY KEY,
    owner_sub UUID NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT 'Shopping List',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shopping_lists_owner_sub_idx ON shopping_lists (owner_sub);
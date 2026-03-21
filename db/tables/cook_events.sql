DROP TABLE IF EXISTS cook_event_images CASCADE;

DROP TABLE IF EXISTS cook_events CASCADE;

CREATE TABLE cook_events (
    id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    owner_sub UUID NOT NULL,
    cooked_at TIMESTAMPTZ NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX cook_events_recipe_id_cooked_at_idx ON cook_events (recipe_id, cooked_at DESC);

CREATE INDEX cook_events_owner_sub_cooked_at_idx ON cook_events (owner_sub, cooked_at DESC);

CREATE INDEX cook_events_owner_sub_recipe_id_idx ON cook_events (owner_sub, recipe_id);
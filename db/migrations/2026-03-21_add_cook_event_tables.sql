CREATE TABLE IF NOT EXISTS cook_events (
    id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    owner_sub UUID NOT NULL,
    cooked_at TIMESTAMPTZ NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cook_events_recipe_id_cooked_at_idx ON cook_events (recipe_id, cooked_at DESC);

CREATE INDEX IF NOT EXISTS cook_events_owner_sub_cooked_at_idx ON cook_events (owner_sub, cooked_at DESC);

CREATE INDEX IF NOT EXISTS cook_events_owner_sub_recipe_id_idx ON cook_events (owner_sub, recipe_id);

CREATE TABLE IF NOT EXISTS cook_event_images (
    id SERIAL PRIMARY KEY,
    cook_event_id INT NOT NULL REFERENCES cook_events (id) ON DELETE CASCADE,
    s3_key TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT,
    original_filename VARCHAR(255),
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT cook_event_images_display_order_positive CHECK (display_order > 0),
    CONSTRAINT cook_event_images_s3_key_not_blank CHECK (length(btrim(s3_key)) > 0),
    CONSTRAINT cook_event_images_mime_type_not_blank CHECK (length(btrim(mime_type)) > 0),
    CONSTRAINT cook_event_images_size_bytes_non_negative CHECK (
        size_bytes IS NULL
        OR size_bytes >= 0
    ),
    CONSTRAINT cook_event_images_event_display_order_unique UNIQUE (cook_event_id, display_order)
);

CREATE INDEX IF NOT EXISTS cook_event_images_cook_event_id_idx ON cook_event_images (cook_event_id, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS cook_event_images_s3_key_unique_idx ON cook_event_images (s3_key);
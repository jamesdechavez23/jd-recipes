DROP TABLE IF EXISTS menus CASCADE;

CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    owner_sub UUID NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT 'Menu',
    description TEXT,
    public_slug VARCHAR(100),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT menus_public_slug_required_when_public CHECK (
        NOT is_public
        OR (
            public_slug IS NOT NULL
            AND length(btrim(public_slug)) > 0
        )
    )
);

CREATE UNIQUE INDEX menus_public_slug_unique_idx ON menus (public_slug)
WHERE
    public_slug IS NOT NULL;

CREATE INDEX menus_owner_sub_idx ON menus (owner_sub);

CREATE INDEX menus_is_public_idx ON menus (is_public)
WHERE
    is_public = TRUE;
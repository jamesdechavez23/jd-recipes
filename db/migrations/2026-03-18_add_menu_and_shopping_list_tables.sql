CREATE TABLE IF NOT EXISTS menus (
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

CREATE UNIQUE INDEX IF NOT EXISTS menus_public_slug_unique_idx ON menus (public_slug)
WHERE
    public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS menus_owner_sub_idx ON menus (owner_sub);

CREATE INDEX IF NOT EXISTS menus_is_public_idx ON menus (is_public)
WHERE
    is_public = TRUE;

CREATE TABLE IF NOT EXISTS shopping_lists (
    id SERIAL PRIMARY KEY,
    owner_sub UUID NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT 'Shopping List',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shopping_lists_owner_sub_idx ON shopping_lists (owner_sub);

CREATE TABLE IF NOT EXISTS menu_recipes (
    menu_id INT NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (menu_id, recipe_id),
    CONSTRAINT menu_recipes_display_order_positive CHECK (display_order > 0),
    CONSTRAINT menu_recipes_menu_display_order_unique UNIQUE (menu_id, display_order)
);

CREATE INDEX IF NOT EXISTS menu_recipes_menu_id_display_order_idx ON menu_recipes (menu_id, display_order);

CREATE INDEX IF NOT EXISTS menu_recipes_recipe_id_idx ON menu_recipes (recipe_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
    id SERIAL PRIMARY KEY,
    shopping_list_id INT NOT NULL REFERENCES shopping_lists (id) ON DELETE CASCADE,
    ingredient_id INT REFERENCES ingredients (id) ON DELETE SET NULL,
    ingredient_name_snapshot VARCHAR(255) NOT NULL,
    quantity NUMERIC,
    quantity_display VARCHAR(50),
    unit VARCHAR(50),
    item_note TEXT,
    added_from_recipe_id INT REFERENCES recipes (id) ON DELETE SET NULL,
    is_checked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT shopping_list_items_name_snapshot_not_blank CHECK (length(btrim(ingredient_name_snapshot)) > 0),
    CONSTRAINT shopping_list_items_unit_required_when_quantity_present CHECK (
        quantity IS NULL
        OR (
            unit IS NOT NULL
            AND length(btrim(unit)) > 0
        )
    )
);

CREATE INDEX IF NOT EXISTS shopping_list_items_list_id_created_at_idx ON shopping_list_items (shopping_list_id, created_at DESC);

CREATE INDEX IF NOT EXISTS shopping_list_items_list_id_is_checked_idx ON shopping_list_items (shopping_list_id, is_checked, created_at DESC);

CREATE INDEX IF NOT EXISTS shopping_list_items_ingredient_id_idx ON shopping_list_items (ingredient_id);

CREATE INDEX IF NOT EXISTS shopping_list_items_added_from_recipe_id_idx ON shopping_list_items (added_from_recipe_id);
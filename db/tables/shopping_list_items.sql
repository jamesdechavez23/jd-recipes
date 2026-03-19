DROP TABLE IF EXISTS shopping_list_items;

CREATE TABLE shopping_list_items (
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

CREATE INDEX shopping_list_items_list_id_created_at_idx ON shopping_list_items (shopping_list_id, created_at DESC);

CREATE INDEX shopping_list_items_list_id_is_checked_idx ON shopping_list_items (shopping_list_id, is_checked, created_at DESC);

CREATE INDEX shopping_list_items_ingredient_id_idx ON shopping_list_items (ingredient_id);

CREATE INDEX shopping_list_items_added_from_recipe_id_idx ON shopping_list_items (added_from_recipe_id);
DROP TABLE IF EXISTS menu_recipes;

CREATE TABLE menu_recipes (
    menu_id INT NOT NULL REFERENCES menus (id) ON DELETE CASCADE,
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (menu_id, recipe_id),
    CONSTRAINT menu_recipes_display_order_positive CHECK (display_order > 0),
    CONSTRAINT menu_recipes_menu_display_order_unique UNIQUE (menu_id, display_order)
);

CREATE INDEX menu_recipes_menu_id_display_order_idx ON menu_recipes (menu_id, display_order);

CREATE INDEX menu_recipes_recipe_id_idx ON menu_recipes (recipe_id);
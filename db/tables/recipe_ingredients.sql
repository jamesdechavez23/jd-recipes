DROP TABLE IF EXISTS recipe_ingredients;

CREATE TABLE recipe_ingredients (
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients (id),
    quantity NUMERIC,
    quantity_display VARCHAR(50),
    unit VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id),
    CONSTRAINT recipe_ingredients_unit_required_when_quantity_present CHECK (
        quantity IS NULL
        OR (
            unit IS NOT NULL
            AND length(btrim(unit)) > 0
        )
    )
);

CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients (recipe_id);

CREATE INDEX recipe_ingredients_ingredient_id_idx ON recipe_ingredients (ingredient_id);
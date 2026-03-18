DROP TABLE IF EXISTS recipe_step_ingredients;

CREATE TABLE recipe_step_ingredients (
    recipe_step_id INT NOT NULL REFERENCES recipe_steps (id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients (id),
    quantity NUMERIC,
    unit VARCHAR(50),
    PRIMARY KEY (recipe_step_id, ingredient_id),
    CONSTRAINT recipe_step_ingredients_unit_required_when_quantity_present CHECK (
        quantity IS NULL
        OR (
            unit IS NOT NULL
            AND length(btrim(unit)) > 0
        )
    )
);

CREATE INDEX recipe_step_ingredients_step_id_idx ON recipe_step_ingredients (recipe_step_id);

CREATE INDEX recipe_step_ingredients_ingredient_id_idx ON recipe_step_ingredients (ingredient_id);

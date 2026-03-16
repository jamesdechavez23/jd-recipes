DROP TABLE IF EXISTS recipe_ingredients;

CREATE TABLE recipe_ingredients (
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    ingredient_id INT NOT NULL REFERENCES ingredients (id),
    quantity NUMERIC,
    unit VARCHAR(50),
    PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE INDEX recipe_ingredients_recipe_id_idx ON recipe_ingredients (recipe_id);

CREATE INDEX recipe_ingredients_ingredient_id_idx ON recipe_ingredients (ingredient_id);
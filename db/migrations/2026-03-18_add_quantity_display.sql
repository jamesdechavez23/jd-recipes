ALTER TABLE recipe_ingredients
ADD COLUMN IF NOT EXISTS quantity_display VARCHAR(50);

ALTER TABLE recipe_step_ingredients
ADD COLUMN IF NOT EXISTS quantity_display VARCHAR(50);
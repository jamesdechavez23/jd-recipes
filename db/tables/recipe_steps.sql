DROP TABLE IF EXISTS recipe_steps;

CREATE TABLE recipe_steps (
    id SERIAL PRIMARY KEY,
    recipe_id INT NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    short_desc TEXT NOT NULL,
    long_desc TEXT,
    heat VARCHAR(50),
    time_minutes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT recipe_steps_recipe_step_unique UNIQUE (recipe_id, step_number),
    CONSTRAINT recipe_steps_step_positive CHECK (step_number > 0),
    CONSTRAINT recipe_steps_time_nonnegative CHECK (
        time_minutes IS NULL
        OR time_minutes >= 0
    )
);

CREATE INDEX recipe_steps_recipe_id_idx ON recipe_steps (recipe_id, step_number);

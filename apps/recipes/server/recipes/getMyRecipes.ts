import "server-only"

import { getDbPool } from "@recipes/server/db/pool"

export type MyRecipeListItem = {
  id: number
  name: string
  ingredient_names?: string[]
  created_at?: string
  updated_at?: string
}

export async function getMyRecipesByCreatorSub(createdBySub: string) {
  const pool = await getDbPool()
  const result = await pool.query<MyRecipeListItem>(
    `
      select
        r.id,
        r.name,
        r.created_at,
        r.updated_at,
        coalesce(
          array_agg(distinct i.name) filter (where i.name is not null),
          '{}'
        ) as ingredient_names
      from recipes r
      left join recipe_ingredients ri on ri.recipe_id = r.id
      left join ingredients i on i.id = ri.ingredient_id
      where r.created_by_sub = $1
      group by r.id, r.name, r.created_at, r.updated_at
      order by r.created_at desc
    `,
    [createdBySub]
  )

  return result.rows
}

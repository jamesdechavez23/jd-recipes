"use server"
import { createClient } from "@/lib/supabase/server"
import { Recipe } from "@/lib/types"

const MOCK_DATA: Recipe = {
   id: 1,
   title: "Pork Sinigang",
   video: {
      channel: "Taste to Share PH",
      videoId: "MpWXFqHvjbY"
   },
   macros: {
      calories: 500,
      protein: 20,
      carbohydrates: 20,
      fat: 15
   },
   time: "3h",
   servings: 5,
   ingredients: [
      { name: "garlic", amount: { value: 8, unit: "cloves" }, category: "aromatic" },
      { name: "onion", amount: { value: 1, unit: "large" }, category: "aromatic" },
      { name: "pork belly", amount: { value: 1.5, unit: "lbs" }, category: "protein" },
      { name: "salt", amount: { value: null, unit: "to taste" }, category: "seasoning" },
      { name: "pepper", amount: { value: null, unit: "to taste" }, category: "seasoning" },
      { name: "tomatoes", amount: { value: 3, unit: "medium tomatoes" }, category: "vegetable" },
      { name: "fish sauce", amount: { value: 2.5, unit: "tbsp" }, category: "seasoning" },
      { name: "water", amount: { value: null, unit: "to cover" }, category: "liquid" },
      { name: "taro", amount: { value: 3, unit: "small pieces" }, category: "carb" },
      { name: "string beans", amount: { value: 0.75, unit: "cup" }, category: "vegetable" },
      { name: "okra", amount: { value: 0.5, unit: "cup" }, category: "vegetable" },
      { name: "eggplant", amount: { value: 1, unit: "medium, sliced" }, category: "vegetable" },
      { name: "sinigang mix", amount: { value: 1, unit: "packet" }, category: "seasoning" },
      { name: "green chilis", amount: { value: 2, unit: "pieces" }, category: "vegetable" },
      { name: "water spinach", amount: { value: 1, unit: "bunch, cleaned" }, category: "vegetable" }
   ],
   instructions: [
      {
         action: "cook",
         description: {
            short: "Cook garlic",
            long: "Cook garlic cloves over medium heat until fragrant and lightly golden. Stir frequently to prevent burning."
         },
         time: { minutes: 2, displayValue: "2-3 minutes" },
         heat_level: "medium",
         ingredients: [{ name: "garlic", amount: { value: 8, unit: "cloves" } }]
      },
      {
         action: "add",
         description: {
            short: "Add onion and sauté",
            long: "Add diced onion to the pan with the garlic. Sauté over medium heat, stirring occasionally, until the onion becomes translucent and softened."
         },
         time: { minutes: 3, displayValue: "3-4 minutes" },
         heat_level: "medium",
         ingredients: [{ name: "onion", amount: { value: 1, unit: "large" } }]
      },
      {
         action: "add",
         description: {
            short: "Add pork belly and brown",
            long: "Add pork belly pieces to the pan. Season generously with salt and pepper. Increase heat to medium-high and brown the meat on all sides, rendering some of the fat for extra flavor."
         },
         time: { minutes: 5, displayValue: "5-7 minutes" },
         heat_level: "medium-high",
         ingredients: [
            { name: "pork belly", amount: { value: 1.5, unit: "lbs" } },
            { name: "salt", amount: { value: null, unit: "to taste" } },
            { name: "pepper", amount: { value: null, unit: "to taste" } }
         ]
      },
      {
         action: "add",
         description: {
            short: "Add tomatoes and crush",
            long: "Add fresh tomatoes to the pot. Use a spoon to crush and break them down as they cook. This will release their juices and create a rich base for the broth. Cook until softened and jammy."
         },
         time: { minutes: 4, displayValue: "4-5 minutes" },
         heat_level: "medium",
         ingredients: [{ name: "tomatoes", amount: { value: 3, unit: "medium tomatoes" } }]
      },
      {
         action: "add",
         description: {
            short: "Add fish sauce",
            long: "Stir in the fish sauce, which will add umami depth and saltiness to the broth. Mix well to distribute evenly throughout the mixture."
         },
         time: { minutes: 1, displayValue: "1 minute" },
         heat_level: "medium",
         ingredients: [{ name: "fish sauce", amount: { value: 2.5, unit: "tbsp" } }]
      },
      {
         action: "boil",
         description: {
            short: "Add water and bring to boil",
            long: "Pour in enough water to cover all ingredients by about 1-2 inches. Increase heat to high and bring the mixture to a rolling boil. This initial high heat will help extract flavors from the pork and vegetables."
         },
         time: { minutes: 5, displayValue: "5-8 minutes" },
         heat_level: "high",
         ingredients: [{ name: "water", amount: { value: null, unit: "to cover" } }]
      },
      {
         action: "simmer",
         description: {
            short: "Cover and simmer",
            long: "Reduce heat to low-medium and cover the pot. Simmer gently to tenderize the pork. Check occasionally and add more water if needed to maintain liquid level. The pork should become fork-tender."
         },
         time: { minutes: 30, displayValue: "30 minutes" },
         heat_level: "low-medium",
         ingredients: []
      },
      {
         action: "add",
         description: {
            short: "Add taro and cook",
            long: "Add taro pieces to the pot. Continue simmering until the taro is completely tender and easily pierced with a fork. The taro will help thicken the broth naturally."
         },
         time: { minutes: 15, displayValue: "15 minutes" },
         heat_level: "low-medium",
         ingredients: [{ name: "taro", amount: { value: 3, unit: "small pieces" } }]
      },
      {
         action: "crush",
         description: {
            short: "Crush taro to thicken",
            long: "Using a fork or wooden spoon, gently crush some of the cooked taro pieces against the side of the pot. This will naturally thicken the broth and give it a hearty, rustic texture typical of traditional sinigang."
         },
         time: { minutes: 2, displayValue: "2 minutes" },
         heat_level: null,
         ingredients: []
      },
      {
         action: "add",
         description: {
            short: "Add string beans",
            long: "Add string beans first since they take the longest to cook among the vegetables. They should be trimmed and cut into 2-inch pieces. Let them cook until they're tender but still have a slight bite."
         },
         time: { minutes: 3, displayValue: "3 minutes" },
         heat_level: "low-medium",
         ingredients: [{ name: "string beans", amount: { value: 0.75, unit: "cup" } }]
      },
      {
         action: "add",
         description: {
            short: "Add okra and eggplant",
            long: "Add okra (whole or halved) and sliced eggplant to the pot. These vegetables have moderate cooking times and should be added after the string beans to ensure even cooking. The eggplant should be cut into wedges or rounds."
         },
         time: { minutes: 4, displayValue: "4 minutes" },
         heat_level: "low-medium",
         ingredients: [
            { name: "okra", amount: { value: 0.5, unit: "cup" } },
            { name: "eggplant", amount: { value: 1, unit: "medium, sliced" } }
         ]
      },
      {
         action: "add",
         description: {
            short: "Add sinigang mix and chilis",
            long: "Stir in the sinigang mix packet, which provides the characteristic sour flavor. Add green chilis for heat - keep them whole if you want mild heat, or slice them for more spice. Gently stir to distribute the souring agent."
         },
         time: { minutes: 3, displayValue: "3 minutes" },
         heat_level: "low-medium",
         ingredients: [
            { name: "sinigang mix", amount: { value: 1, unit: "packet" } },
            { name: "green chilis", amount: { value: 2, unit: "pieces" } }
         ]
      },
      {
         action: "season",
         description: {
            short: "Adjust seasoning",
            long: "Taste the broth and adjust the seasoning with salt as needed. The broth should have a good balance of sour, salty, and savory flavors. Remember that the fish sauce already adds saltiness."
         },
         time: { minutes: 1, displayValue: "1 minute" },
         heat_level: "low-medium",
         ingredients: [{ name: "salt", amount: { value: null, unit: "to taste" } }]
      },
      {
         action: "add",
         description: {
            short: "Add water spinach",
            long: "Finally, add the cleaned water spinach (kangkong) to the pot. Cook just until wilted - this should happen very quickly. The greens should remain bright green and tender but not overcooked."
         },
         time: { minutes: 2, displayValue: "2-3 minutes" },
         heat_level: "low-medium",
         ingredients: [{ name: "water spinach", amount: { value: 1, unit: "bunch, cleaned" } }]
      }
   ],
   cuisine: "Filipino",
   mealType: "Main Course"
}

export default async function getRecipe(id: string) {
   const recipe = MOCK_DATA
   return { recipe, error: null }
}

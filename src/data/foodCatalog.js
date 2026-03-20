import { foods } from "./foods.js";
import { applyMicronutrientProfile } from "./foodMicros.js";

export const foodCatalog = foods.map((food) => applyMicronutrientProfile(food));

export default foodCatalog;

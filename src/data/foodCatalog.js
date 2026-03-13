import { foods } from "./foods";
import { applyMicronutrientProfile } from "./foodMicros";

export const foodCatalog = foods.map((food) => applyMicronutrientProfile(food));

export default foodCatalog;

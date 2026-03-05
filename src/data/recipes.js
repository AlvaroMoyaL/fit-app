export const recipes = [
  {
    id: "completo",
    name: "Completo",
    ingredients: [
      { foodId: "pan_blanco", grams: 80 },
      { foodId: "vienesa", grams: 100 },
      { foodId: "palta", grams: 50 },
      { foodId: "mayonesa", grams: 20 },
    ],
  },
  {
    id: "chucrut_con_salchicha",
    name: "Chucrut con salchicha",
    ingredients: [
      { foodId: "salchicha", grams: 120 },
      { foodId: "chucrut", grams: 80 },
    ],
  },
  {
    id: "desayuno_huevos",
    name: "Desayuno huevos",
    ingredients: [
      // 2 huevos aprox. equivalen a 100 g de parte comestible.
      { foodId: "huevo", grams: 100 },
      { foodId: "pan_blanco", grams: 60 },
      // 1 taza de cafe preparada aprox. 240 g.
      { foodId: "cafe", grams: 240 },
    ],
  },
  {
    id: "avena_desayuno",
    name: "Avena desayuno",
    ingredients: [
      { foodId: "avena", grams: 50 },
      { foodId: "leche", grams: 200 },
      { foodId: "platano", grams: 80 },
    ],
  },
];

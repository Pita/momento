import { z } from "zod";

// Dictionary of valid Zod types.
// You can extend this with additional types.
export const schemas = {
  User: z.object({
    id: z.string(),
    name: z.string(),
    // add more fields if needed
  }),
  // Add additional types here
};

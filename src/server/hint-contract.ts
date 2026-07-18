import "server-only";

import { z } from "zod";

export const modelHintSchema = z
  .object({
    hint: z.string().min(1).max(360),
  })
  .strict();

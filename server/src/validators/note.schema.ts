import { z } from "zod";

export const createNoteSchema = z.object({
  body: z.object({
    leadId: z.string().uuid(),
    body: z.string().trim().min(1, "Note cannot be empty"),
  }),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>["body"];

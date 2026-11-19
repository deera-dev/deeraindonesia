import { z } from "zod";

export const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  thumbnail_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type AiModel = z.infer<typeof aiModelSchema>;

export const aiModelsResponseSchema = z.array(aiModelSchema);

export const createModelInputSchema = z.object({
  name: z.string().trim().min(1),
  thumbnail_url: z.string().nullable(),
});

export type CreateModelInput = z.infer<typeof createModelInputSchema>;

export const updateModelInputSchema = z.object({
  id: z.string(),
  patch: z.object({
    name: z.string().trim().min(1).optional(),
    thumbnail_url: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

export type UpdateModelInput = z.infer<typeof updateModelInputSchema>;

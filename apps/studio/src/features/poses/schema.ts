import { z } from "zod";

export const poseSourceSchema = z.enum(["vendor_archive", "new_shoot", "ai_generated"]);
export type PoseSource = z.infer<typeof poseSourceSchema>;

export const aiPoseSchema = z.object({
  id: z.string(),
  model_id: z.string(),
  name: z.string(),
  reference_image_url: z.string(),
  description: z.string().nullable(),
  source: poseSourceSchema,
  is_active: z.boolean(),
  is_back_view: z.boolean(),
  created_at: z.string(),
});

export type AiPose = z.infer<typeof aiPoseSchema>;

export const aiPosesResponseSchema = z.array(aiPoseSchema);

export const createPoseInputSchema = z.object({
  model_id: z.string(),
  name: z.string().trim().min(1),
  description: z.string().nullable(),
  source: poseSourceSchema,
  reference_image_url: z.string().min(1),
});

export type CreatePoseInput = z.infer<typeof createPoseInputSchema>;

export const updatePoseInputSchema = z.object({
  id: z.string(),
  patch: z.object({
    name: z.string().trim().min(1).optional(),
    description: z.string().nullable().optional(),
    source: poseSourceSchema.optional(),
    reference_image_url: z.string().min(1).optional(),
    is_active: z.boolean().optional(),
  }),
});

export type UpdatePoseInput = z.infer<typeof updatePoseInputSchema>;

export const SOURCE_OPTIONS: { value: PoseSource; label: string }[] = [
  { value: "vendor_archive", label: "Arsip vendor lama" },
  { value: "new_shoot", label: "Foto baru" },
  { value: "ai_generated", label: "Hasil AI" },
];

import { z } from "zod";

export const backgroundPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  prompt_fragment: z.string(),
  reference_image_url: z.string().nullable(),
  mood_tags: z.array(z.string()),
  warna_affinity: z.array(z.string()),
  cocok_untuk_kategori: z.array(z.string()),
  last_used_at: z.string().nullable(),
  use_count: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type BackgroundPreset = z.infer<typeof backgroundPresetSchema>;
export const backgroundPresetsResponseSchema = z.array(backgroundPresetSchema);

export const createBackgroundPresetInputSchema = z.object({
  name: z.string().trim().min(1),
  prompt_fragment: z.string().trim().min(1),
  reference_image_url: z.string().nullable(),
  mood_tags: z.array(z.string()),
  warna_affinity: z.array(z.string()),
  cocok_untuk_kategori: z.array(z.string()),
});
export type CreateBackgroundPresetInput = z.infer<typeof createBackgroundPresetInputSchema>;

export const updateBackgroundPresetInputSchema = z.object({
  id: z.string(),
  patch: createBackgroundPresetInputSchema.partial().extend({ is_active: z.boolean().optional() }),
});
export type UpdateBackgroundPresetInput = z.infer<typeof updateBackgroundPresetInputSchema>;

export const accessoryCategorySchema = z.enum(["tas", "kalung", "cincin", "anting"]);
export type AccessoryCategory = z.infer<typeof accessoryCategorySchema>;

export const accessoryPresetSchema = z.object({
  id: z.string(),
  category: accessoryCategorySchema,
  name: z.string(),
  prompt_fragment: z.string(),
  reference_image_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type AccessoryPreset = z.infer<typeof accessoryPresetSchema>;
export const accessoryPresetsResponseSchema = z.array(accessoryPresetSchema);

export const createAccessoryPresetInputSchema = z.object({
  category: accessoryCategorySchema,
  name: z.string().trim().min(1),
  prompt_fragment: z.string().trim().min(1),
  reference_image_url: z.string().nullable(),
});
export type CreateAccessoryPresetInput = z.infer<typeof createAccessoryPresetInputSchema>;

export const updateAccessoryPresetInputSchema = z.object({
  id: z.string(),
  patch: createAccessoryPresetInputSchema.partial().extend({ is_active: z.boolean().optional() }),
});
export type UpdateAccessoryPresetInput = z.infer<typeof updateAccessoryPresetInputSchema>;

export const ACCESSORY_CATEGORIES: { value: AccessoryCategory; label: string }[] = [
  { value: "tas", label: "Tas" },
  { value: "kalung", label: "Kalung" },
  { value: "cincin", label: "Cincin" },
  { value: "anting", label: "Anting" },
];

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

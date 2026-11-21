import { productSchema as fullProductSchema } from "@deera/shared/features/products/schema";
import { z } from "zod";

// PR-008 (docs/product/pr-plan.md): Catalog is the one anon-facing reader
// of products, so it gets its own schema with `hpp` (internal cost price)
// omitted, matching the products_public view's column list exactly -
// admin/pos/finance keep using the full schema from packages/shared,
// untouched.
export const productSchema = fullProductSchema.omit({ hpp: true });

export type Product = z.infer<typeof productSchema>;

export const productsResponseSchema = z.array(productSchema);

/**
 * features/calon-customer/hooks.js — Public surface (Dependency Inversion,
 * CLAUDE.md §7). Komponen & fitur lain (features/blast) import HANYA dari
 * sini / index.js, tidak pernah dari api.js/queries.js langsung.
 */
export {
  useCalonCustomerListQuery,
  useCreateCalonCustomerMutation,
  useUpdateCalonCustomerMutation,
  useDeleteCalonCustomerMutation,
} from "./queries";
export { searchCalonCustomer } from "./api";

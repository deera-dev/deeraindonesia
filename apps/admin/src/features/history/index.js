/**
 * features/history/index.js — barrel publik fitur history (admin).
 * App.jsx hanya boleh import dari sini.
 */
export { default as HistoryPage } from "./components/HistoryPage";
export { logHistory, useHistory, useDeleteHistory } from "./hooks";

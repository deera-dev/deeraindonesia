import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import ToastContainer from "./shared/components/ToastContainer";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}

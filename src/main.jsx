import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app/App.jsx";
import "./styles.css";

const queryClient = new QueryClient();
createRoot(document.getElementById("root")).render(<QueryClientProvider client={queryClient}><BrowserRouter basename={import.meta.env.BASE_URL}><App /></BrowserRouter></QueryClientProvider>);

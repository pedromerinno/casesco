import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import CasePage from "./pages/Case";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminHome from "./pages/admin/AdminHome";
import AdminClients from "./pages/admin/AdminClients";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCases from "./pages/admin/AdminCases";
import CaseBuilder from "./pages/admin/CaseBuilder";
import CasePreview from "./pages/admin/CasePreview";
import AdminSite from "./pages/admin/AdminSite";
import AdminPerfil from "./pages/admin/AdminPerfil";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/cases/:slug" element={<CasePage />} />
          <Route path="/admin/login" element={<Navigate to="/" replace />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="clientes" element={<AdminClients />} />
            <Route path="cases/:id/builder" element={<CaseBuilder />} />
            <Route path="cases/:id/preview" element={<CasePreview />} />
            <Route path="cases/:id/editar" element={<Navigate to="../builder" replace />} />
            <Route path="cases" element={<AdminCases />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="perfil" element={<AdminPerfil />} />
            <Route path="configuracoes" element={<AdminSite />} />
            <Route path="site" element={<Navigate to="/admin/configuracoes" replace />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

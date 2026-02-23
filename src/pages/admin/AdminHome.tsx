import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layers3, Tags, Users } from "lucide-react";

import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";
import { supabase } from "@/lib/supabase/client";
import { getCategoriesForCompany } from "@/lib/case-builder/queries";
import { useCompany } from "@/lib/company-context";

async function getCaseCount(companyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("owner_company_id", companyId);
  if (error) throw error;
  return count ?? 0;
}

async function getClientCount(groupId: string): Promise<number> {
  const { count, error } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if (error) throw error;
  return count ?? 0;
}

async function getCategoryCount(companyId: string): Promise<number> {
  const categories = await getCategoriesForCompany(companyId);
  return categories.length;
}

function StatCard({
  href,
  icon: Icon,
  value,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <Link
      to={href}
      className="flex items-center gap-4 rounded-xl bg-muted/50 p-5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}

export default function AdminHome() {
  const { company } = useCompany();

  const { data: caseCount = 0, isLoading: casesLoading } = useQuery({
    queryKey: ["admin", "dash", "cases", company.id],
    queryFn: () => getCaseCount(company.id),
    staleTime: 60 * 1000,
  });

  const { data: clientCount = 0, isLoading: clientsLoading } = useQuery({
    queryKey: ["admin", "dash", "clients", company.group_id],
    queryFn: () => getClientCount(company.group_id),
    staleTime: 60 * 1000,
  });

  const { data: categoryCount = 0, isLoading: categoriesLoading } = useQuery({
    queryKey: ["admin", "dash", "categories", company.id],
    queryFn: () => getCategoryCount(company.id),
    staleTime: 60 * 1000,
  });

  const isLoading = casesLoading || clientsLoading || categoriesLoading;

  if (isLoading) {
    return <AdminPageSkeleton blocks={1} />;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral da empresa <strong>{company.name}</strong>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard href="/admin/cases" icon={Layers3} value={caseCount} label="Cases" />
        <StatCard href="/admin/categorias" icon={Tags} value={categoryCount} label="Categorias" />
        <StatCard href="/admin/clientes" icon={Users} value={clientCount} label="Clientes" />
      </div>
    </section>
  );
}

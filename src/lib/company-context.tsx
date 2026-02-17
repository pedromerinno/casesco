import * as React from "react";

export type Company = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  brand_color?: string | null;
};

type CompanyContextValue = {
  company: Company;
  companies: Company[];
  selectCompany: (id: string) => void;
  updateCompany: (fields: Partial<Company>) => void;
};

const CompanyContext = React.createContext<CompanyContextValue | null>(null);

const STORAGE_KEY = "onmx_selected_company_id";

/** Convert hex color (#RRGGBB) to HSL string "H S% L%" (shadcn format, no hsl() wrapper). */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslString(h: number, s: number, l: number) {
  return `${h.toFixed(2)} ${s.toFixed(2)}% ${l.toFixed(2)}%`;
}

const BRAND_CSS_VARS = [
  "--primary",
  "--ring",
  "--sidebar-primary",
  "--sidebar-ring",
] as const;

const ACCENT_CSS_VARS = ["--accent", "--sidebar-accent"] as const;
const ACCENT_FG_CSS_VARS = ["--accent-foreground", "--sidebar-accent-foreground"] as const;

export function CompanyProvider({
  companies: initialCompanies,
  children,
}: {
  companies: Company[];
  children: React.ReactNode;
}) {
  const [companiesState, setCompaniesState] = React.useState(initialCompanies);

  // Sync when parent passes new list (e.g. on re-fetch)
  React.useEffect(() => {
    setCompaniesState(initialCompanies);
  }, [initialCompanies]);

  const [selectedId, setSelectedId] = React.useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && initialCompanies.some((c) => c.id === stored)) return stored;
    return initialCompanies[0]?.id ?? "";
  });

  const company =
    companiesState.find((c) => c.id === selectedId) ?? companiesState[0];

  function selectCompany(id: string) {
    const match = companiesState.find((c) => c.id === id);
    if (!match) return;
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  function updateCompany(fields: Partial<Company>) {
    setCompaniesState((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, ...fields } : c)),
    );
  }

  // Validate stored ID when companies list changes
  React.useEffect(() => {
    if (companiesState.length === 0) return;
    if (!companiesState.some((c) => c.id === selectedId)) {
      const fallback = companiesState[0].id;
      setSelectedId(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [companiesState, selectedId]);

  // Apply dynamic brand color as CSS variables
  React.useEffect(() => {
    const el = document.documentElement;

    if (company?.brand_color) {
      const { h, s, l } = hexToHsl(company.brand_color);
      const primary = hslString(h, s, l);
      const accent = hslString(h, 100, 94);
      const accentFg = hslString(h, 90, 22);

      for (const v of BRAND_CSS_VARS) el.style.setProperty(v, primary);
      for (const v of ACCENT_CSS_VARS) el.style.setProperty(v, accent);
      for (const v of ACCENT_FG_CSS_VARS) el.style.setProperty(v, accentFg);
    } else {
      // Remove overrides — fall back to CSS defaults
      for (const v of BRAND_CSS_VARS) el.style.removeProperty(v);
      for (const v of ACCENT_CSS_VARS) el.style.removeProperty(v);
      for (const v of ACCENT_FG_CSS_VARS) el.style.removeProperty(v);
    }
  }, [company?.brand_color]);

  if (!company) return null;

  return (
    <CompanyContext.Provider value={{ company, companies: companiesState, selectCompany, updateCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const ctx = React.useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}

import { notFound } from "next/navigation";
import { CompanyView } from "@/components/company/company-view";
import { getAllCompanies, getCompaniesByTier, getCompanyBySlug } from "@/lib/data/companies";

export async function generateStaticParams() {
  return getAllCompanies().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) return {};
  return { title: `${company.name} · Defense Watch` };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();

  return (
    <CompanyView
      company={company}
      tierCompanies={getCompaniesByTier(company.tier)}
      allCompanies={getAllCompanies()}
    />
  );
}

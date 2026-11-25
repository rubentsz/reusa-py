import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getBootstrapData();
  return <ReUsaShell {...data} />;
}

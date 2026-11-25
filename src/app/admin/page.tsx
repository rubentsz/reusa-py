import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const data = await getBootstrapData();
  return (
    <ReUsaShell
      {...data}
      initialRoute={{ kind: "admin", title: "Panel de Moderación — ReUsa PY" }}
    />
  );
}

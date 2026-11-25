import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, { id }] = await Promise.all([getBootstrapData(), params]);
  return (
    <ReUsaShell
      {...data}
      initialRoute={{
        kind: "profile",
        title: "Perfil del Vendedor — ReUsa PY",
        payload: { userId: id },
      }}
    />
  );
}

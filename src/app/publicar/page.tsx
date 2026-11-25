import type { Metadata } from "next";
import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publicar aviso gratis",
  description: "Vendé tus productos usados en Paraguay gratis en ReUsa PY.",
};

export default async function PublishPage() {
  const data = await getBootstrapData();
  return (
    <ReUsaShell
      {...data}
      initialRoute={{ kind: "publish", title: "Publicar aviso — ReUsa PY" }}
    />
  );
}

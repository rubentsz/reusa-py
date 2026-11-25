import type { Metadata } from "next";
import { getBootstrapData } from "@/lib/bootstrap";
import { ReUsaShell } from "@/components/ReUsaShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mensajes",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [data, sp] = await Promise.all([getBootstrapData(), searchParams]);
  return (
    <ReUsaShell
      {...data}
      initialRoute={{
        kind: "chat",
        title: "Mensajes — ReUsa PY",
        payload: sp.c ? { conversationId: sp.c } : undefined,
      }}
    />
  );
}

"use client";

import { useState } from "react";
import { Check, CheckCircle2, Send, Sparkles, Store } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { STORE_PLAN_LIST, type StorePlanTier } from "@/lib/storePlans";
import { formatPrice } from "@/lib/format";

export function RentStoreView({
  defaultPlan = "FEATURED",
  onSuccess,
}: {
  defaultPlan?: StorePlanTier;
  onSuccess?: () => void;
}) {
  const { user, categories, notifyToast } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<StorePlanTier>(defaultPlan);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState(user?.whatsappPhone || "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [rubro, setRubro] = useState(categories[0]?.name || "Tecnología");
  const [cityName, setCityName] = useState(user?.city?.name || "Asunción");
  const [instagramOrWeb, setInstagramOrWeb] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/store-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactName,
          contactPhone,
          contactEmail,
          rubro,
          cityName,
          desiredPlan: selectedPlan,
          instagramOrWeb: instagramOrWeb || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar");
      setSubmitted(true);
      notifyToast("¡Solicitud enviada! Te contactaremos para activar tu local 3D.", "success");
      onSuccess?.();
    } catch (err) {
      notifyToast(err instanceof Error ? err.message : "Error enviando solicitud", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex h-full min-h-[380px] flex-col items-center justify-center bg-[#120926] p-8 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h2 className="mt-4 text-xl font-black text-white">
          ¡Recibimos la solicitud de {businessName}!
        </h2>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
          Nuestro equipo revisará tus datos desde el Panel de Administración y te activará tu
          fachada 3D en <strong>Avenida de Marcas</strong> junto con tu panel propio para subir logo
          y catálogo.
        </p>
        <div className="mt-5 rounded-xl border border-cyan-400/30 bg-white/5 px-4 py-3 text-xs text-cyan-200">
          Te escribiremos al WhatsApp <strong>{contactPhone}</strong> y al correo{" "}
          <strong>{contactEmail}</strong>.
        </div>
      </div>
    );
  }

  return (
    <div className="fluent-scroll h-full overflow-y-auto bg-[#f6f8fc]">
      {/* Neon Commercial Pitch Header */}
      <div className="bg-gradient-to-r from-[#160b2e] via-[#2b1055] to-[#0e2d4f] px-5 py-6 text-white">
        <div className="mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff2a9d] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <Sparkles className="h-3 w-3" /> Avenida de Marcas 3D — Paraguay
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            Poné tu local real dentro del mundo 3D de ReUsa PY
          </h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-cyan-100">
            Tu propia fachada con logo luminoso, showroom interactivo en 3D, link exclusivo{" "}
            <code className="rounded bg-white/15 px-1.5 py-0.5 text-cyan-200">/tienda/tu-marca</code>{" "}
            para tu Instagram, catálogo con carga masiva CSV y pedidos directos a tu WhatsApp.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        {/* 3 Plans Grid */}
        <div>
          <h2 className="mb-3 text-sm font-extrabold text-slate-900">
            1. Elegí el plan para tu local
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {STORE_PLAN_LIST.map((plan) => {
              const active = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative flex flex-col rounded-2xl border-2 p-4 text-left transition ${
                    active
                      ? "border-[#0067c0] bg-white shadow-lg ring-2 ring-sky-200"
                      : "border-slate-200 bg-white/90 hover:border-slate-300"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-[#ff2a9d] to-[#ff6b35] px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                      MÁS ELEGIDO
                    </span>
                  )}
                  <span
                    className="inline-block w-fit rounded-md px-2 py-0.5 text-[10px] font-black uppercase text-slate-950"
                    style={{ backgroundColor: plan.accentColor }}
                  >
                    {plan.badge}
                  </span>
                  <h3 className="mt-2 text-base font-black text-slate-900">{plan.name}</h3>
                  <p className="mt-0.5 text-xl font-black text-[#0067c0]">
                    {formatPrice(plan.monthlyPricePyg, "PYG")}
                    <span className="text-xs font-semibold text-slate-500"> / mes</span>
                  </p>
                  <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lead Capture Application Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="mb-4 flex items-center gap-2">
            <Store className="h-4 w-4 text-[#0067c0]" />
            <h2 className="text-sm font-extrabold text-slate-900">
              2. Datos de tu negocio para reservar tu local 3D
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-slate-700">Nombre comercial del local *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej. TechZone Asunción"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Rubro principal *</label>
              <input
                type="text"
                required
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                placeholder="Ej. Tecnología, Ropa, Automotora..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Nombre de contacto *</label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Tu nombre y apellido"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">WhatsApp del negocio *</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Ej. 0981 123 456"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Email para tu panel de tienda *</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@tulocal.com.py"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-slate-700">Ciudad *</label>
              <input
                type="text"
                required
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Asunción, CDE, Encarnación, Luque..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-bold text-slate-700">Instagram o Sitio Web (opcional)</label>
              <input
                type="text"
                value={instagramOrWeb}
                onChange={(e) => setInstagramOrWeb(e.target.value)}
                placeholder="Ej. @tulocalpy o https://tulocal.com.py"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-bold text-slate-700">
                Contanos brevemente qué vendés y cuántos productos querés exhibir
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Vendemos celulares nuevos y notebooks outlet, queremos cargar unos 40 productos..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#0067c0]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Sin compromiso: primero coordinamos tu diseño 3D y te habilitamos tu panel autogestionable.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2a9d] to-[#ff6b35] px-5 py-2.5 text-xs font-black text-white shadow-md hover:brightness-110 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Enviando..." : "Reservar mi Local 3D"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

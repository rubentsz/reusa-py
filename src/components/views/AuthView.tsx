"use client";

import { useState } from "react";
import { KeyRound, Loader2, Shield, UserPlus } from "lucide-react";
import { useApp } from "@/components/AppContext";

export function AuthView({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const { setUser, departments, notifyToast } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [cityId, setCityId] = useState(departments[0]?.cities[0]?.id || "");
  const [error, setError] = useState("");

  const selectedDept = departments.find((d) => d.id === departmentId);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Credenciales incorrectas");
        return;
      }
      setUser(data.user);
      notifyToast(`¡Bienvenido/a, ${data.user.name}!`, "success");
      onAuthenticated?.();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await doLogin(email, password);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          whatsappPhone: whatsappPhone || null,
          departmentId: departmentId || null,
          cityId: cityId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la cuenta");
        return;
      }
      setUser(data.user);
      notifyToast(`¡Cuenta creada! Bienvenido/a a ReUsa PY, ${data.user.name}`, "success");
      onAuthenticated?.();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fluent-scroll flex h-full flex-col overflow-y-auto bg-white p-5">
      <div className="mb-4 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#0067c0] text-sm font-extrabold text-white shadow-sm">
          RU
        </div>
        <h1 className="mt-2.5 text-lg font-extrabold text-slate-900">
          {mode === "login" ? "Ingresar a ReUsa PY" : "Crear cuenta gratuita"}
        </h1>
        <p className="text-xs text-slate-500">
          Publicá gratis, guardá favoritos y chateá directo en Paraguay
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "login" ? "bg-white text-[#0067c0] shadow-xs" : "text-slate-600"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={`flex-1 rounded-lg py-2 transition ${
            mode === "register" ? "bg-white text-[#0067c0] shadow-xs" : "text-slate-600"
          }`}
        >
          Registrarme
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "register" && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nombre completo</label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Andrea Martínez"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
          />
        </div>

        {mode === "register" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                WhatsApp (opcional — elegís en cada aviso si se muestra)
              </label>
              <input
                type="text"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="Ej. 0981123456"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0067c0]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={departmentId}
                onChange={(e) => {
                  const dept = departments.find((d) => d.id === e.target.value);
                  setDepartmentId(e.target.value);
                  setCityId(dept?.cities[0]?.id || "");
                }}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
              >
                {selectedDept?.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0067c0] py-2.5 text-sm font-bold text-white transition hover:bg-[#0058a6] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "login" ? (
            <KeyRound className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {/* Quick Demo Access */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-[11px] font-bold text-slate-600">
          Acceso rápido de prueba (1 clic):
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => doLogin("camila@reusa.py", "reusa123")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-semibold text-slate-700 hover:border-[#0067c0] hover:text-[#0067c0]"
          >
            Camila Benítez
            <span className="block text-[10px] font-normal text-slate-400">
              Vendedora con chats y alertas
            </span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => doLogin("admin@reusa.py", "admin123")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-semibold text-slate-700 hover:border-[#0067c0] hover:text-[#0067c0]"
          >
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3 text-[#0067c0]" /> Admin ReUsa PY
            </span>
            <span className="block text-[10px] font-normal text-slate-400">
              Acceso al panel de moderación
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

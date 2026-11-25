"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Heart,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Shield,
  Star,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { ListingCard } from "@/components/ListingCard";
import type { ListingDTO, ReviewDTO } from "@/types/marketplace";
import { formatRelativeDate } from "@/lib/format";

interface PublicProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  whatsappPhone: string | null;
  createdAt: string;
  department: { id: string; name: string; slug: string } | null;
  city: { id: string; name: string; slug: string } | null;
  avgRating: number;
  reviewCount: number;
  activeCount: number;
  soldCount: number;
}

export function ProfileView({ userId }: { userId?: string }) {
  const {
    user,
    departments,
    refreshUser,
    logout,
    openAuth,
    openPublish,
    openFavorites,
    openAdmin,
    notifyToast,
  } = useApp();

  const targetId = userId || user?.id;
  const isSelf = Boolean(user && targetId === user.id);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<ListingDTO[]>([]);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Self edit form
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDeptId, setEditDeptId] = useState("");
  const [editCityId, setEditCityId] = useState("");

  // Leave review form (for other sellers)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setListings(data.listings ?? []);
        setReviews(data.reviews ?? []);
        setEditName(data.profile.name);
        setEditBio(data.profile.bio || "");
        setEditPhone(data.profile.whatsappPhone || "");
        setEditDeptId(data.profile.department?.id || "");
        setEditCityId(data.profile.city?.id || "");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) {
      loadProfile(targetId);
    } else {
      setLoading(false);
    }
  }, [targetId]);

  if (!targetId) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0067c0]/10 text-xl font-extrabold text-[#0067c0]">
          PY
        </div>
        <h2 className="mt-3 text-base font-bold text-slate-900">Tu cuenta en ReUsa PY</h2>
        <p className="mt-1 max-w-xs text-xs text-slate-500">
          Iniciá sesión para gestionar tus publicaciones, favoritos, alertas y reputación.
        </p>
        <button
          type="button"
          onClick={openAuth}
          className="mt-4 rounded-xl bg-[#0067c0] px-5 py-2.5 text-sm font-bold text-white"
        >
          Ingresar o registrarme
        </button>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-8 text-xs text-slate-500">
        Cargando perfil...
      </div>
    );
  }

  const selectedDept = departments.find((d) => d.id === editDeptId);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        bio: editBio,
        whatsappPhone: editPhone,
        departmentId: editDeptId || null,
        cityId: editCityId || null,
      }),
    });
    if (res.ok) {
      await refreshUser();
      await loadProfile(profile.id);
      setEditing(false);
      notifyToast("Perfil actualizado", "success");
    } else {
      notifyToast("No se pudo actualizar el perfil", "error");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuth();
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: profile.id,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyToast(data.error || "Error enviando reseña", "error");
        return;
      }
      setComment("");
      await loadProfile(profile.id);
      notifyToast("¡Gracias por calificar al vendedor!", "success");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="fluent-scroll h-full space-y-5 overflow-y-auto bg-[#f8fafd] p-4 pb-10">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0067c0] text-lg font-extrabold text-white shadow-xs">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">{profile.name}</h1>
                {isSelf && user?.role === "ADMIN" && (
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                    ADMIN
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {profile.reviewCount > 0
                    ? `${profile.avgRating} (${profile.reviewCount} reseñas)`
                    : "Sin reseñas todavía"}
                </span>
                {profile.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.city.name}
                    {profile.department ? `, ${profile.department.name}` : ""}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Miembro desde{" "}
                  {new Date(profile.createdAt).toLocaleDateString("es-PY", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {profile.bio && <p className="mt-2 text-xs text-slate-600">{profile.bio}</p>}
            </div>
          </div>

          {isSelf && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => openPublish()}
                className="inline-flex items-center gap-1 rounded-xl bg-[#0067c0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0058a6]"
              >
                <Plus className="h-3.5 w-3.5" /> Publicar
              </button>
              <button
                type="button"
                onClick={openFavorites}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Heart className="h-3.5 w-3.5 text-rose-500" /> Favoritos / Alertas
              </button>
              {user?.role === "ADMIN" && (
                <button
                  type="button"
                  onClick={openAdmin}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Shield className="h-3.5 w-3.5" /> Moderación
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {editing ? "Cancelar" : "Editar perfil"}
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
              >
                <LogOut className="h-3.5 w-3.5" /> Salir
              </button>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          <div className="rounded-xl bg-slate-50 py-2">
            <span className="block text-base font-extrabold text-slate-900">
              {profile.activeCount}
            </span>
            <span className="text-[11px] text-slate-500">Activos</span>
          </div>
          <div className="rounded-xl bg-slate-50 py-2">
            <span className="block text-base font-extrabold text-emerald-600">
              {profile.soldCount}
            </span>
            <span className="text-[11px] text-slate-500">Vendidos</span>
          </div>
          <div className="rounded-xl bg-slate-50 py-2">
            <span className="block text-base font-extrabold text-amber-500">
              {profile.reviewCount}
            </span>
            <span className="text-[11px] text-slate-500">Reseñas</span>
          </div>
        </div>

        {editing && isSelf && (
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-2.5 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre"
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="WhatsApp (ej. 0981123456)"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs"
                />
              </div>
              <select
                value={editDeptId}
                onChange={(e) => {
                  const dept = departments.find((d) => d.id === e.target.value);
                  setEditDeptId(e.target.value);
                  setEditCityId(dept?.cities[0]?.id || "");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="">Departamento</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                value={editCityId}
                onChange={(e) => setEditCityId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <option value="">Ciudad</option>
                {selectedDept?.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={2}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Breve presentación para compradores..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#0067c0] px-4 py-2 text-xs font-bold text-white"
            >
              Guardar perfil
            </button>
          </form>
        )}
      </div>

      {/* Listings */}
      <section>
        <h2 className="mb-2.5 text-sm font-bold text-slate-900">
          {isSelf ? "Mis publicaciones" : `Publicaciones de ${profile.name}`} ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
            No hay publicaciones todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        )}
      </section>

      {/* Reviews & Reputation */}
      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">
          Calificaciones y reseñas ({reviews.length})
        </h2>

        {!isSelf && (
          <form onSubmit={handleSubmitReview} className="space-y-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-800">
              ¿Compraste o trataste con {profile.name.split(" ")[0]}? Dejá tu calificación:
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              required
              minLength={5}
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Contá cómo fue la experiencia, puntualidad y estado del producto..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#0067c0]"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="rounded-xl bg-[#0067c0] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#0058a6]"
            >
              Publicar reseña
            </button>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className="text-xs text-slate-500">Aún no tiene calificaciones.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((rev) => (
              <div key={rev.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs text-slate-900">{rev.author.name}</strong>
                    <span className="inline-flex items-center text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="h-3 w-3 fill-current" />
                      ))}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {formatRelativeDate(rev.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

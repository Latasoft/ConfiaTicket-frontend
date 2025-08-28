import { useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react"; // tipos como type-only
import { useNavigate } from "react-router-dom";
import api from "@/services/api";

/**
 * Página para que un BUYER solicite ser ORGANIZER subiendo su foto de carnet.
 * Envía multipart/form-data a: POST /organizer-applications/apply
 * Campos:
 *  - legalName (string)
 *  - taxId (string)
 *  - phone (string, opcional)
 *  - notes (string, opcional)
 *  - idCardImage (file)
 */
export default function OrganizerApply() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    legalName: "",
    taxId: "",
    phone: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Ref para limpiar el input file sin usar document.getElementById
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    // Validaciones mínimas
    if (!form.legalName.trim() || !form.taxId.trim()) {
      setMsg({ type: "err", text: "Nombre legal y Documento/RUT son requeridos." });
      return;
    }
    if (!file) {
      setMsg({ type: "err", text: "Debes adjuntar la foto de tu carnet." });
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMsg({ type: "err", text: "Solo se permiten imágenes JPG o PNG." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: "err", text: "La imagen no debe superar 5MB." });
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("legalName", form.legalName.trim());
      fd.append("taxId", form.taxId.trim());
      if (form.phone) fd.append("phone", form.phone.trim());
      if (form.notes) fd.append("notes", form.notes.trim());
      fd.append("idCardImage", file); // nombre de campo esperado por el backend

      // Axios detecta FormData y setea Content-Type automáticamente
      await api.post("/organizer-applications/apply", fd);

      // Éxito: limpia y redirige a "pendiente"
      setForm({ legalName: "", taxId: "", phone: "", notes: "" });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      navigate("/organizador/pendiente", { replace: true });
    } catch (err: any) {
      const text =
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo enviar la solicitud.";
      setMsg({ type: "err", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Solicitar ser Organizador</h1>
      <p className="text-sm text-gray-600 mb-6">
        Completa tus datos y adjunta una foto clara de tu carnet por ambos lados
        (en un solo archivo si es posible).
      </p>

      {msg && (
        <div
          className={`mb-4 rounded-md p-3 ${
            msg.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Nombre legal *</label>
          <input
            name="legalName"
            value={form.legalName}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Nombre completo legal"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Documento / RUT / DNI *</label>
          <input
            name="taxId"
            value={form.taxId}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="12345678-9"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Teléfono (opcional)</label>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="+56 9 1234 5678"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Notas (opcional)</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            rows={3}
            placeholder="Información adicional para la revisión"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Foto de carnet (JPG/PNG, máx 5MB) *</label>
          <input
            id="idCardImage"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={onFile}
            className="w-full"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </div>
  );
}


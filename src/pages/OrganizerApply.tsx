import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react"; // tipos como type-only
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

/**
 * Página para que un BUYER solicite ser ORGANIZER subiendo su foto de carnet
 * y datos bancarios para cuenta de cobro.
 * 
 * Campos que pide al usuario:
 *  - legalName (string, obligatorio) - Nombre legal y titular de la cuenta bancaria
 *  - phone (string, obligatorio)
 *  - notes (string, opcional)
 *  - idCardImage (file)
 *  - payoutBankName (string, obligatorio)
 *  - payoutAccountType (string, obligatorio)
 *  - payoutAccountNumber (string, obligatorio)
 * 
 * se asignan internamente:
 *  - taxId = user.rut
 *  - payoutHolderName = legalName
 *  - payoutHolderRut = user.rut
 */

type AccountType = "VISTA" | "CORRIENTE" | "AHORRO" | "RUT";
const BANKS_CL = [
  "BancoEstado",
  "Banco Estado",
  "Banco de Chile",
  "BCI",
  "Scotiabank",
  "Itaú",
  "Banco Santander",
  "Banco BICE",
  "Banco Falabella",
  "Banco Security",
  "Banco Ripley",
  "Banco Consorcio",
  "Banco Internacional",
  "Banco BTG Pactual",
  "Banco Edwards",
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "VISTA", label: "Cuenta Vista" },
  { value: "CORRIENTE", label: "Cuenta Corriente" },
  { value: "AHORRO", label: "Cuenta de Ahorro" },
  { value: "RUT", label: "Cuenta RUT" },
];

export default function OrganizerApply() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    legalName: "",
    phone: "",
    notes: "",
    payoutBankName: "",
    payoutAccountType: "" as "" | AccountType,
    payoutAccountNumber: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Ref para limpiar el input file sin usar document.getElementById
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar que el usuario tenga RUT registrado
  useEffect(() => {
    if (user && !user.rut) {
      setMsg({ 
        type: "err", 
        text: "Necesitas tener un RUT registrado en tu perfil para solicitar ser organizador." 
      });
    }
  }, [user]);

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
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

    // Verificar que el usuario tenga RUT
    if (!user?.rut) {
      setMsg({ 
        type: "err", 
        text: "Necesitas tener un RUT registrado en tu perfil. Por favor, actualiza tu perfil primero." 
      });
      return;
    }

    // Validaciones básicas
    if (!form.legalName.trim()) {
      setMsg({ type: "err", text: "El nombre legal es requerido." });
      return;
    }
    if (!form.phone.trim()) {
      setMsg({ type: "err", text: "El teléfono es requerido." });
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

    // Validaciones bancarias (TODOS LOS CAMPOS SON OBLIGATORIOS)
    if (!form.payoutBankName) {
      setMsg({ type: "err", text: "Selecciona un banco para la cuenta de cobro." });
      return;
    }
    if (!form.payoutAccountType) {
      setMsg({ type: "err", text: "Selecciona el tipo de cuenta." });
      return;
    }
    if (!/^\d{7,14}$/.test(form.payoutAccountNumber)) {
      setMsg({ type: "err", text: "Ingresa un número de cuenta válido (7-14 dígitos)." });
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("legalName", form.legalName.trim());
      fd.append("phone", form.phone.trim());
      if (form.notes) fd.append("notes", form.notes.trim());
      fd.append("idCardImage", file); // nombre de campo esperado por el backend

      // Datos bancarios obligatorios
      fd.append("payoutBankName", form.payoutBankName);
      fd.append("payoutAccountType", form.payoutAccountType);
      fd.append("payoutAccountNumber", form.payoutAccountNumber);

      // Axios detecta FormData y setea Content-Type automáticamente
      await api.post("/organizer-applications/apply", fd);

      // Éxito: limpia y redirige a "pendiente"
      setForm({ 
        legalName: "", 
        phone: "", 
        notes: "",
        payoutBankName: "",
        payoutAccountType: "",
        payoutAccountNumber: "",
      });
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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Solicitar ser Organizador</h1>
      <p className="text-sm text-gray-600 mb-6">
        Completa tus datos personales, adjunta una foto clara de tu carnet por ambos lados
        y agrega los datos bancarios donde recibirás tus pagos.
      </p>
      
      {user?.rut && (
        <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
          <p className="font-medium">Información importante:</p>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>La cuenta bancaria debe estar a tu nombre y asociada a tu RUT.</li>
          </ul>
        </div>
      )}

      {msg && (
        <div
          className={`mb-4 rounded-md p-3 ${
            msg.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Sección de datos personales */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-medium mb-4">Datos Personales</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre legal *
              </label>
              <input
                name="legalName"
                value={form.legalName}
                onChange={onChange}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Nombre completo legal"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Este será tu nombre como organizador y el titular de tu cuenta de cobro.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                RUT / Documento fiscal
              </label>
              <input
                type="text"
                value={user?.rut || "Cargando..."}
                className="w-full border rounded-md px-3 py-2 bg-gray-50 text-gray-700 cursor-not-allowed"
                readOnly
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Este RUT será usado como documento fiscal y para el titular de la cuenta de cobro.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Teléfono *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                className="w-full border rounded-md px-3 py-2"
                placeholder="+56912345678"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notas (opcional)</label>
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
              <label className="block text-sm font-medium mb-1">Foto de carnet (JPG/PNG, máx 5MB) *</label>
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
          </div>
        </div>

        {/* Sección de datos bancarios */}
        <div className="pb-6">
          <h2 className="text-lg font-medium mb-2">Datos Bancarios *</h2>
          <p className="text-sm text-gray-600 mb-4">
            Ingresa los datos de la cuenta bancaria donde recibirás tus pagos. 
            <strong className="block mt-1">
              La cuenta debe estar asociada a tu RUT ({user?.rut || "..."}) y el titular debe ser el nombre legal que indicaste arriba.
            </strong>
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Banco *</label>
              <select
                name="payoutBankName"
                value={form.payoutBankName}
                onChange={onChange}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Selecciona un banco…</option>
                {BANKS_CL.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de cuenta *</label>
              <select
                name="payoutAccountType"
                value={form.payoutAccountType}
                onChange={onChange}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Selecciona…</option>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Número de cuenta *</label>
              <input
                type="text"
                name="payoutAccountNumber"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.payoutAccountNumber}
                onChange={(e) => 
                  setForm((s) => ({ ...s, payoutAccountNumber: e.target.value.replace(/\D/g, "") }))
                }
                className="w-full border rounded-md px-3 py-2"
                placeholder="Solo dígitos (7-14)"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60 hover:bg-blue-700"
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </div>
  );
}


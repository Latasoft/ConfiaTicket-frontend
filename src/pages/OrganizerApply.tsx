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
  const { user, reloadProfile } = useAuth();

  const [application, setApplication] = useState<any>(null);
  const [loadingApp, setLoadingApp] = useState(true);
  const [form, setForm] = useState({
    legalName: "",
    phone: "",
    notes: "",
    payoutBankName: "",
    payoutAccountType: "" as "" | AccountType,
    payoutAccountNumber: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileBack, setFileBack] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Refs para limpiar los inputs file sin usar document.getElementById
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileBackInputRef = useRef<HTMLInputElement>(null);

  // Cargar la solicitud si existe
  useEffect(() => {
    async function loadApplication() {
      if (!user) return;
      
      try {
        setLoadingApp(true);
        const { data } = await api.get("/organizer-applications/my-application");
        setApplication(data);
        
        // Si tiene solicitud rechazada, prellenar el formulario
        if (data.status === "REJECTED") {
          setForm({
            legalName: data.legalName || "",
            phone: data.phone || "",
            notes: "",
            payoutBankName: data.payoutBankName || "",
            payoutAccountType: data.payoutAccountType || "",
            payoutAccountNumber: data.payoutAccountNumber || "",
          });
        }
      } catch (err: any) {
        // Si no tiene solicitud (404), está bien
        if (err?.response?.status !== 404) {
          console.error("Error cargando solicitud:", err);
        }
      } finally {
        setLoadingApp(false);
      }
    }
    
    loadApplication();
  }, [user]);

  // Verificar que el usuario tenga RUT registrado
  useEffect(() => {
    if (user && !user.rut) {
      setMsg({ 
        type: "err", 
        text: "Necesitas tener un RUT registrado en tu perfil para solicitar ser organizador." 
      });
    }
  }, [user]);

  // Redirigir si la solicitud fue APROBADA
  useEffect(() => {
    if (!user) return;
    
    if (user.applicationStatus === "APPROVED") {
      setMsg({
        type: "err",
        text: "Tu solicitud ya fue aprobada. Ya eres organizador."
      });
      // Redirigir después de 2 segundos
      setTimeout(() => navigate("/"), 2000);
    }
  }, [user, navigate]);

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
  }

  function onFileBack(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFileBack(f);
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
      setMsg({ type: "err", text: "Debes adjuntar la foto frontal de tu carnet." });
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setMsg({ type: "err", text: "La imagen frontal debe ser JPG o PNG." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ type: "err", text: "La imagen frontal no debe superar 5MB." });
      return;
    }

    // Validar imagen trasera (AHORA ES OBLIGATORIA)
    if (!fileBack) {
      setMsg({ type: "err", text: "Debes adjuntar la foto trasera de tu carnet." });
      return;
    }
    if (!["image/jpeg", "image/png"].includes(fileBack.type)) {
      setMsg({ type: "err", text: "La imagen trasera debe ser JPG o PNG." });
      return;
    }
    if (fileBack.size > 5 * 1024 * 1024) {
      setMsg({ type: "err", text: "La imagen trasera no debe superar 5MB." });
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
      fd.append("idCardImage", file); // Imagen frontal (obligatoria)
      fd.append("idCardImageBack", fileBack); // Imagen trasera (obligatoria)

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
      setFileBack(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (fileBackInputRef.current) fileBackInputRef.current.value = "";
      
      // Recargar perfil para actualizar applicationStatus
      await reloadProfile();
      
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

  // Vista de carga
  if (loadingApp) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  // Vista para solicitud PENDING
  if (user?.applicationStatus === "PENDING" && application) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Estado de Solicitud de Organizador</h1>
        
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⏳</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Solicitud Pendiente de Revisión</h2>
              <p className="text-blue-800 mb-4">
                Tu solicitud está siendo revisada por nuestro equipo. Te notificaremos por correo electrónico cuando sea procesada.
              </p>
              <div className="text-sm text-blue-700">
                <p><strong>Enviada el:</strong> {new Date(application.createdAt).toLocaleDateString('es-CL')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-4">Datos enviados:</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600">Nombre legal:</span>{" "}
              <span className="font-medium">{application.legalName}</span>
            </div>
            <div>
              <span className="text-gray-600">Teléfono:</span>{" "}
              <span className="font-medium">{application.phone}</span>
            </div>
            <div>
              <span className="text-gray-600">Banco:</span>{" "}
              <span className="font-medium">{application.payoutBankName}</span>
            </div>
            <div>
              <span className="text-gray-600">Tipo de cuenta:</span>{" "}
              <span className="font-medium">{application.payoutAccountType}</span>
            </div>
            <div>
              <span className="text-gray-600">Número de cuenta:</span>{" "}
              <span className="font-medium">{application.payoutAccountNumber}</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Vista para formulario (sin solicitud o REJECTED)
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">
        {user?.applicationStatus === "REJECTED" ? "Estado de Solicitud de Organizador" : "Solicitar ser Organizador"}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Completa tus datos personales, adjunta una foto clara de tu carnet por ambos lados
        y agrega los datos bancarios donde recibirás tus pagos.
      </p>

      {user?.applicationStatus === "REJECTED" && application?.notes && (
        <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <div className="text-3xl">❌</div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Solicitud Rechazada</h2>
              <p className="text-red-800 mb-3">
                Tu solicitud fue rechazada por el siguiente motivo:
              </p>
              <div className="bg-white rounded border border-red-200 p-3 text-sm text-gray-800">
                {application.notes}
              </div>
              <p className="text-red-800 mt-3 text-sm">
                Por favor, corrige los datos según las observaciones y vuelve a enviar tu solicitud.
              </p>
            </div>
          </div>
        </div>
      )}

      {user?.applicationStatus === "REJECTED" && !application?.notes && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          <p className="font-medium">⚠️ Tu solicitud anterior fue rechazada</p>
          <p className="mt-1">Por favor, corrige los datos solicitados y vuelve a enviar tu solicitud.</p>
        </div>
      )}
      
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

            {/* Componente mejorado para subir cédula (frontal y trasera) */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium text-sm mb-3">📸 Fotos de tu Cédula de Identidad *</h3>
              <p className="text-xs text-gray-600 mb-4">
                Debes subir <strong>ambas caras</strong> de tu cédula (frontal y trasera). JPG o PNG, máximo 5MB cada una.
              </p>

              <div className="space-y-3">
                {/* Imagen Frontal */}
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      🪪 Cara Frontal *
                    </label>
                    {file && (
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        ✕ Eliminar
                      </button>
                    )}
                  </div>
                  
                  {!file ? (
                    <label className="block cursor-pointer">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={onFile}
                        className="hidden"
                        required
                      />
                      <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:bg-blue-50 transition">
                        <p className="text-sm text-blue-600 font-medium">+ Seleccionar imagen frontal</p>
                        <p className="text-xs text-gray-500 mt-1">Haz clic para elegir archivo</p>
                      </div>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-green-800 flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  )}
                </div>

                {/* Imagen Trasera */}
                <div className="bg-white border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      🪪 Cara Trasera *
                    </label>
                    {fileBack && (
                      <button
                        type="button"
                        onClick={() => {
                          setFileBack(null);
                          if (fileBackInputRef.current) fileBackInputRef.current.value = "";
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        ✕ Eliminar
                      </button>
                    )}
                  </div>
                  
                  {!fileBack ? (
                    <label className={`block ${!file ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                      <input
                        ref={fileBackInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={onFileBack}
                        disabled={!file}
                        className="hidden"
                        required
                      />
                      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
                        file 
                          ? 'border-blue-300 hover:bg-blue-50' 
                          : 'border-gray-300 bg-gray-100'
                      }`}>
                        <p className={`text-sm font-medium ${file ? 'text-blue-600' : 'text-gray-400'}`}>
                          + Seleccionar imagen trasera
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {file ? 'Haz clic para elegir archivo' : 'Primero sube la imagen frontal'}
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-green-800 flex-1 truncate">{fileBack.name}</span>
                      <span className="text-xs text-gray-500">{(fileBack.size / 1024).toFixed(0)} KB</span>
                    </div>
                  )}
                </div>
              </div>

              {file && fileBack && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
                  <p className="text-sm text-green-800 font-medium">✓ Ambas imágenes cargadas correctamente</p>
                </div>
              )}
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


export default function OrganizerPending() {
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Verificación en proceso</h1>
      <p className="mb-2">
        Tu cuenta de organizador está <strong>pendiente de verificación</strong>.
      </p>
      <p className="text-sm text-gray-600">
        Cuando un superadmin apruebe tu solicitud, podrás crear y administrar eventos.
      </p>
    </div>
  );
}

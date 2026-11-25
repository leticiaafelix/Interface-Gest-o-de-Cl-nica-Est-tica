import React, { useState } from 'react';
import {
  AlertTriangle,
  Edit3,
  KeyRound,
  Mail,
  Phone,
  Plus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { ASSETS } from '../data/assets';
import { Appointment, Professional } from '../types/clinic';
import { formatDateBR, maskPhone } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { SafeImage } from '../components/SafeImage';

export const ProfessionalsAdminPage: React.FC = () => {
  const {
    state,
    simulatedDate,
    saveProfessional,
    deactivateProfessional,
    reactivateProfessional,
  } = useClinic();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [name, setName] = useState('');
  const [specialtyId, setSpecialtyId] = useState(state.specialties[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState(ASSETS.professionals.ana);
  const [hasPanelAccess, setHasPanelAccess] = useState(true);

  // Deactivate flow with future appointments resolution
  const [deactivateTarget, setDeactivateTarget] = useState<Professional | null>(
    null
  );
  const [futureBookings, setFutureBookings] = useState<Appointment[]>([]);
  const [resolutions, setResolutions] = useState<
    Record<
      string,
      { action: 'reembolsar' | 'remarcar'; newProfessionalId: string }
    >
  >({});

  const openCreate = () => {
    setEditing(null);
    setName('');
    setSpecialtyId(state.specialties[0]?.id ?? '');
    setEmail('');
    setPhone('');
    setPhotoUrl(ASSETS.professionals.ana);
    setHasPanelAccess(true);
    setModalOpen(true);
  };

  const openEdit = (prof: Professional) => {
    setEditing(prof);
    setName(prof.name);
    setSpecialtyId(prof.specialtyId);
    setEmail(prof.email);
    setPhone(prof.phone);
    setPhotoUrl(prof.photoUrl);
    setHasPanelAccess(prof.hasPanelAccess);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !specialtyId) return;
    saveProfessional({
      id: editing?.id ?? `prof-${Date.now()}`,
      name: name.trim(),
      specialtyId,
      email: email.trim(),
      phone: maskPhone(phone),
      photoUrl,
      active: editing?.active ?? true,
      hasPanelAccess,
    });
    setModalOpen(false);
  };

  const openDeactivate = (prof: Professional) => {
    const futures = state.appointments.filter(
      (a) =>
        a.professionalId === prof.id &&
        a.date >= simulatedDate &&
        (a.status === 'agendado' || a.status === 'em_atendimento')
    );
    const sameSpecPeers = state.professionals.filter(
      (p) => p.active && p.id !== prof.id && p.specialtyId === prof.specialtyId
    );
    const initialRes: Record<
      string,
      { action: 'reembolsar' | 'remarcar'; newProfessionalId: string }
    > = {};
    futures.forEach((f) => {
      initialRes[f.id] = {
        action: sameSpecPeers.length > 0 ? 'remarcar' : 'reembolsar',
        newProfessionalId: sameSpecPeers[0]?.id ?? '',
      };
    });
    setFutureBookings(futures);
    setResolutions(initialRes);
    setDeactivateTarget(prof);
  };

  const handleConfirmDeactivate = () => {
    if (!deactivateTarget) return;
    const payload = futureBookings.map((f) => ({
      appointmentId: f.id,
      action: resolutions[f.id]?.action ?? 'reembolsar',
      newProfessionalId: resolutions[f.id]?.newProfessionalId,
    }));
    deactivateProfessional(deactivateTarget.id, payload);
    setDeactivateTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Profissionais
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            Cada profissional possui exatamente uma especialidade e acesso opcional ao painel
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rf-btn-primary px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Novo profissional</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {state.professionals.map((prof) => {
          const spec = state.specialties.find((s) => s.id === prof.specialtyId);
          return (
            <article key={prof.id} className="rf-card p-5 flex flex-col justify-between gap-4">
              <div className="flex items-start gap-4">
                <SafeImage
                  src={prof.photoUrl}
                  alt={`Retrato de ${prof.name}`}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#EADAD3] shrink-0"
                  fallbackLabel={prof.name}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold text-[#2E2A2B] truncate">
                      {prof.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        prof.active
                          ? 'bg-[#E8F4EC] text-[#1F6138] border-[#BCE0C8]'
                          : 'bg-[#FDECEC] text-[#9B2C2C] border-[#F5C2C2]'
                      }`}
                    >
                      {prof.active ? 'Ativa' : 'Desativada'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#9A5560] mt-0.5">
                    {spec?.name}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-[#6E6567]">
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{prof.email}</span>
                    </p>
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{prof.phone}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {prof.hasPanelAccess
                          ? 'Acesso ao painel ativo'
                          : 'Sem acesso ao painel'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1E6E0]">
                <button
                  type="button"
                  onClick={() => openEdit(prof)}
                  className="rf-btn-outline px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Editar</span>
                </button>
                {prof.active ? (
                  <button
                    type="button"
                    onClick={() => openDeactivate(prof)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#9B2C2C] bg-[#FDECEC] hover:bg-[#F9D5D5] inline-flex items-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Desativar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => reactivateProfessional(prof.id)}
                    className="rf-btn-secondary px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reativar</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Create / Edit Professional Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar profissional' : 'Novo profissional'}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="prof-name" className="block text-sm font-medium mb-1">
              Nome completo *
            </label>
            <input
              id="prof-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="prof-spec" className="block text-sm font-medium mb-1">
              Especialidade única *
            </label>
            <select
              id="prof-spec"
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              required
            >
              {state.specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="prof-email" className="block text-sm font-medium mb-1">
                E-mail *
              </label>
              <input
                id="prof-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="prof-phone" className="block text-sm font-medium mb-1">
                Telefone *
              </label>
              <input
                id="prof-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(21) 99999-9999"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-photo" className="block text-sm font-medium mb-1">
              Foto do perfil
            </label>
            <select
              id="prof-photo"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            >
              <option value={ASSETS.professionals.ana}>Retrato 1 (Ana)</option>
              <option value={ASSETS.professionals.beatriz}>Retrato 2 (Beatriz)</option>
              <option value={ASSETS.professionals.carla}>Retrato 3 (Carla)</option>
              <option value={ASSETS.professionals.daniela}>Retrato 4 (Daniela)</option>
              <option value={ASSETS.professionals.eduarda}>Retrato 5 (Eduarda)</option>
              <option value={ASSETS.professionals.fernanda}>Retrato 6 (Fernanda)</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFFAF7] border border-[#EADAD3] cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={hasPanelAccess}
              onChange={(e) => setHasPanelAccess(e.target.checked)}
              className="accent-[#B76E79]"
            />
            <span>Permitir acesso ao painel (perfil Profissional)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="rf-btn-primary px-5 py-2 text-sm font-medium">
              Salvar profissional
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Professional with Future Bookings Handling */}
      <Modal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title={`Desativar ${deactivateTarget?.name ?? ''}`}
        subtitle="Tratamento obrigatório para reservas futuras"
        maxWidthClass="max-w-lg"
      >
        {deactivateTarget && (
          <div className="space-y-4">
            {futureBookings.length === 0 ? (
              <p className="text-sm text-[#6E6567]">
                Esta profissional não possui reservas futuras ativas. Deseja
                desativar o cadastro agora?
              </p>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#FFF4E5] border border-[#F0D0A8] text-xs text-[#8C5214] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Existem <strong>{futureBookings.length}</strong> reserva(s)
                    futura(s). Escolha remarcar para outra profissional da mesma
                    especialidade ou cancelar com reembolso integral.
                  </span>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {futureBookings.map((booking) => {
                    const peers = state.professionals.filter(
                      (p) =>
                        p.active &&
                        p.id !== deactivateTarget.id &&
                        p.specialtyId === deactivateTarget.specialtyId
                    );
                    const currentRes = resolutions[booking.id];
                    return (
                      <div
                        key={booking.id}
                        className="p-3 rounded-xl bg-[#FFFAF7] border border-[#EADAD3] space-y-2 text-xs"
                      >
                        <p className="font-semibold text-[#2E2A2B] tabular-nums">
                          {formatDateBR(booking.date)} às {booking.startTime} ·{' '}
                          {booking.clientName} ({booking.serviceName})
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Ação para reserva de ${booking.clientName}`}
                            value={currentRes?.action ?? 'reembolsar'}
                            onChange={(e) =>
                              setResolutions((prev) => ({
                                ...prev,
                                [booking.id]: {
                                  ...prev[booking.id],
                                  action: e.target.value as
                                    | 'reembolsar'
                                    | 'remarcar',
                                },
                              }))
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-[#D9C3B9] bg-white"
                          >
                            {peers.length > 0 && (
                              <option value="remarcar">Remarcar para colega</option>
                            )}
                            <option value="reembolsar">
                              Cancelar com reembolso 100%
                            </option>
                          </select>

                          {currentRes?.action === 'remarcar' && peers.length > 0 && (
                            <select
                              aria-label={`Nova profissional para ${booking.clientName}`}
                              value={currentRes.newProfessionalId}
                              onChange={(e) =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [booking.id]: {
                                    ...prev[booking.id],
                                    newProfessionalId: e.target.value,
                                  },
                                }))
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-[#D9C3B9] bg-white"
                            >
                              {peers.map((peer) => (
                                <option key={peer.id} value={peer.id}>
                                  {peer.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="rf-btn-outline px-4 py-2 text-sm font-medium"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#9B2C2C] text-white"
              >
                Confirmar desativação
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

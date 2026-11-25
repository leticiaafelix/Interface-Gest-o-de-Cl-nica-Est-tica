import React, { useState } from 'react';
import { Calendar, Edit3, Gift, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { PackagePromo } from '../types/clinic';
import {
  calculatePackageSavings,
  formatCurrencyBRL,
  formatDateBR,
  getPackageStatus,
  WEEKDAY_SHORT_LABELS,
} from '../utils/formatters';
import { Modal } from '../components/Modal';
import { BrazilianDateInput, BrazilianTimeInput } from '../components/DateTimeInputs';

export const PackagesPage: React.FC = () => {
  const { state, simulatedDate, savePackage, deletePackage } = useClinic();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PackagePromo | null>(null);

  const [editing, setEditing] = useState<PackagePromo | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [price, setPrice] = useState(199);
  const [validFrom, setValidFrom] = useState(simulatedDate);
  const [validUntil, setValidUntil] = useState(simulatedDate);
  const [weekdays, setWeekdays] = useState<number[]>([4, 5, 6]);
  const [active, setActive] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setServiceIds(['svc-corte', 'svc-manicure']);
    setPrice(99);
    setValidFrom(simulatedDate);
    setValidUntil(simulatedDate);
    setWeekdays([2, 3, 4, 5]);
    setActive(true);
    setModalOpen(true);
  };

  const openEdit = (pkg: PackagePromo) => {
    setEditing(pkg);
    setName(pkg.name);
    setDescription(pkg.description);
    setServiceIds(pkg.serviceIds);
    setPrice(pkg.price);
    setValidFrom(pkg.validFrom);
    setValidUntil(pkg.validUntil);
    setWeekdays(pkg.weekdays);
    setActive(pkg.active);
    setModalOpen(true);
  };

  const toggleServiceId = (id: string) => {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((x) => x !== day) : [...prev, day].sort()
    );
  };

  const draftSavings = calculatePackageSavings(
    {
      id: 'draft',
      name,
      description,
      serviceIds,
      price,
      validFrom,
      validUntil,
      weekdays,
      active,
    },
    state.services
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || serviceIds.length === 0) return;
    savePackage({
      id: editing?.id ?? `pkg-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      serviceIds,
      price: Number(price),
      validFrom,
      validUntil,
      weekdays,
      active,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Pacotes Promocionais
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            Combinações de serviços com economia calculada, validade e dias da semana
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rf-btn-primary px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Novo pacote</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.packages.map((pkg) => {
          const status = getPackageStatus(pkg, simulatedDate);
          const calc = calculatePackageSavings(pkg, state.services);
          const includedNames = pkg.serviceIds
            .map((id) => state.services.find((s) => s.id === id)?.name)
            .filter(Boolean);

          const statusStyles =
            status === 'Vigente'
              ? 'bg-[#E8F4EC] text-[#1F6138] border-[#BCE0C8]'
              : status === 'Agendado'
              ? 'bg-[#FEF6E6] text-[#8D6114] border-[#ECD39B]'
              : 'bg-[#F2EFEF] text-[#5A5254] border-[#DDD5D6]';

          return (
            <article key={pkg.id} className="rf-card p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#F3E3DC] flex items-center justify-center text-[#B76E79]">
                      <Gift className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-[#2E2A2B]">
                        {pkg.name}
                      </h2>
                      <p className="text-xs text-[#6E6567] tabular-nums">
                        <Calendar className="w-3 h-3 inline mr-1" aria-hidden="true" />
                        {formatDateBR(pkg.validFrom)} a {formatDateBR(pkg.validUntil)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyles}`}
                  >
                    {status}
                  </span>
                </div>

                {pkg.description && (
                  <p className="text-sm text-[#6E6567]">{pkg.description}</p>
                )}

                <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] space-y-2 text-xs">
                  <p className="font-semibold text-[#2E2A2B]">
                    Serviços inclusos: {includedNames.join(' + ')}
                  </p>
                  <p className="text-[#6E6567]">
                    Dias válidos:{' '}
                    {pkg.weekdays.map((w) => WEEKDAY_SHORT_LABELS[w]).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1E6E0]">
                <div>
                  <p className="text-xs text-[#6E6567] line-through tabular-nums">
                    Avulso: {formatCurrencyBRL(calc.regularTotal)}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-[#B76E79] tabular-nums">
                      {formatCurrencyBRL(pkg.price)}
                    </span>
                    <span className="text-xs font-semibold text-[#1F6138] tabular-nums">
                      Economia de {formatCurrencyBRL(calc.savings)} ({calc.savingsPercent}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(pkg)}
                    className="rf-btn-outline px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(pkg)}
                    aria-label={`Excluir pacote ${pkg.name}`}
                    className="p-2 rounded-full text-[#9B2C2C] hover:bg-[#FDECEC]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Create / Edit Package Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar pacote' : 'Novo pacote promocional'}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="pkg-name" className="block text-sm font-medium mb-1">
              Nome do pacote *
            </label>
            <input
              id="pkg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              required
            />
          </div>

          <div>
            <label htmlFor="pkg-desc" className="block text-sm font-medium mb-1">
              Descrição
            </label>
            <textarea
              id="pkg-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Serviços incluídos *</p>
            <div className="grid grid-cols-2 gap-2">
              {state.services.map((svc) => (
                <label
                  key={svc.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-[#EADAD3] bg-[#FFFAF7] text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(svc.id)}
                    onChange={() => toggleServiceId(svc.id)}
                    className="accent-[#B76E79]"
                  />
                  <span className="font-medium text-[#2E2A2B]">{svc.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="pkg-price" className="block text-xs font-medium mb-1">
                Preço do pacote (R$)
              </label>
              <input
                id="pkg-price"
                type="number"
                min={10}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                required
              />
            </div>
            <div>
              <label htmlFor="pkg-from" className="block text-xs font-medium mb-1">
                Início validade
              </label>
              <BrazilianDateInput
                id="pkg-from"
                value={validFrom}
                fullWidth
                onChange={(iso) => setValidFrom(iso)}
                className="w-full px-2.5 py-2 rounded-xl border border-[#D9C3B9] text-xs bg-white tabular-nums"
                required
              />
            </div>
            <div>
              <label htmlFor="pkg-until" className="block text-xs font-medium mb-1">
                Fim validade
              </label>
              <BrazilianDateInput
                id="pkg-until"
                value={validUntil}
                fullWidth
                onChange={(iso) => setValidUntil(iso)}
                className="w-full px-2.5 py-2 rounded-xl border border-[#D9C3B9] text-xs bg-white tabular-nums"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F4EC]/70 border border-[#BCE0C8] flex items-center justify-between text-xs text-[#1F6138]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Economia calculada:
            </span>
            <span className="font-bold tabular-nums">
              {formatCurrencyBRL(draftSavings.savings)} ({draftSavings.savingsPercent}% sobre{' '}
              {formatCurrencyBRL(draftSavings.regularTotal)})
            </span>
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5">Dias da semana válidos</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_SHORT_LABELS.map((lbl, idx) => {
                const selected = weekdays.includes(idx);
                return (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => toggleWeekday(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      selected
                        ? 'bg-[#B76E79] text-white border-[#B76E79]'
                        : 'bg-white text-[#6E6567] border-[#D9C3B9]'
                    }`}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-[#B76E79]"
            />
            <span>Pacote ativo dentro do período</span>
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
              Salvar pacote
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Package Confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Excluir pacote"
        maxWidthClass="max-w-sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[#6E6567]">
              Deseja excluir permanentemente o pacote{' '}
              <strong className="text-[#2E2A2B]">{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rf-btn-outline px-4 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePackage(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#9B2C2C] text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

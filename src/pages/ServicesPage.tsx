import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit3,
  FolderPlus,
  Info,
  Plus,
  Power,
  Scissors,
  Trash2,
} from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { ASSETS } from '../data/assets';
import { HairFormat, HairLength, HairMatrix, Service } from '../types/clinic';
import {
  formatCurrencyBRL,
  formatDurationLabel,
  HAIR_FORMAT_LABELS,
  HAIR_LENGTH_LABELS,
} from '../utils/formatters';
import { Modal } from '../components/Modal';
import { SafeImage } from '../components/SafeImage';

const DEFAULT_MATRIX: HairMatrix = {
  liso: {
    curto: { price: 60, durationMinutes: 30 },
    medio: { price: 75, durationMinutes: 60 },
    longo: { price: 90, durationMinutes: 90 },
  },
  ondulado: {
    curto: { price: 70, durationMinutes: 30 },
    medio: { price: 85, durationMinutes: 60 },
    longo: { price: 100, durationMinutes: 90 },
  },
  cacheado: {
    curto: { price: 80, durationMinutes: 30 },
    medio: { price: 95, durationMinutes: 60 },
    longo: { price: 110, durationMinutes: 90 },
  },
};

export const ServicesPage: React.FC = () => {
  const {
    state,
    simulatedDate,
    saveCategory,
    saveSpecialty,
    saveService,
    toggleServiceActive,
    deleteService,
    pushToast,
  } = useClinic();

  const [catFilter, setCatFilter] = useState('todas');
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // Service form state
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcCategoryId, setSvcCategoryId] = useState('salao');
  const [svcSpecialtyId, setSvcSpecialtyId] = useState('spec-cabelo');
  const [svcPhotoUrl, setSvcPhotoUrl] = useState(ASSETS.services.cabelo);
  const [variesByHair, setVariesByHair] = useState(false);
  const [fixedPrice, setFixedPrice] = useState(60);
  const [fixedDuration, setFixedDuration] = useState(60);
  const [hairMatrix, setHairMatrix] = useState<HairMatrix>(DEFAULT_MATRIX);

  // Category & Specialty forms
  const [newCatName, setNewCatName] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecCatId, setNewSpecCatId] = useState('salao');

  const filteredServices = useMemo(() => {
    return state.services.filter(
      (s) => catFilter === 'todas' || s.categoryId === catFilter
    );
  }, [state.services, catFilter]);

  const openCreateService = () => {
    setEditingService(null);
    setSvcName('');
    setSvcDesc('');
    setSvcCategoryId(state.categories[0]?.id ?? 'salao');
    setSvcSpecialtyId(state.specialties[0]?.id ?? 'spec-cabelo');
    setSvcPhotoUrl(ASSETS.services.cabelo);
    setVariesByHair(false);
    setFixedPrice(60);
    setFixedDuration(60);
    setHairMatrix(JSON.parse(JSON.stringify(DEFAULT_MATRIX)));
    setServiceModalOpen(true);
  };

  const openEditService = (svc: Service) => {
    setEditingService(svc);
    setSvcName(svc.name);
    setSvcDesc(svc.description ?? '');
    setSvcCategoryId(svc.categoryId);
    setSvcSpecialtyId(svc.specialtyId);
    setSvcPhotoUrl(svc.photoUrl);
    setVariesByHair(svc.variesByHair);
    setFixedPrice(svc.fixedPrice);
    setFixedDuration(svc.fixedDurationMinutes);
    setHairMatrix(
      svc.hairMatrix
        ? JSON.parse(JSON.stringify(svc.hairMatrix))
        : JSON.parse(JSON.stringify(DEFAULT_MATRIX))
    );
    setServiceModalOpen(true);
  };

  const updateMatrixCell = (
    fmt: HairFormat,
    len: HairLength,
    field: 'price' | 'durationMinutes',
    value: number
  ) => {
    setHairMatrix((prev) => ({
      ...prev,
      [fmt]: {
        ...prev[fmt],
        [len]: {
          ...prev[fmt][len],
          [field]: value,
        },
      },
    }));
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcName.trim()) return;
    saveService({
      id: editingService?.id ?? `svc-${Date.now()}`,
      name: svcName.trim(),
      description: svcDesc.trim() || undefined,
      categoryId: svcCategoryId,
      specialtyId: svcSpecialtyId,
      photoUrl: svcPhotoUrl,
      active: editingService?.active ?? true,
      variesByHair,
      fixedPrice: Number(fixedPrice) || 0,
      fixedDurationMinutes: Number(fixedDuration) || 30,
      hairMatrix: variesByHair ? hairMatrix : undefined,
    });
    setServiceModalOpen(false);
  };

  const handleDeleteAttempt = (svc: Service) => {
    const res = deleteService(svc.id);
    if (!res.ok) {
      pushToast({
        type: 'error',
        title: 'Exclusão não permitida',
        description: res.message,
      });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Serviços e Preços
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            Catálogo por categoria, especialidade e tabela 3x3 para serviços de cabelo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCatModalOpen(true)}
            className="rf-btn-outline px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Nova categoria</span>
          </button>
          <button
            type="button"
            onClick={() => setSpecModalOpen(true)}
            className="rf-btn-outline px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Nova especialidade</span>
          </button>
          <button
            type="button"
            onClick={openCreateService}
            className="rf-btn-primary px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Novo serviço</span>
          </button>
        </div>
      </div>

      {/* Price policy alert */}
      <div className="p-4 rounded-2xl bg-[#F3E3DC]/60 border border-[#E4C8BC] flex items-center gap-3 text-xs text-[#2E2A2B]">
        <Info className="w-4 h-4 text-[#9A5560] shrink-0" aria-hidden="true" />
        <span>
          <strong>Regra de alteração de preços:</strong> novos valores e durações
          valem apenas para <strong>reservas novas</strong>; atendimentos já
          agendados mantêm o valor original.
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCatFilter('todas')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
            catFilter === 'todas'
              ? 'bg-[#B76E79] text-white border-[#B76E79]'
              : 'bg-white text-[#2E2A2B] border-[#EADAD3]'
          }`}
        >
          Todas as categorias
        </button>
        {state.categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCatFilter(cat.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
              catFilter === cat.id
                ? 'bg-[#B76E79] text-white border-[#B76E79]'
                : 'bg-white text-[#2E2A2B] border-[#EADAD3]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredServices.map((svc) => {
          const cat = state.categories.find((c) => c.id === svc.categoryId);
          const spec = state.specialties.find((s) => s.id === svc.specialtyId);
          const hasFuture = state.appointments.some(
            (a) =>
              a.serviceId === svc.id &&
              a.date >= simulatedDate &&
              (a.status === 'agendado' || a.status === 'em_atendimento')
          );

          return (
            <article key={svc.id} className="rf-card p-5 space-y-4">
              <div className="flex items-start gap-4">
                <SafeImage
                  src={svc.photoUrl}
                  alt={svc.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-[#EADAD3] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                        {svc.name}
                      </h2>
                      <p className="text-xs text-[#6E6567]">
                        {cat?.name} · {spec?.name}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        svc.active
                          ? 'bg-[#E8F4EC] text-[#1F6138] border-[#BCE0C8]'
                          : 'bg-[#F2EFEF] text-[#5A5254] border-[#DDD5D6]'
                      }`}
                    >
                      {svc.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {svc.description && (
                    <p className="text-xs text-[#6E6567] mt-1.5">
                      {svc.description}
                    </p>
                  )}
                </div>
              </div>

              {svc.variesByHair && svc.hairMatrix ? (
                <div className="overflow-x-auto border border-[#EADAD3] rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FFFAF7] border-b border-[#EADAD3] text-[#6E6567]">
                        <th className="py-2 px-3">Formato</th>
                        <th className="py-2 px-3">Curto</th>
                        <th className="py-2 px-3">Médio</th>
                        <th className="py-2 px-3">Longo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1E6E0] tabular-nums">
                      {(['liso', 'ondulado', 'cacheado'] as HairFormat[]).map(
                        (fmt) => (
                          <tr key={fmt}>
                            <td className="py-2 px-3 font-semibold text-[#2E2A2B]">
                              {HAIR_FORMAT_LABELS[fmt]}
                            </td>
                            {(['curto', 'medio', 'longo'] as HairLength[]).map(
                              (len) => {
                                const cell = svc.hairMatrix![fmt][len];
                                return (
                                  <td key={len} className="py-2 px-3">
                                    <span className="font-semibold text-[#9A5560]">
                                      {formatCurrencyBRL(cell.price)}
                                    </span>{' '}
                                    <span className="text-[#6E6567]">
                                      ({formatDurationLabel(cell.durationMinutes)})
                                    </span>
                                  </td>
                                );
                              }
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFFAF7] border border-[#EADAD3]">
                  <span className="text-xs text-[#6E6567]">
                    Preço e duração fixos
                  </span>
                  <span className="text-sm font-bold text-[#9A5560] tabular-nums">
                    {formatCurrencyBRL(svc.fixedPrice)} ·{' '}
                    {formatDurationLabel(svc.fixedDurationMinutes)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#F1E6E0]">
                <button
                  type="button"
                  onClick={() => openEditService(svc)}
                  className="rf-btn-outline px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleServiceActive(svc.id)}
                  title={
                    svc.active && hasFuture
                      ? 'Possui reservas futuras (somente desativação)'
                      : undefined
                  }
                  className="rf-btn-secondary px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1"
                >
                  <Power className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{svc.active ? 'Desativar' : 'Ativar'}</span>
                </button>
                {!hasFuture && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(svc)}
                    aria-label={`Excluir serviço ${svc.name}`}
                    className="p-1.5 rounded-full text-[#9B2C2C] hover:bg-[#FDECEC]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Create / Edit Service Modal */}
      <Modal
        open={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        title={editingService ? 'Editar serviço' : 'Novo serviço'}
        subtitle="Novos preços passam a valer apenas para reservas novas"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="svc-name" className="block text-sm font-medium mb-1">
                Nome do serviço *
              </label>
              <input
                id="svc-name"
                type="text"
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                required
              />
            </div>

            <div>
              <label htmlFor="svc-photo" className="block text-sm font-medium mb-1">
                Foto ilustrativa
              </label>
              <select
                id="svc-photo"
                value={svcPhotoUrl}
                onChange={(e) => setSvcPhotoUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              >
                <option value={ASSETS.services.cabelo}>Salão — Cabelo</option>
                <option value={ASSETS.services.escova}>Salão — Escova</option>
                <option value={ASSETS.services.manicure}>Salão — Manicure</option>
                <option value={ASSETS.services.estetica}>Estética — Tratamento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="svc-cat" className="block text-sm font-medium mb-1">
                Categoria
              </label>
              <select
                id="svc-cat"
                value={svcCategoryId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setSvcCategoryId(cid);
                  const firstSpec = state.specialties.find(
                    (s) => s.categoryId === cid
                  );
                  if (firstSpec) setSvcSpecialtyId(firstSpec.id);
                }}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              >
                {state.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="svc-spec" className="block text-sm font-medium mb-1">
                Especialidade
              </label>
              <select
                id="svc-spec"
                value={svcSpecialtyId}
                onChange={(e) => setSvcSpecialtyId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              >
                {state.specialties
                  .filter((s) => s.categoryId === svcCategoryId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="svc-desc" className="block text-sm font-medium mb-1">
              Descrição
            </label>
            <input
              id="svc-desc"
              type="text"
              value={svcDesc}
              onChange={(e) => setSvcDesc(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            />
          </div>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FFFAF7] border border-[#EADAD3] cursor-pointer">
            <input
              type="checkbox"
              checked={variesByHair}
              onChange={(e) => setVariesByHair(e.target.checked)}
              className="w-4 h-4 accent-[#B76E79]"
            />
            <span className="text-sm font-medium text-[#2E2A2B]">
              Preço varia conforme o cabelo (tabela 3x3)
            </span>
          </label>

          {!variesByHair ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="svc-price" className="block text-sm font-medium mb-1">
                  Preço fixo (R$)
                </label>
                <input
                  id="svc-price"
                  type="number"
                  min={10}
                  step={1}
                  value={fixedPrice}
                  onChange={(e) => setFixedPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                  required
                />
              </div>
              <div>
                <label htmlFor="svc-dur" className="block text-sm font-medium mb-1">
                  Duração (múltiplos de 30 min)
                </label>
                <select
                  id="svc-dur"
                  value={fixedDuration}
                  onChange={(e) => setFixedDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white tabular-nums"
                >
                  <option value={30}>30 minutos</option>
                  <option value={60}>1 hora (60 min)</option>
                  <option value={90}>1 h 30 (90 min)</option>
                  <option value={120}>2 horas (120 min)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#2E2A2B]">
                Tabela 3x3 — Preço (R$) e Duração por Formato x Tamanho
              </p>
              <div className="overflow-x-auto border border-[#EADAD3] rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FFFAF7] border-b border-[#EADAD3]">
                      <th className="p-2">Formato</th>
                      {(['curto', 'medio', 'longo'] as HairLength[]).map((len) => (
                        <th key={len} className="p-2">
                          {HAIR_LENGTH_LABELS[len]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1E6E0]">
                    {(['liso', 'ondulado', 'cacheado'] as HairFormat[]).map(
                      (fmt) => (
                        <tr key={fmt}>
                          <td className="p-2 font-semibold">
                            {HAIR_FORMAT_LABELS[fmt]}
                          </td>
                          {(['curto', 'medio', 'longo'] as HairLength[]).map(
                            (len) => {
                              const cell = hairMatrix[fmt][len];
                              return (
                                <td key={len} className="p-2 space-y-1">
                                  <input
                                    type="number"
                                    min={10}
                                    aria-label={`Preço ${HAIR_FORMAT_LABELS[fmt]} ${HAIR_LENGTH_LABELS[len]}`}
                                    value={cell.price}
                                    onChange={(e) =>
                                      updateMatrixCell(
                                        fmt,
                                        len,
                                        'price',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 rounded border border-[#D9C3B9] tabular-nums"
                                  />
                                  <select
                                    aria-label={`Duração ${HAIR_FORMAT_LABELS[fmt]} ${HAIR_LENGTH_LABELS[len]}`}
                                    value={cell.durationMinutes}
                                    onChange={(e) =>
                                      updateMatrixCell(
                                        fmt,
                                        len,
                                        'durationMinutes',
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-1.5 py-1 rounded border border-[#D9C3B9] tabular-nums"
                                  >
                                    <option value={30}>30 min</option>
                                    <option value={60}>60 min</option>
                                    <option value={90}>90 min</option>
                                  </select>
                                </td>
                              );
                            }
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setServiceModalOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="rf-btn-primary px-5 py-2 text-sm font-medium">
              Salvar serviço
            </button>
          </div>
        </form>
      </Modal>

      {/* New Category Modal */}
      <Modal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="Nova categoria"
        maxWidthClass="max-w-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newCatName.trim()) return;
            saveCategory({
              id: `cat-${Date.now()}`,
              name: newCatName.trim(),
            });
            setNewCatName('');
            setCatModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="cat-name" className="block text-sm font-medium mb-1">
              Nome da categoria *
            </label>
            <input
              id="cat-name"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ex.: Spa Corporal"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="rf-btn-primary px-5 py-2 text-sm font-medium">
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* New Specialty Modal */}
      <Modal
        open={specModalOpen}
        onClose={() => setSpecModalOpen(false)}
        title="Nova especialidade"
        maxWidthClass="max-w-sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newSpecName.trim()) return;
            saveSpecialty({
              id: `spec-${Date.now()}`,
              categoryId: newSpecCatId,
              name: newSpecName.trim(),
            });
            setNewSpecName('');
            setSpecModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="sp-cat" className="block text-sm font-medium mb-1">
              Categoria
            </label>
            <select
              id="sp-cat"
              value={newSpecCatId}
              onChange={(e) => setNewSpecCatId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            >
              {state.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sp-name" className="block text-sm font-medium mb-1">
              Nome da especialidade *
            </label>
            <input
              id="sp-name"
              type="text"
              value={newSpecName}
              onChange={(e) => setNewSpecName(e.target.value)}
              placeholder="Ex.: Design de Sobrancelhas"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSpecModalOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="rf-btn-primary px-5 py-2 text-sm font-medium">
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete service confirmation */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar exclusão de serviço"
        maxWidthClass="max-w-sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 text-sm text-[#9B2C2C] bg-[#FDECEC] p-3.5 rounded-xl border border-[#F5C2C2]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Tem certeza que deseja excluir{' '}
                <strong>{deleteTarget.name}</strong>? Esta ação é irreversível.
              </span>
            </div>
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
                onClick={() => handleDeleteAttempt(deleteTarget)}
                className="px-5 py-2 rounded-full text-sm font-medium bg-[#9B2C2C] text-white hover:bg-[#7D2222]"
              >
                Excluir serviço
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

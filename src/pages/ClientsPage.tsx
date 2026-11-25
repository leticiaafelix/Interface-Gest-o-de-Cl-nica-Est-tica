import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Edit3,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useClinic } from '../context/ClinicContext';
import { Client } from '../types/clinic';
import {
  formatCurrencyBRL,
  formatDateBR,
  maskCPF,
  maskPhone,
  onlyDigits,
  validateCPF,
  formatMaskedCPF,
} from '../utils/formatters';
import { getClientAvailableCredit } from '../utils/scheduling';
import { AppointmentStatusLabel } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/SkeletonBlock';

export const ClientsPage: React.FC = () => {
  const { state, simulatedDate, upsertClient, toggleClientActive, pushToast } =
    useClinic();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(
    () => searchParams.get('id') || state.clients[0]?.id || ''
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && state.clients.some((c) => c.id === paramId)) {
      setSelectedId(paramId);
    }
  }, [searchParams, state.clients]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = onlyDigits(q);
    if (!q) return state.clients;
    return state.clients.filter((c) => {
      const byName = c.name.toLowerCase().includes(q);
      const byCpf = digits.length >= 2 && onlyDigits(c.cpf).includes(digits);
      return byName || byCpf;
    });
  }, [state.clients, query]);

  const selectedClient = useMemo(
    () => state.clients.find((c) => c.id === selectedId),
    [state.clients, selectedId]
  );

  const clientHistory = useMemo(() => {
    if (!selectedClient) return [];
    return state.appointments
      .filter((a) => a.clientId === selectedClient.id)
      .sort((a, b) =>
        `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
      );
  }, [state.appointments, selectedClient]);

  const openCreateModal = () => {
    setEditingId(undefined);
    setName('');
    setCpf('');
    setPhone('');
    setEmail('');
    setNotes('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEditModal = (cli: Client) => {
    setEditingId(cli.id);
    setName(cli.name);
    setCpf(cli.cpf);
    setPhone(cli.phone);
    setEmail(cli.email);
    setNotes(cli.notes ?? '');
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (name.trim().length < 3) {
      errors.name = 'Informe o nome completo com pelo menos 3 caracteres.';
    }
    if (!validateCPF(cpf)) {
      errors.cpf =
        'CPF inválido. Confira os 11 dígitos informados e tente novamente.';
    }
    if (onlyDigits(phone).length < 10) {
      errors.phone = 'Telefone inválido. Informe DDD + número com 10 ou 11 dígitos.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Informe um endereço de e-mail válido.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const res = upsertClient({
      id: editingId,
      name: name.trim(),
      cpf: maskCPF(cpf),
      phone: maskPhone(phone),
      email: email.trim(),
      notes: notes.trim() || undefined,
      active: selectedClient?.active ?? true,
    });

    if (res.isDuplicateCpf) {
      setFormOpen(false);
      setSelectedId(res.client.id);
      setSearchParams({ id: res.client.id });
      pushToast({
        type: 'info',
        title: 'CPF já cadastrado',
        description: `Abrimos a ficha existente de ${res.client.name}.`,
      });
      return;
    }

    setFormOpen(false);
    setSelectedId(res.client.id);
    setSearchParams({ id: res.client.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Clientes
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5">
            Fichas cadastrais, histórico de atendimentos, faltas e créditos válidos
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rf-btn-primary px-5 py-2.5 text-sm font-medium inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Nova cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Search & List (5 cols) */}
        <div className="lg:col-span-5 rf-card p-4 space-y-4">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou CPF..."
              aria-label="Filtrar lista de clientes"
              className="w-full pl-10 pr-4 py-2 rounded-full border border-[#D9C3B9] text-sm bg-[#FFFAF7]"
            />
          </div>

          {filteredClients.length === 0 ? (
            <EmptyState
              title="Nenhuma cliente encontrada"
              description="Tente outro nome ou CPF, ou cadastre uma nova cliente."
              actionLabel="Cadastrar cliente"
              onAction={openCreateModal}
              icon={<Users className="w-6 h-6" />}
            />
          ) : (
            <ul className="divide-y divide-[#F1E6E0] max-h-[600px] overflow-y-auto">
              {filteredClients.map((cli) => {
                const active = cli.id === selectedId;
                const credit = getClientAvailableCredit(cli, simulatedDate);
                return (
                  <li key={cli.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(cli.id);
                        setSearchParams({ id: cli.id });
                      }}
                      className={`w-full text-left px-3.5 py-3 rounded-xl transition-colors flex items-center justify-between gap-2 ${
                        active ? 'bg-[#F3E3DC]/70' : 'hover:bg-[#FFFAF7]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#2E2A2B] truncate">
                            {cli.name}
                          </span>
                          {!cli.active && (
                            <span className="text-[11px] font-medium text-[#9B2C2C]">
                              (Inativa)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6E6567] tabular-nums">
                          {formatMaskedCPF(cli.cpf)} · {cli.phone}
                        </p>
                      </div>
                      {credit > 0 && (
                        <span className="text-xs font-semibold text-[#1F6138] bg-[#E8F4EC] px-2.5 py-0.5 rounded-full border border-[#BCE0C8] shrink-0 tabular-nums">
                          {formatCurrencyBRL(credit)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Client Record Detail (7 cols) */}
        <div className="lg:col-span-7">
          {!selectedClient ? (
            <EmptyState
              title="Selecione uma cliente"
              description="Escolha um cadastro na lista ao lado para visualizar histórico, faltas e créditos."
              icon={<Users className="w-7 h-7" />}
            />
          ) : (() => {
            const availableCredit = getClientAvailableCredit(
              selectedClient,
              simulatedDate
            );
            const noShowCount = clientHistory.filter(
              (a) => a.status === 'nao_compareceu'
            ).length;
            const completedCount = clientHistory.filter(
              (a) => a.status === 'concluido'
            ).length;

            return (
              <div className="rf-card p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F1E6E0] pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-display text-2xl font-semibold text-[#2E2A2B]">
                        {selectedClient.name}
                      </h2>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          selectedClient.active
                            ? 'bg-[#E8F4EC] text-[#1F6138] border-[#BCE0C8]'
                            : 'bg-[#FDECEC] text-[#9B2C2C] border-[#F5C2C2]'
                        }`}
                      >
                        {selectedClient.active ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E6567] mt-1 tabular-nums">
                      CPF {selectedClient.cpf} · {selectedClient.phone} ·{' '}
                      {selectedClient.email}
                    </p>
                    {selectedClient.notes && (
                      <p className="text-xs text-[#2E2A2B] mt-2 bg-[#FFFAF7] px-3 py-2 rounded-xl border border-[#EADAD3]">
                        Observações: {selectedClient.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedClient)}
                      className="rf-btn-outline px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleClientActive(selectedClient.id)}
                      className="rf-btn-secondary px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      {selectedClient.active ? (
                        <>
                          <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Desativar</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Reativar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Client Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3]">
                    <p className="text-xs text-[#6E6567]">Atendimentos</p>
                    <p className="font-display text-xl font-bold text-[#2E2A2B] tabular-nums mt-0.5">
                      {completedCount}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3]">
                    <p className="text-xs text-[#6E6567]">Faltas</p>
                    <p className="font-display text-xl font-bold text-[#9B2C2C] tabular-nums mt-0.5">
                      {noShowCount}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3]">
                    <p className="text-xs text-[#6E6567]">Crédito válido</p>
                    <p className="font-display text-xl font-bold text-[#1F6138] tabular-nums mt-0.5">
                      {formatCurrencyBRL(availableCredit)}
                    </p>
                  </div>
                </div>

                {/* Credits List */}
                {selectedClient.credits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-[#2E2A2B]">
                      Créditos da cliente
                    </h3>
                    <div className="space-y-2">
                      {selectedClient.credits.map((cr) => {
                        const expired = cr.expiresAt < simulatedDate;
                        return (
                          <div
                            key={cr.id}
                            className="p-3 rounded-xl bg-[#FFFAF7] border border-[#EADAD3] flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#C9A46A]" aria-hidden="true" />
                              <div>
                                <p className="font-medium text-[#2E2A2B]">
                                  {cr.reason}
                                </p>
                                <p className="text-[#6E6567] tabular-nums">
                                  Validade até {formatDateBR(cr.expiresAt)}
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold tabular-nums text-[#2E2A2B]">
                              {formatCurrencyBRL(cr.amount)} ·{' '}
                              {cr.used ? 'Utilizado' : expired ? 'Expirado' : 'Disponível'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* History Table */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#2E2A2B]">
                    Histórico de atendimentos ({clientHistory.length})
                  </h3>
                  {clientHistory.length === 0 ? (
                    <p className="text-xs text-[#6E6567] py-4">
                      Nenhum atendimento registrado para esta cliente ainda.
                    </p>
                  ) : (
                    <div className="overflow-auto max-h-[560px] border border-[#EADAD3] rounded-2xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#FFFAF7] border-b border-[#EADAD3] text-[#6E6567]">
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 px-3">Serviço</th>
                            <th className="py-2.5 px-3">Profissional</th>
                            <th className="py-2.5 px-3 text-right">Valor</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1E6E0]">
                          {clientHistory.map((h) => {
                            const prof = state.professionals.find(
                              (p) => p.id === h.professionalId
                            );
                            return (
                              <tr key={h.id}>
                                <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                                  {formatDateBR(h.date)}
                                  <span className="block text-[#6E6567]">{h.startTime}</span>
                                </td>
                                <td className="py-2.5 px-3 font-medium">
                                  {h.serviceName}
                                </td>
                                <td className="py-2.5 px-3">{prof?.name}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                                  {formatCurrencyBRL(h.price)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <AppointmentStatusLabel status={h.status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Create / Edit Client Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Editar cliente' : 'Cadastrar nova cliente'}
        subtitle="CPF repetido abre automaticamente o cadastro existente"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="cli-name" className="block text-sm font-medium mb-1">
              Nome completo *
            </label>
            <input
              id="cli-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white ${
                fieldErrors.name ? 'border-[#9B2C2C]' : 'border-[#D9C3B9]'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-[#9B2C2C] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{fieldErrors.name}</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cli-cpf" className="block text-sm font-medium mb-1">
              CPF *
            </label>
            <input
              id="cli-cpf"
              type="text"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              aria-invalid={Boolean(fieldErrors.cpf)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white tabular-nums ${
                fieldErrors.cpf ? 'border-[#9B2C2C]' : 'border-[#D9C3B9]'
              }`}
            />
            {fieldErrors.cpf && (
              <p className="text-xs text-[#9B2C2C] mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{fieldErrors.cpf}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cli-phone" className="block text-sm font-medium mb-1">
                Telefone *
              </label>
              <input
                id="cli-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(21) 99999-9999"
                aria-invalid={Boolean(fieldErrors.phone)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white tabular-nums ${
                  fieldErrors.phone ? 'border-[#9B2C2C]' : 'border-[#D9C3B9]'
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-[#9B2C2C] mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="cli-email" className="block text-sm font-medium mb-1">
                E-mail *
              </label>
              <input
                id="cli-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white ${
                  fieldErrors.email ? 'border-[#9B2C2C]' : 'border-[#D9C3B9]'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-[#9B2C2C] mt-1">{fieldErrors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="cli-notes" className="block text-sm font-medium mb-1">
              Observações / Preferências
            </label>
            <textarea
              id="cli-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#D9C3B9] text-sm bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="rf-btn-primary px-5 py-2 text-sm font-medium">
              Salvar cadastro
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

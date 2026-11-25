import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, CheckCircle2, DollarSign, Percent, UserX } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { addDaysIso, formatCurrencyBRL, formatDateBR } from '../utils/formatters';
import { EmptyState } from '../components/SkeletonBlock';

export const ReportsPage: React.FC = () => {
  const { state, simulatedDate } = useClinic();

  const [startDate, setStartDate] = useState(() => addDaysIso(simulatedDate, -29));
  const [endDate, setEndDate] = useState(simulatedDate);
  const [catFilter, setCatFilter] = useState('todas');

  const filteredAppointments = useMemo(() => {
    return state.appointments.filter((a) => {
      if (a.date < startDate || a.date > endDate) return false;
      if (catFilter !== 'todas' && a.categoryId !== catFilter) return false;
      return true;
    });
  }, [state.appointments, startDate, endDate, catFilter]);

  const metrics = useMemo(() => {
    const completed = filteredAppointments.filter(
      (a) => a.status === 'concluido'
    ).length;
    const noShows = filteredAppointments.filter(
      (a) => a.status === 'nao_compareceu'
    ).length;
    const baseAttendance = completed + noShows;
    const attendanceRate =
      baseAttendance > 0 ? Math.round((completed / baseAttendance) * 100) : 0;

    const totalRevenue = filteredAppointments.reduce((sum, a) => {
      if (a.paymentStatus === 'pago') return sum + a.price;
      if (
        a.paymentStatus === 'retido_parcial' ||
        a.paymentStatus === 'reembolsado_parcial'
      ) {
        return sum + a.price * 0.5;
      }
      return sum;
    }, 0);

    return {
      totalRevenue,
      completed,
      noShows,
      attendanceRate,
    };
  }, [filteredAppointments]);

  const ranking = useMemo(() => {
    const byService: Record<
      string,
      { name: string; count: number; revenue: number; categoryName: string }
    > = {};

    filteredAppointments.forEach((a) => {
      if (a.status === 'cancelado') return;
      if (!byService[a.serviceId]) {
        const cat = state.categories.find((c) => c.id === a.categoryId);
        byService[a.serviceId] = {
          name: a.serviceName,
          count: 0,
          revenue: 0,
          categoryName: cat?.name ?? '',
        };
      }
      byService[a.serviceId].count += 1;
      if (a.paymentStatus === 'pago') {
        byService[a.serviceId].revenue += a.price;
      } else if (
        a.paymentStatus === 'retido_parcial' ||
        a.paymentStatus === 'reembolsado_parcial'
      ) {
        byService[a.serviceId].revenue += a.price * 0.5;
      }
    });

    return Object.values(byService).sort((a, b) => b.count - a.count);
  }, [filteredAppointments, state.categories]);

  const applyPreset = (days: number) => {
    setStartDate(addDaysIso(simulatedDate, -days + 1));
    setEndDate(simulatedDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2E2A2B]">
            Relatórios Gerenciais
          </h1>
          <p className="text-sm text-[#6E6567] mt-0.5 tabular-nums">
            Período: {formatDateBR(startDate)} a {formatDateBR(endDate)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className="rf-btn-outline px-3.5 py-1.5 text-xs font-medium"
          >
            7 dias
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className="rf-btn-outline px-3.5 py-1.5 text-xs font-medium"
          >
            30 dias
          </button>
          <button
            type="button"
            onClick={() => applyPreset(90)}
            className="rf-btn-outline px-3.5 py-1.5 text-xs font-medium"
          >
            90 dias
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rf-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="rep-start" className="text-xs font-medium text-[#6E6567]">
            De:
          </label>
          <input
            id="rep-start"
            type="date"
            value={startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-[#D9C3B9] text-sm bg-[#FFFAF7] tabular-nums"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="rep-end" className="text-xs font-medium text-[#6E6567]">
            Até:
          </label>
          <input
            id="rep-end"
            type="date"
            value={endDate}
            onChange={(e) => e.target.value && setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-[#D9C3B9] text-sm bg-[#FFFAF7] tabular-nums"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="rep-cat" className="text-xs font-medium text-[#6E6567]">
            Categoria:
          </label>
          <select
            id="rep-cat"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-full border border-[#D9C3B9] text-sm bg-[#FFFAF7]"
          >
            <option value="todas">Todas</option>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="Sem atendimentos neste período"
          description="Não há registros encontrados para o intervalo de datas e categoria selecionados. Experimente ampliar o período para os últimos 30 ou 90 dias."
          actionLabel="Ver últimos 30 dias"
          onAction={() => {
            setCatFilter('todas');
            applyPreset(30);
          }}
          icon={<BarChart3 className="w-7 h-7" />}
        />
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rf-card p-5">
              <div className="flex items-center justify-between text-xs text-[#6E6567]">
                <span>Total arrecadado</span>
                <DollarSign className="w-4 h-4 text-[#B76E79]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {formatCurrencyBRL(metrics.totalRevenue)}
              </p>
            </div>

            <div className="rf-card p-5">
              <div className="flex items-center justify-between text-xs text-[#6E6567]">
                <span>Atendimentos concluídos</span>
                <CheckCircle2 className="w-4 h-4 text-[#1F6138]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {metrics.completed}
              </p>
            </div>

            <div className="rf-card p-5">
              <div className="flex items-center justify-between text-xs text-[#6E6567]">
                <span>Faltas registradas</span>
                <UserX className="w-4 h-4 text-[#9B2C2C]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#9B2C2C] mt-2 tabular-nums">
                {metrics.noShows}
              </p>
            </div>

            <div className="rf-card p-5">
              <div className="flex items-center justify-between text-xs text-[#6E6567]">
                <span>Taxa de comparecimento</span>
                <Percent className="w-4 h-4 text-[#C9A46A]" aria-hidden="true" />
              </div>
              <p className="font-display text-2xl font-bold text-[#2E2A2B] mt-2 tabular-nums">
                {metrics.attendanceRate}%
              </p>
            </div>
          </div>

          {/* Chart + Ranking Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 rf-card p-5">
              <div className="mb-4">
                <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                  Serviços mais procurados
                </h2>
                <p className="text-xs text-[#6E6567]">
                  Quantidade de atendimentos no período selecionado
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1E6E0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6E6567' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11, fill: '#2E2A2B' }}
                    />
                    <Tooltip
                      formatter={(v) => [`${Number(v ?? 0)} atendimentos`, 'Quantidade']}
                      contentStyle={{ borderRadius: '12px', borderColor: '#EADAD3', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" name="Atendimentos" fill="#B76E79" radius={[0, 6, 6, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-6 rf-card overflow-hidden">
              <div className="p-5 border-b border-[#F1E6E0]">
                <h2 className="font-display text-lg font-semibold text-[#2E2A2B]">
                  Ranking detalhado de serviços
                </h2>
                <p className="text-xs text-[#6E6567]">
                  Quantidade e faturamento acumulado por serviço
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FFFAF7] border-b border-[#EADAD3] text-xs font-semibold text-[#6E6567]">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Serviço</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4 text-right">Qtd.</th>
                      <th className="py-3 px-4 text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1E6E0]">
                    {ranking.map((row, idx) => (
                      <tr key={row.name} className="hover:bg-[#FFFAF7]/80">
                        <td className="py-3 px-4 font-bold text-[#9A5560] tabular-nums">
                          {idx + 1}º
                        </td>
                        <td className="py-3 px-4 font-medium text-[#2E2A2B]">
                          {row.name}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#6E6567]">
                          {row.categoryName}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">
                          {row.count}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#2E2A2B] tabular-nums">
                          {formatCurrencyBRL(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

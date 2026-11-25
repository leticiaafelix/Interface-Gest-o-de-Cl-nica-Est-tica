import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock,
  Gift,
  Hourglass,
  LayoutDashboard,
  ConciergeBell,
  LogOut,
  Menu,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { BrandMark } from './BrandMark';
import { Modal } from './Modal';
import { ToastContainer } from './ToastContainer';
import { formatDateBR, onlyDigits } from '../utils/formatters';
import { BrazilianTimeInput } from './DateTimeInputs';

interface NavItem {
  to: string;
  label: string;
  Icon: React.FC<{ className?: string }>;
  roles: Array<'atendente' | 'gerente' | 'profissional'>;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    Icon: LayoutDashboard,
    roles: ['gerente'],
  },
  {
    to: '/dashboard',
    label: 'Recepção',
    Icon: ConciergeBell,
    roles: ['atendente'],
  },
  {
    to: '/agenda',
    label: 'Agenda do Dia',
    Icon: CalendarCheck,
    roles: ['atendente', 'gerente'],
  },
  {
    to: '/profissionais-agora',
    label: 'Profissionais Agora',
    Icon: UserCheck,
    roles: ['atendente', 'gerente'],
  },
  {
    to: '/balcao',
    label: 'Agendar no Balcão',
    Icon: CalendarPlus,
    roles: ['atendente', 'gerente'],
  },
  {
    to: '/fila',
    label: 'Fila de Espera',
    Icon: Hourglass,
    roles: ['atendente', 'gerente'],
  },
  {
    to: '/disponibilidade',
    label: 'Disponibilidade',
    Icon: CalendarClock,
    roles: ['atendente', 'gerente'],
  },
  {
    to: '/clientes',
    label: 'Clientes',
    Icon: Users,
    roles: ['atendente', 'gerente'],
  },
  {
    to: '/minha-agenda',
    label: 'Minha Agenda',
    Icon: CalendarCheck,
    roles: ['profissional'],
  },
  {
    to: '/servicos',
    label: 'Serviços e Preços',
    Icon: Scissors,
    roles: ['gerente'],
  },
  {
    to: '/pacotes',
    label: 'Pacotes',
    Icon: Gift,
    roles: ['gerente'],
  },
  {
    to: '/profissionais',
    label: 'Profissionais',
    Icon: Sparkles,
    roles: ['gerente'],
  },
  {
    to: '/relatorios',
    label: 'Relatórios',
    Icon: BarChart3,
    roles: ['gerente'],
  },
];

const ROLE_LABELS: Record<'atendente' | 'gerente' | 'profissional', string> = {
  atendente: 'Atendente',
  gerente: 'Gerente',
  profissional: 'Profissional',
};

export const Layout: React.FC = () => {
  const {
    currentUser,
    logout,
    simulatedDate,
    simulatedTime,
    setSimulatedTime,
    stepSimulatedTime,
    resetDemoData,
    state,
  } = useClinic();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const visibleNav = useMemo(() => {
    if (!currentUser) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role));
  }, [currentUser]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const qDigits = onlyDigits(q);
    return state.clients
      .filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const cpfMatch = qDigits.length >= 2 && onlyDigits(c.cpf).includes(qDigits);
        return nameMatch || cpfMatch;
      })
      .slice(0, 6);
  }, [searchQuery, state.clients]);

  if (!currentUser) return null;

  const canSearchClients = currentUser.role !== 'profissional';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#EADAD3]">
      <div className="px-5 py-5 border-b border-[#F1E6E0] flex items-center justify-between">
        <BrandMark />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu lateral"
          className="lg:hidden p-2 rounded-full text-[#6E6567] hover:bg-[#F3E3DC]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu principal">
        {visibleNav.map((item) => {
          const Icon = item.Icon;
          const isCurrentPage = normalizedPath === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              aria-current={isCurrentPage ? 'page' : undefined}
              onClick={(e) => {
                e.currentTarget.blur();
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap ${
                isCurrentPage
                  ? 'bg-[#B76E79] text-white shadow-sm'
                  : 'bg-transparent text-[#2E2A2B] hover:bg-[#F3E3DC]/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#F1E6E0] space-y-3">
        <div className="px-2">
          <p className="text-xs text-[#6E6567]">Operando como</p>
          <p className="text-sm font-semibold text-[#2E2A2B] truncate">
            {currentUser.name}
          </p>
          <p className="text-xs text-[#9A5560] font-medium">
            {ROLE_LABELS[currentUser.role]}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setResetModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-medium bg-[#FFFAF7] border border-[#EADAD3] text-[#6E6567] hover:text-[#2E2A2B] hover:border-[#B76E79] transition-colors whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Restaurar dados de demonstração</span>
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-medium bg-white border border-[#EADAD3] text-[#2E2A2B] hover:bg-[#F3E3DC]/60 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Sair do painel</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#FFFAF7] text-[#2E2A2B]">
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Tablet / Mobile slide-over sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#2E2A2B]/35"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header + non-overlapping toast strip */}
        <div className="sticky top-0 z-30">
          <header className="bg-white/95 backdrop-blur-sm border-b border-[#EADAD3] px-4 sm:px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Abrir menu lateral"
                  className="lg:hidden p-2 rounded-xl border border-[#EADAD3] text-[#2E2A2B] hover:bg-[#F3E3DC]"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 text-sm text-[#2E2A2B]">
                  <span className="font-medium tabular-nums">
                    {formatDateBR(simulatedDate)}
                  </span>
                  <span className="text-[#C9A46A]" aria-hidden="true">
                    ·
                  </span>
                  <div
                    className="flex items-center gap-1.5 bg-[#FFFAF7] border border-[#EADAD3] rounded-full px-2.5 py-1"
                    title="Controle de hora simulada para demonstrar tolerância de 15 min e fila"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#B76E79]" aria-hidden="true" />
                    <span className="text-xs text-[#6E6567] hidden sm:inline">
                      Hora simulada:
                    </span>
                    <button
                      type="button"
                      onClick={() => stepSimulatedTime(-15)}
                      aria-label="Voltar 15 minutos na hora simulada"
                      className="px-1.5 py-0.5 text-xs font-medium rounded-full hover:bg-[#F3E3DC] text-[#6E6567] tabular-nums"
                    >
                      -15m
                    </button>
                    <BrazilianTimeInput
                      aria-label="Hora simulada atual"
                      value={simulatedTime}
                      compact
                      onChange={(hhmm) => setSimulatedTime(hhmm)}
                      className="text-xs font-semibold text-[#2E2A2B] bg-transparent border-none p-0 tabular-nums focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => stepSimulatedTime(15)}
                      aria-label="Avançar 15 minutos na hora simulada"
                      className="px-1.5 py-0.5 text-xs font-medium rounded-full hover:bg-[#F3E3DC] text-[#9A5560] tabular-nums"
                    >
                      +15m
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 sm:flex-initial justify-end">
                {canSearchClients && (
                  <div className="relative w-full sm:w-64 md:w-72">
                    <Search
                      className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar cliente (nome ou CPF)"
                      aria-label="Busca rápida de cliente"
                      className="w-full pl-9 pr-3.5 py-1.5 text-sm rounded-full border border-[#D9C3B9] bg-[#FFFAF7] focus:bg-white transition-colors"
                    />
                    {searchFocused && searchQuery.trim().length > 0 && (
                      <div className="absolute right-0 mt-2 w-full sm:w-80 bg-white rounded-2xl border border-[#EADAD3] shadow-xl z-40 overflow-hidden">
                        {searchResults.length === 0 ? (
                          <div className="p-4 text-xs text-[#6E6567]">
                            Nenhuma cliente encontrada para &ldquo;{searchQuery}&rdquo;.
                          </div>
                        ) : (
                          <ul className="divide-y divide-[#F1E6E0]">
                            {searchResults.map((cli) => (
                              <li key={cli.id}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setSearchQuery('');
                                    navigate(`/clientes?id=${cli.id}`);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-[#FFFAF7] transition-colors flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-[#2E2A2B] truncate">
                                      {cli.name}
                                    </p>
                                    <p className="text-xs text-[#6E6567] tabular-nums">
                                      {cli.cpf} · {cli.phone}
                                    </p>
                                  </div>
                                  <span className="text-xs text-[#B76E79] font-medium shrink-0">
                                    Ver ficha
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#EADAD3]">
                  <div className="w-8 h-8 rounded-full bg-[#F3E3DC] border border-[#C9A46A]/50 flex items-center justify-center text-xs font-semibold text-[#9A5560]">
                    {currentUser.name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-[#2E2A2B] whitespace-nowrap">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-[#6E6567] whitespace-nowrap">
                      {ROLE_LABELS[currentUser.role]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <ToastContainer />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Restaurar dados de demonstração"
        subtitle="Todas as alterações feitas no navegador serão substituídas pelo conjunto inicial."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#6E6567]">
            Isso restaura os 12 atendimentos de hoje, os 3 meses de histórico,
            as 12 clientes, os 6 profissionais, pacotes, serviços e ajusta a hora
            simulada para <strong className="text-[#2E2A2B]">10:20</strong>.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="rf-btn-outline px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                setResetModalOpen(false);
              }}
              className="rf-btn-primary px-5 py-2 text-sm font-medium"
            >
              Restaurar agora
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

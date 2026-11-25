import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail, ShieldCheck, UserCheck, UserCog } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';
import { BrandMark } from '../components/BrandMark';
import { UserRole } from '../types/clinic';

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useClinic();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const redirectByRole = (role: UserRole) => {
    if (role === 'profissional') {
      navigate('/minha-agenda');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = login(email, password);
    if (!ok) {
      setError(
        'E-mail ou senha inválidos. Verifique os dados ou use um dos acessos rápidos de demonstração.'
      );
      return;
    }
    const lower = email.trim().toLowerCase();
    if (lower.includes('profissional') || lower.includes('ana.souza')) {
      redirectByRole('profissional');
    } else {
      navigate('/dashboard');
    }
  };

  const handleQuick = (role: UserRole) => {
    quickLogin(role);
    redirectByRole(role);
  };

  return (
    <div className="min-h-screen bg-[#FFFAF7] flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-[#EADAD3] shadow-lg overflow-hidden">
        {/* Brand editorial panel */}
        <div className="lg:col-span-5 bg-[#2E2A2B] text-[#FFFAF7] p-8 flex flex-col justify-between">
          <div>
            <BrandMark light />
            <div className="mt-10 space-y-4">
              <p className="text-xs tracking-widest uppercase text-[#C9A46A]">
                Área Interna da Equipe
              </p>
              <h1 className="font-display text-3xl font-semibold leading-snug text-balance">
                Painel Rebecca Felix
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C9A46A"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block w-6 h-6 ml-2.5 -mt-1 align-middle"
                  aria-hidden="true"
                >
                  <path d="M3 17L5 7l4.5 4.5L12 5l2.5 6.5L19 7l2 10H3z" />
                  <path d="M4 20h16" />
                </svg>
              </h1>
              <p className="text-sm text-[#FFFAF7]/75 leading-relaxed">
                Controle em tempo real da agenda, recepção no balcão, fila de
                espera, disponibilidade dos profissionais e indicadores da
                clínica.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-xs text-[#FFFAF7]/70 space-y-1">
            <p>Acesso restrito a funcionários autorizados.</p>
          </div>
        </div>

        {/* Form + Quick Demo Access */}
        <div className="lg:col-span-7 p-8 sm:p-10">
          <h2 className="font-display text-2xl font-semibold text-[#2E2A2B]">
            Entrar no painel
          </h2>
          <p className="text-sm text-[#6E6567] mt-1">
            Informe suas credenciais de funcionária ou selecione um perfil de
            demonstração.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-[#2E2A2B] mb-1.5"
              >
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@rebeccafelix.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-[#FFFAF7] focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-[#2E2A2B] mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-[#FFFAF7] focus:bg-white"
                  required
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FDECEC] border border-[#F5C2C2] text-xs text-[#9B2C2C]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full rf-btn-primary py-2.5 px-5 text-sm font-medium"
            >
              Entrar com e-mail e senha
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#F1E6E0]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6E6567] mb-3">
              Acesso rápido para demonstração
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuick('atendente')}
                className="flex flex-col items-start p-3 rounded-2xl border border-[#EADAD3] bg-[#FFFAF7] hover:border-[#B76E79] hover:bg-[#F3E3DC]/40 transition-colors text-left"
              >
                <UserCheck className="w-4 h-4 text-[#B76E79] mb-1.5" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#2E2A2B]">
                  Atendente
                </span>
                <span className="text-[11px] text-[#6E6567]">
                  Marina Campos
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('gerente')}
                className="flex flex-col items-start p-3 rounded-2xl border border-[#EADAD3] bg-[#FFFAF7] hover:border-[#B76E79] hover:bg-[#F3E3DC]/40 transition-colors text-left"
              >
                <ShieldCheck className="w-4 h-4 text-[#C9A46A] mb-1.5" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#2E2A2B]">
                  Gerente
                </span>
                <span className="text-[11px] text-[#6E6567]">
                  Rebecca Felix
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuick('profissional')}
                className="flex flex-col items-start p-3 rounded-2xl border border-[#EADAD3] bg-[#FFFAF7] hover:border-[#B76E79] hover:bg-[#F3E3DC]/40 transition-colors text-left"
              >
                <UserCog className="w-4 h-4 text-[#B76E79] mb-1.5" aria-hidden="true" />
                <span className="text-sm font-semibold text-[#2E2A2B]">
                  Profissional
                </span>
                <span className="text-[11px] text-[#6E6567]">
                  Ana Souza
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

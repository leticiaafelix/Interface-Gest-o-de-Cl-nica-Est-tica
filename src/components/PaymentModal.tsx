import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Sparkles, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { formatCurrencyBRL, onlyDigits } from '../utils/formatters';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  serviceName: string;
  amount: number;
  availableCredit: number;
  /** cardLast4 é opcional: só os 4 últimos dígitos impressos no comprovante da maquininha. */
  onConfirm: (result: { cardLast4?: string; useCreditAmount: number }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  clientName,
  serviceName,
  amount,
  availableCredit,
  onConfirm,
}) => {
  const [last4, setLast4] = useState('');
  const [useCredit, setUseCredit] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLast4('');
      setUseCredit(availableCredit > 0);
      setDeclined(false);
      setError(null);
    }
  }, [open, availableCredit]);

  const creditToApply = useCredit ? Math.min(availableCredit, amount) : 0;
  const remainingAmount = Math.max(0, amount - creditToApply);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (remainingAmount === 0) {
      onConfirm({ useCreditAmount: creditToApply });
      return;
    }

    if (last4 && last4.length !== 4) {
      setError('O final do cartão tem 4 dígitos. Deixe em branco se não quiser informar.');
      return;
    }

    onConfirm({ cardLast4: last4 || undefined, useCreditAmount: creditToApply });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pagamento no balcão"
      subtitle={`${clientName} · ${serviceName}`}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-4 rounded-2xl bg-[#FFFAF7] border border-[#EADAD3] space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6E6567]">Valor do serviço</span>
            <span className="font-semibold tabular-nums text-[#2E2A2B]">
              {formatCurrencyBRL(amount)}
            </span>
          </div>

          {availableCredit > 0 && (
            <label className="flex items-center justify-between gap-3 pt-2 border-t border-[#F1E6E0] cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-[#2E2A2B]">
                <input
                  type="checkbox"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                  className="w-4 h-4 accent-[#B76E79] rounded"
                />
                <span>
                  Usar crédito disponível ({formatCurrencyBRL(availableCredit)})
                </span>
              </span>
              <span className="text-xs font-medium text-[#1F6138] tabular-nums">
                -{formatCurrencyBRL(creditToApply)}
              </span>
            </label>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-[#EADAD3]">
            <span className="text-sm font-semibold text-[#2E2A2B]">
              Cobrar na maquininha
            </span>
            <span className="font-display text-xl font-bold text-[#B76E79] tabular-nums">
              {formatCurrencyBRL(remainingAmount)}
            </span>
          </div>
        </div>

        {remainingAmount > 0 ? (
          <>
            <ol className="space-y-2 text-sm text-[#2E2A2B]">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#F3E3DC] text-[#9A5560] text-xs font-bold flex items-center justify-center shrink-0">1</span>
                <span>
                  Digite <strong className="tabular-nums">{formatCurrencyBRL(remainingAmount)}</strong> na maquininha, opção <strong>Crédito</strong>.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#F3E3DC] text-[#9A5560] text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <span>A cliente insere ou aproxima o cartão e digita a senha.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#F3E3DC] text-[#9A5560] text-xs font-bold flex items-center justify-center shrink-0">3</span>
                <span>Quando a maquininha mostrar <strong>Aprovado</strong>, confirme aqui.</span>
              </li>
            </ol>

            <div>
              <label
                htmlFor="rf-card-last4"
                className="block text-sm font-medium text-[#2E2A2B] mb-1"
              >
                Final do cartão no comprovante{' '}
                <span className="font-normal text-[#6E6567]">(opcional)</span>
              </label>
              <div className="relative max-w-[180px]">
                <CreditCard
                  className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="rf-card-last4"
                  type="text"
                  inputMode="numeric"
                  placeholder="•••• 1234"
                  maxLength={4}
                  value={last4}
                  onChange={(e) => setLast4(onlyDigits(e.target.value).slice(0, 4))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9C3B9] text-sm tabular-nums bg-white"
                />
              </div>
              <p className="text-xs text-[#6E6567] mt-1">
                O sistema não pede nem guarda o número do cartão: o valor cai na conta da clínica pela operadora da maquininha.
              </p>
            </div>

            {declined && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FDECEC] border border-[#F5C2C2] text-xs text-[#9B2C2C]"
              >
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Pagamento não registrado. Peça outro cartão de crédito à cliente e passe de novo na maquininha.
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#E8F4EC] border border-[#BCE0C8] text-sm text-[#1F6138]">
            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>O crédito da cliente cobre 100% do valor deste atendimento.</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FDECEC] border border-[#F5C2C2] text-xs text-[#9B2C2C]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rf-btn-outline px-5 py-2.5 text-sm font-medium"
          >
            Cancelar
          </button>
          {remainingAmount > 0 && (
            <button
              type="button"
              onClick={() => setDeclined(true)}
              className="px-4 py-2.5 rounded-full text-sm font-medium border border-[#F5C2C2] text-[#9B2C2C] bg-white hover:bg-[#FDECEC]"
            >
              Recusado
            </button>
          )}
          <button
            type="submit"
            className="rf-btn-primary px-6 py-2.5 text-sm font-medium inline-flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            {remainingAmount === 0 ? 'Confirmar com crédito' : 'Pagamento aprovado'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

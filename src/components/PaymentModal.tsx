import React, { useEffect, useState } from 'react';
import { AlertCircle, CreditCard, Sparkles } from 'lucide-react';
import { Modal } from './Modal';
import {
  formatCurrencyBRL,
  maskCardExpiry,
  maskCardNumber,
  onlyDigits,
  validateCreditCard,
} from '../utils/formatters';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  clientName: string;
  serviceName: string;
  amount: number;
  availableCredit: number;
  onConfirm: (result: { cardLast4: string; useCreditAmount: number }) => void;
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
  const [cardNumber, setCardNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [useCredit, setUseCredit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCardNumber('');
      setHolder(clientName);
      setExpiry('');
      setCvv('');
      setUseCredit(availableCredit > 0);
      setError(null);
    }
  }, [open, clientName, availableCredit]);

  const creditToApply = useCredit ? Math.min(availableCredit, amount) : 0;
  const remainingAmount = Math.max(0, amount - creditToApply);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (remainingAmount === 0) {
      onConfirm({ cardLast4: 'CRÉD', useCreditAmount: creditToApply });
      return;
    }

    const res = validateCreditCard({
      number: cardNumber,
      holder,
      expiry,
      cvv,
    });

    if (!res.valid || !res.last4) {
      setError(res.error || 'Dados do cartão inválidos.');
      return;
    }

    onConfirm({ cardLast4: res.last4, useCreditAmount: creditToApply });
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
              Total a cobrar no cartão
            </span>
            <span className="font-display text-xl font-bold text-[#B76E79] tabular-nums">
              {formatCurrencyBRL(remainingAmount)}
            </span>
          </div>
        </div>

        {remainingAmount > 0 ? (
          <>
            <p className="text-xs text-[#6E6567]">
              Pagamento exclusivamente no cartão de crédito. Somente os 4 últimos
              dígitos são armazenados. (Dica de teste: cartões terminados em{' '}
              <strong className="font-semibold text-[#2E2A2B]">0000</strong> são
              recusados.)
            </p>

            <div>
              <label
                htmlFor="rf-card-number"
                className="block text-sm font-medium text-[#2E2A2B] mb-1"
              >
                Número do cartão de crédito
              </label>
              <div className="relative">
                <CreditCard
                  className="w-4 h-4 text-[#6E6567] absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="rf-card-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9C3B9] text-sm tabular-nums bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="rf-card-holder"
                className="block text-sm font-medium text-[#2E2A2B] mb-1"
              >
                Nome impresso no cartão
              </label>
              <input
                id="rf-card-holder"
                type="text"
                placeholder="Nome completo"
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="rf-card-expiry"
                  className="block text-sm font-medium text-[#2E2A2B] mb-1"
                >
                  Validade (MM/AA)
                </label>
                <input
                  id="rf-card-expiry"
                  type="text"
                  inputMode="numeric"
                  placeholder="12/29"
                  value={expiry}
                  onChange={(e) => setExpiry(maskCardExpiry(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm tabular-nums bg-white"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="rf-card-cvv"
                  className="block text-sm font-medium text-[#2E2A2B] mb-1"
                >
                  CVV
                </label>
                <input
                  id="rf-card-cvv"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  value={cvv}
                  onChange={(e) =>
                    setCvv(onlyDigits(e.target.value).slice(0, 4))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9C3B9] text-sm tabular-nums bg-white"
                  required
                />
              </div>
            </div>
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rf-btn-outline px-5 py-2.5 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rf-btn-primary px-6 py-2.5 text-sm font-medium"
          >
            {remainingAmount === 0
              ? 'Confirmar com crédito'
              : `Cobrar ${formatCurrencyBRL(remainingAmount)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { RotateCcw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Invoice } from '../types';
import { formatINR } from '../utils/numberToWords';

interface ReturnModalProps {
  invoice: Invoice;
  onConfirmReturn: (
    invoiceId: string,
    returnedItems: { productId: string; qty: number; refundAmount: number }[],
    refundTotal: number,
    reason: string
  ) => void;
  onClose: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  invoice,
  onConfirmReturn,
  onClose,
}) => {
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    invoice.items.forEach((it) => {
      init[it.productId] = 0;
    });
    return init;
  });

  const [returnReason, setReturnReason] = useState('Customer Excess / Change of Mind');
  const [customReason, setCustomReason] = useState('');

  const handleQtyChange = (productId: string, maxQty: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxQty, val));
    setReturnQtys({ ...returnQtys, [productId]: clamped });
  };

  // Calculate refund total
  const { totalRefundAmount, returnedItemsList } = React.useMemo(() => {
    let refund = 0;
    const itemsList: { productId: string; qty: number; refundAmount: number }[] = [];

    invoice.items.forEach((it) => {
      const q = returnQtys[it.productId] || 0;
      if (q > 0) {
        const lineRefund = (it.total / it.qty) * q;
        refund += lineRefund;
        itemsList.push({
          productId: it.productId,
          qty: q,
          refundAmount: lineRefund,
        });
      }
    });

    return { totalRefundAmount: Math.round(refund), returnedItemsList: itemsList };
  }, [invoice, returnQtys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (returnedItemsList.length === 0) {
      alert('Please specify quantity to return for at least one item.');
      return;
    }

    const finalReason =
      returnReason === 'Other' ? customReason.trim() || 'Other' : returnReason;

    onConfirmReturn(invoice.id, returnedItemsList, totalRefundAmount, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 border border-slate-200 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-orange-600" />
            <h3 className="font-display font-bold text-base text-slate-900">
              Process Return for Invoice #{invoice.number}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Select items and quantities being returned. Stock will be restored to inventory and a refund record will be created.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="border border-slate-200 rounded-md overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[11px] font-mono-num text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-right">Sold Qty</th>
                  <th className="p-2 text-right">Return Qty</th>
                  <th className="p-2 text-right">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-num">
                {invoice.items.map((it) => {
                  const currentReturn = returnQtys[it.productId] || 0;
                  const itemRefund = (it.total / it.qty) * currentReturn;
                  return (
                    <tr key={it.productId} className="hover:bg-slate-50/50">
                      <td className="p-2">
                        <div className="font-sans font-medium text-slate-900 truncate max-w-[170px]">
                          {it.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @ ₹{it.price.toFixed(2)} /{it.unit}
                        </div>
                      </td>
                      <td className="p-2 text-right text-slate-600">
                        {it.qty} {it.unit}
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={it.qty}
                          value={currentReturn}
                          onChange={(e) =>
                            handleQtyChange(it.productId, it.qty, parseInt(e.target.value) || 0)
                          }
                          className="w-14 text-center px-1 py-0.5 border border-slate-200 rounded font-bold"
                        />
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {formatINR(itemRefund)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Total Refund Amount:</span>
            <span className="font-bold font-mono-num text-base text-orange-600">
              {formatINR(totalRefundAmount)}
            </span>
          </div>

          <div>
            <label className="text-[10px] font-mono-num uppercase text-slate-400 font-semibold block mb-1">
              Reason for Return *
            </label>
            <select
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
            >
              <option value="Customer Excess / Change of Mind">
                Customer Excess / Change of Mind
              </option>
              <option value="Defective / Damaged Piece">Defective / Damaged Piece</option>
              <option value="Wrong Dimension / Specification">
                Wrong Dimension / Specification
              </option>
              <option value="Site Work Cancelled">Site Work Cancelled</option>
              <option value="Other">Other Reason</option>
            </select>
          </div>

          {returnReason === 'Other' && (
            <div>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify reason..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded font-sans"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={returnedItemsList.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded shadow-xs disabled:opacity-40"
            >
              Confirm Return &amp; Restock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

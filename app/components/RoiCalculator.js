"use client";

import { useMemo, useState } from "react";

function formatIdr(value) {
  return `Rp${Math.max(0, value).toLocaleString("id-ID")}`;
}

export default function RoiCalculator() {
  const [invoice, setInvoice] = useState(500);
  const [minutes, setMinutes] = useState(4);
  const [hourlyCost, setHourlyCost] = useState(90000);

  const result = useMemo(() => {
    const manualHours = (invoice * minutes) / 60;
    const automatedHours = manualHours * 0.25;
    const savedHours = Math.max(manualHours - automatedHours, 0);
    const savedCost = savedHours * hourlyCost;
    return { manualHours, savedHours, savedCost };
  }, [invoice, minutes, hourlyCost]);

  return (
    <div className="roi-calculator">
      <div className="roi-inputs">
        <label>
          Invoice per bulan
          <input type="number" min="1" value={invoice} onChange={(e) => setInvoice(Number(e.target.value || 0))} />
        </label>
        <label>
          Menit manual per invoice
          <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(Number(e.target.value || 0))} />
        </label>
        <label>
          Estimasi biaya per jam
          <input type="number" min="0" step="10000" value={hourlyCost} onChange={(e) => setHourlyCost(Number(e.target.value || 0))} />
        </label>
      </div>
      <div className="roi-results">
        <div>
          <span>Waktu manual</span>
          <strong>{result.manualHours.toFixed(1)} jam</strong>
        </div>
        <div>
          <span>Estimasi waktu hemat</span>
          <strong>{result.savedHours.toFixed(1)} jam</strong>
        </div>
        <div>
          <span>Estimasi penghematan</span>
          <strong>{formatIdr(Math.round(result.savedCost))}</strong>
        </div>
      </div>
    </div>
  );
}

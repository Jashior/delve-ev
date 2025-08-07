
import { useState, useEffect } from 'react';
// Helper: probability of at least one drop in all eligible waves, using the correct per-wave drop rate for each wave
function cumulativeDropChance(unique: typeof UNIQUE_TABLE[number], level: number) {
  let probNoDrop = 1;
  for (let w = unique.minWave; w <= level; ++w) {
    const rate = unique.rates[w as keyof typeof unique.rates] || unique.rates[9];
    if (rate) {
      probNoDrop *= (1 - 1 / rate);
    }
  }
  return 1 - probNoDrop;
}

// Use a virtual ID for Mokhaiotl Cloth so it never collides with the sellable item
const MOKHAIOTL_CLOTH_VIRTUAL_ID = 999999;
// Helper: expected value for a unique in n waves
function expectedValueForUnique(prices: PriceMap, unique: typeof UNIQUE_TABLE[number], waves: number) {
  let price = 0;
  if (unique.id === MOKHAIOTL_CLOTH_VIRTUAL_ID) {
    const gauntlets = prices[31106] ?? 0;
    const demonTears = prices[31111] ?? 0;
    const tormentedBrace = prices[19544] ?? 0;
    price = gauntlets - (demonTears * 10000) - tormentedBrace;
  } else {
    price = prices[unique.id] ?? 0;
  }
  let value = 0;
  for (let w = 1; w <= waves; ++w) {
    if (w >= unique.minWave && price) {
      const rate = unique.rates[w as keyof typeof unique.rates] || unique.rates[9];
      if (rate) value += price / rate;
    }
  }
  return value;
}

type Run = {
  id: number;
  level: number;
  seconds: number; // store as seconds for MM:SS support
};

type PriceMap = {
  [id: number]: number;
};


// Unique drop rates and minimum wave for each unique (from table)
const UNIQUE_TABLE = [
  { name: 'Mokhaiotl Cloth', id: MOKHAIOTL_CLOTH_VIRTUAL_ID, minWave: 2, rates: { 2: 2500, 3: 2000, 4: 1350, 5: 810, 6: 765, 7: 720, 8: 630, 9: 540 } },
  { name: 'Eye of Ayak', id: 31115, minWave: 3, rates: { 3: 2000, 4: 1350, 5: 810, 6: 765, 7: 720, 8: 630, 9: 540 } },
  { name: 'Avernic Treads', id: 31088, minWave: 4, rates: { 4: 1350, 5: 810, 6: 765, 7: 720, 8: 630, 9: 540 } },
  // Dom is not included in price calc, but can be added here if needed
];

// Quantity multipliers and guaranteed demon tears per wave (from table)
const WAVE_DATA = [
  { wave: 1, qtyMult: 0.5, guaranteedTears: 0 },
  { wave: 2, qtyMult: 0.65, guaranteedTears: 0 },
  { wave: 3, qtyMult: 1, guaranteedTears: 50 },
  { wave: 4, qtyMult: 1.05, guaranteedTears: 60 },
  { wave: 5, qtyMult: 1.1, guaranteedTears: 70 },
  { wave: 6, qtyMult: 1.12, guaranteedTears: 80 },
  { wave: 7, qtyMult: 1.14, guaranteedTears: 90 },
  { wave: 8, qtyMult: 1.17, guaranteedTears: 100 },
  { wave: 9, qtyMult: 1.2, guaranteedTears: 100 },
];

// For Confliction Gauntlets, subtract demon tears and tormented bracelet
const DEMON_TEARS_ID = 31111;

// Use string IDs for price mapping to match API response
const PRICE_IDS = ["31088", "31106", "31115", "31111", "19544"];


function getWaveData(wave: number) {
  if (wave <= 1) return WAVE_DATA[0];
  if (wave >= 9) return WAVE_DATA[WAVE_DATA.length - 1];
  return WAVE_DATA.find(w => w.wave === wave) || WAVE_DATA[0];
}

async function fetchPrices(): Promise<PriceMap> {
  // Always fetch all prices as strings to match API keys
  const url = `https://prices.runescape.wiki/api/v1/osrs/latest`;
  const res = await fetch(url);
  const data = await res.json();
  const priceData = data.data;
  const prices: PriceMap = {};
  // Map string IDs to numbers for local use
  for (const id of PRICE_IDS) {
    const entry = priceData[id];
    const numId = Number(id);
    if (entry) {
      const high = entry.high ?? 0;
      const low = entry.low ?? 0;
      if (high && low) {
        prices[numId] = Math.round((high + low) / 2);
      } else if (high) {
        prices[numId] = high;
      } else if (low) {
        prices[numId] = low;
      } else {
        prices[numId] = 0;
      }
    } else {
      prices[numId] = 0;
    }
  }
  // Mokhaiotl Cloth = Confliction Gauntlets - (10,000 Demon Tears + 1 Tormented Bracelet)
  prices[31106] = (prices[31106] ?? 0); // Confliction Gauntlets (for debug)
  prices[19544] = (prices[19544] ?? 0); // Tormented Bracelet
  prices[31111] = (prices[31111] ?? 0); // Demon Tears
  prices[MOKHAIOTL_CLOTH_VIRTUAL_ID] = (prices[31106] ?? 0) - ((prices[31111] ?? 0) * 10000) - (prices[19544] ?? 0);
  // Store prices in localStorage for offline fallback
  localStorage.setItem('delve_prices', JSON.stringify(prices));
  return prices;
}


function expectedValue(level: number, prices: PriceMap) {
  let total = 0;
  let demonTears = 0;
  for (let wave = 1; wave <= level; ++wave) {
    const wd = getWaveData(wave);
    demonTears += wd.guaranteedTears;
    // Uniques
    for (const unique of UNIQUE_TABLE) {
      let price = 0;
      if (unique.id === MOKHAIOTL_CLOTH_VIRTUAL_ID) {
        const gauntlets = prices[31106] ?? 0;
        const demonTearsP = prices[31111] ?? 0;
        const tormentedBrace = prices[19544] ?? 0;
        price = gauntlets - (demonTearsP * 10000) - tormentedBrace;
      } else {
        price = prices[unique.id] ?? 0;
      }
      if (wave >= unique.minWave && price) {
        const rate = unique.rates[wave as keyof typeof unique.rates] || unique.rates[9];
        if (rate) {
          total += price / rate;
        }
      }
    }
  }
  // Add demon tears value
  if (prices[DEMON_TEARS_ID]) {
    total += demonTears * prices[DEMON_TEARS_ID];
  }
  return total;
}


function getStoredPrices(): PriceMap {
  try {
    const saved = localStorage.getItem('delve_prices');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function App() {
  // Persist runs in localStorage
  const [runs, setRunsState] = useState<Run[]>(() => {
    try {
      const saved = localStorage.getItem('delve_runs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const setRuns = (fn: (runs: Run[]) => Run[]) => {
    setRunsState(prev => {
      const next = fn(prev);
      localStorage.setItem('delve_runs', JSON.stringify(next));
      return next;
    });
  };

  const [prices, setPrices] = useState<PriceMap>(getStoredPrices());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{level: string; time: string}>({level: '', time: ''});
  const [showDebug, setShowDebug] = useState(false);

  // Fetch prices on mount (if not already loaded)
  useEffect(() => {
    setLoading(true);
    fetchPrices().then(setPrices).catch(() => setError('Failed to fetch prices')).finally(() => setLoading(false));
  }, []);

  // Fetch prices every time a run is added
  // Parse MM:SS or M:SS or just minutes
  function parseTimeToSeconds(input: string): number {
    if (!input) return 0;
    if (input.includes(':')) {
      const [min, sec] = input.split(':').map(Number);
      if (isNaN(min) || isNaN(sec)) return 0;
      return min * 60 + sec;
    } else {
      const min = parseFloat(input);
      if (isNaN(min)) return 0;
      return Math.round(min * 60);
    }
  }

  function formatSecondsToMMSS(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handleAddOrUpdate() {
    const level = parseInt(form.level);
    const seconds = parseTimeToSeconds(form.time);
    if (!level || !seconds) return;
    const updateRuns = () => {
      if (editId !== null) {
        setRuns(runs => runs.map(r => r.id === editId ? { ...r, level, seconds } : r));
        setEditId(null);
      } else {
        setRuns(runs => [...runs, { id: Date.now(), level, seconds }]);
      }
      setForm({level: '', time: ''});
    };
    fetchPrices().then(newPrices => {
      setPrices(newPrices);
      updateRuns();
    }).catch(() => {
      setError('Failed to fetch prices');
      updateRuns();
    });
  }


  function handleEdit(run: Run) {
    setEditId(run.id);
    setForm({ level: run.level.toString(), time: formatSecondsToMMSS(run.seconds) });
  }

  function handleDelete(id: number) {
    setRuns(runs => runs.filter(r => r.id !== id));
    if (editId === id) setEditId(null);
  }

  function handleReset() {
    setRuns(() => []);
    setEditId(null);
    setForm({level: '', time: ''});
  }

  // Calculations
  const totalValue = runs.reduce((sum, run) => sum + expectedValue(run.level, prices), 0);
  const totalSeconds = runs.reduce((sum, run) => sum + run.seconds, 0);
  const gpPerHour = totalSeconds > 0 ? (totalValue * 3600) / totalSeconds : 0;

  // Accordion state for each run
  const [openRow, setOpenRow] = useState<number | null>(null);

  // Centering and modern UI (no gradients, full width/height, wider box)
  return (
    <div style={{ minHeight: '100vh', minWidth: '100vw', background: '#232426', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: 40, background: '#181920', borderRadius: 18, boxShadow: '0 4px 32px #0005', border: '1px solid #232323' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 6, fontWeight: 800, fontSize: 32, color: '#43e97b', letterSpacing: 1 }}>Delve Run Value Calculator</h1>
        <h2 style={{ textAlign: 'center', marginBottom: 18, fontWeight: 700, letterSpacing: 0.5, color: '#fff' }}>OSRS Delve Expected Value & GP/Hour</h2>
        <form onSubmit={e => { e.preventDefault(); handleAddOrUpdate(); }} style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
          <input
            type="number"
            min={1}
            placeholder="Delve level"
            value={form.level}
            onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #444', background: '#23242a', color: '#fff', fontSize: 17 }}
          />
          <input
            type="text"
            placeholder="Time (MM:SS or MM)"
            value={form.time}
            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #444', background: '#23242a', color: '#fff', fontSize: 17 }}
          />
          <button type="submit" style={{ minWidth: 100, padding: '12px 0', borderRadius: 8, border: 'none', background: '#4caf50', color: '#fff', fontWeight: 600, fontSize: 17, boxShadow: '0 2px 8px #0002', cursor: 'pointer', transition: 'background 0.2s' }}>{editId !== null ? 'Update' : 'Add'}</button>
        </form>
        <div style={{ marginBottom: 18 }}>
          <button onClick={handleReset} style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: '#232426', color: '#fff', fontWeight: 500, fontSize: 16, cursor: 'pointer', boxShadow: '0 1px 4px #0002' }}>Reset Runs</button>
        </div>
        {loading && <div style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>Loading prices...</div>}
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: 12 }}>{error}</div>}
        <table style={{ width: '100%', marginBottom: 18, borderCollapse: 'separate', borderSpacing: 0, background: '#20212a', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 8px #0001' }}>
          <thead>
            <tr style={{ background: '#232426', color: '#fff' }}>
              <th style={{ padding: '10px 4px', fontWeight: 600 }}>Level Completed</th>
              <th style={{ padding: '10px 4px', fontWeight: 600 }}>Time</th>
              <th style={{ padding: '10px 4px', fontWeight: 600 }}>EV</th>
              <th style={{ padding: '10px 4px', fontWeight: 600 }}>GP/Hour</th>
              <th style={{ padding: '10px 4px' }}></th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => {
              const value = Math.trunc(expectedValue(run.level, prices));
              const gpHour = run.seconds > 0 ? Math.trunc((value * 3600) / run.seconds) : 0;
              const isOpen = openRow === run.id;
              return (
                <>
                  <tr key={run.id} style={{ background: editId === run.id ? '#2e7d32' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff' }}>{run.level}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff' }}>{formatSecondsToMMSS(run.seconds)}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'right', color: '#fff' }}>{value.toLocaleString()} gp</td>
                    <td style={{ padding: '10px 4px', textAlign: 'right', color: '#4caf50', fontWeight: 600 }}>{gpHour.toLocaleString()}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <button onClick={() => handleEdit(run)} style={{ marginRight: 4, border: 'none', background: '#333', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>Edit</button>
                      <button onClick={() => handleDelete(run.id)} style={{ border: 'none', background: '#b71c1c', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>Delete</button>
                      <button onClick={() => setOpenRow(isOpen ? null : run.id)} style={{ marginLeft: 4, border: 'none', background: '#222', color: '#fff', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 14 }}>{isOpen ? 'Hide' : 'Details'}</button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} style={{ background: '#232426', color: '#fff', padding: 0 }}>
                        <div style={{ padding: '14px 10px 10px 10px', borderRadius: 8, border: '1px solid #232323', margin: 6 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Item Breakdown:</div>
                          {UNIQUE_TABLE.map(item => {
                            // Cumulative chance: probability of at least one drop in all eligible waves
                            const chance = run.level >= item.minWave ? cumulativeDropChance(item, run.level) : 0;
                            const value = Math.trunc(expectedValueForUnique(prices, item, run.level));
                            return (
                              <div key={item.id} style={{ marginBottom: 10, fontSize: 15, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span style={{ fontWeight: 500, minWidth: 140 }}>{item.name}:</span>
                                <span style={{ color: '#4caf50', fontWeight: 600, minWidth: 90 }}>Chance: {(chance * 100).toFixed(2)}%</span>
                                <span style={{ color: '#fff', fontWeight: 600, minWidth: 120 }}>Value: {value.toLocaleString()} gp</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontWeight: 500, fontSize: 19, marginBottom: 8, color: '#fff' }}>Total Value: {Math.trunc(totalValue).toLocaleString()} gp</div>
        <div style={{ fontWeight: 500, fontSize: 19, marginBottom: 8, color: '#fff' }}>Total Time: {formatSecondsToMMSS(totalSeconds)}</div>
        <div style={{ fontWeight: 700, fontSize: 24, color: '#43e97b', marginBottom: 8 }}>GP/Hour: {Math.trunc(gpPerHour).toLocaleString()}</div>
        <div style={{ fontSize: 13, color: '#bbb', marginTop: 16, textAlign: 'center' }}>
          Prices from <a href="https://prices.runescape.wiki/" target="_blank" rel="noopener noreferrer" style={{ color: '#4caf50' }}>OSRS Wiki</a>. Drop rates per level are hardcoded.
        </div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 10, textAlign: 'left' }}>
          <button onClick={() => setShowDebug(d => !d)} style={{ background: '#232426', color: '#bbb', border: '1px solid #333', borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: 'pointer', marginBottom: 4 }}>
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          {showDebug && (
            <div style={{ marginTop: 6 }}>
              <b>Debug: Fetched Prices</b><br />
              Mokhaiotl Cloth: {(() => {
                const gauntlets = prices[31106] ?? 0;
                const demonTears = prices[31111] ?? 0;
                const tormentedBrace = prices[19544] ?? 0;
                return (gauntlets - (demonTears * 10000) - tormentedBrace).toLocaleString();
              })()} gp<br />
              Eye of Ayak: {prices[31115]?.toLocaleString() ?? 'N/A'} gp<br />
              Avernic Treads: {prices[31088]?.toLocaleString() ?? 'N/A'} gp<br />
              Demon Tears: {prices[31111]?.toLocaleString() ?? 'N/A'} gp<br />
              Tormented Bracelet: {prices[19544]?.toLocaleString() ?? 'N/A'} gp
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

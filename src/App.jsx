import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  Building2,
  Download,
  ExternalLink,
  Filter,
  Flame,
  History,
  Loader2,
  Search,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import { sampleScan } from './lib/sampleData.js';
import { downloadCsv } from './lib/csv.js';

const defaultForm = {
  preset: 'global-digital-health',
  query: 'Find Series A-C digital health or health transformation companies with new commercial leadership, funding, hiring velocity, or expansion signals. Prioritize companies likely to need a Buyer Journey Map and Sales Enablement Portfolio.',
  region: 'Global, with a preference for US and North Carolina/RDU when relevant',
  sector: 'Digital health, health tech, healthcare AI, care delivery infrastructure, healthcare transformation',
  employeeMin: 50,
  employeeMax: 1000,
  stage: 'Series A-C / post-revenue growth',
  limit: 15,
  token: ''
};

const presets = {
  'global-digital-health': {
    label: 'Global Digital Health GTM Radar',
    query: defaultForm.query,
    region: defaultForm.region,
    sector: defaultForm.sector,
    employeeMin: 50,
    employeeMax: 1000,
    stage: 'Series A-C / post-revenue growth'
  },
  'nc-rdu-transformation': {
    label: 'NC/RDU Health Transformation Scan',
    query: 'Find North Carolina / RDU digital health or health transformation companies with 50-1000 employees. Prioritize companies with enterprise healthcare buyers, commercial leadership changes, expansion, funding, or open GTM roles.',
    region: 'North Carolina, Research Triangle, Raleigh, Durham, Chapel Hill, RTP',
    sector: 'Digital health, health transformation, healthcare services innovation, health AI, interoperability, care navigation',
    employeeMin: 50,
    employeeMax: 1000,
    stage: 'Growth stage / post-revenue'
  },
  'leadership-change': {
    label: 'Executive Change Radar',
    query: 'Find healthcare technology companies that recently hired a first CRO, CMO, Head of Growth, VP Marketing, VP Product Marketing, VP RevOps, VP Sales, or commercial leader. Prioritize signal strength and buyer-journey needs.',
    region: 'United States and Canada',
    sector: 'Healthcare technology, digital health, payer/provider technology, healthcare AI',
    employeeMin: 50,
    employeeMax: 1000,
    stage: 'Series A-C / growth'
  }
};

function scoreClass(score) {
  if (score >= 80) return 'score-hot';
  if (score >= 65) return 'score-warm';
  return 'score-watch';
}

function priorityClass(priority = '') {
  const value = priority.toLowerCase();
  if (value.includes('hot')) return 'pill hot';
  if (value.includes('qualified')) return 'pill warm';
  return 'pill watch';
}

function getStoredScans() {
  try {
    return JSON.parse(localStorage.getItem('bluedoor-signal-scans') || '[]');
  } catch {
    return [];
  }
}

function App() {
  const [form, setForm] = useState(defaultForm);
  const [scan, setScan] = useState(sampleScan);
  const [selected, setSelected] = useState(sampleScan.companies[0]);
  const [status, setStatus] = useState('demo');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [history, setHistory] = useState(getStoredScans);
  const [showHistory, setShowHistory] = useState(false);

  const companies = scan?.companies || [];

  const filteredCompanies = useMemo(() => {
    const rows = [...companies].sort((a, b) => Number(b.total_score || 0) - Number(a.total_score || 0));
    if (filter === 'All') return rows;
    return rows.filter((row) => String(row.priority || '').toLowerCase().includes(filter.toLowerCase()));
  }, [companies, filter]);

  const metrics = useMemo(() => {
    const total = companies.length;
    const hot = companies.filter((row) => Number(row.total_score) >= 80 || String(row.priority).toLowerCase().includes('hot')).length;
    const avg = total ? Math.round(companies.reduce((acc, row) => acc + Number(row.total_score || 0), 0) / total) : 0;
    const leadership = companies.filter((row) => String(row.signal_type || '').toLowerCase().match(/leader|hire|cro|cmo|growth|revops|sales|marketing/)).length;
    return { total, hot, avg, leadership };
  }, [companies]);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(value) {
    const preset = presets[value];
    setForm((prev) => ({ ...prev, preset: value, ...preset }));
  }

  async function runScan(event) {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/.netlify/functions/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(form.token ? { 'X-Signal-Token': form.token } : {})
        },
        body: JSON.stringify({
          query: form.query,
          region: form.region,
          sector: form.sector,
          employeeMin: Number(form.employeeMin),
          employeeMax: Number(form.employeeMax),
          stage: form.stage,
          limit: Number(form.limit)
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Signal scan failed. Check your Netlify Function logs.');
      }

      const normalized = {
        ...payload,
        companies: (payload.companies || []).map((company) => ({ ...company, total_score: Number(company.total_score || 0) }))
      };

      setScan(normalized);
      setSelected(normalized.companies?.[0] || null);
      setStatus('live');
      saveToHistory(normalized);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  function saveToHistory(nextScan) {
    const entry = {
      id: crypto.randomUUID(),
      saved_at: new Date().toISOString(),
      title: nextScan?.meta?.scan_name || 'Customer Signal Scan',
      scan: nextScan
    };
    const nextHistory = [entry, ...history].slice(0, 8);
    setHistory(nextHistory);
    localStorage.setItem('bluedoor-signal-scans', JSON.stringify(nextHistory));
  }

  function loadHistory(entry) {
    setScan(entry.scan);
    setSelected(entry.scan?.companies?.[0] || null);
    setShowHistory(false);
    setStatus('saved');
  }

  function resetDemo() {
    setScan(sampleScan);
    setSelected(sampleScan.companies[0]);
    setStatus('demo');
    setError('');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-mark">B</div>
          <div>
            <p className="eyebrow">Bluedoor</p>
            <h1>Customer Signal BI</h1>
          </div>
        </div>

        <nav className="side-nav">
          <a href="#scan"><Search size={18} /> Signal Scan</a>
          <a href="#dashboard"><BarChart3 size={18} /> Dashboard</a>
          <a href="#details"><Brain size={18} /> Analysis</a>
        </nav>

        <div className="strategy-card">
          <p className="eyebrow">Scoring Model</p>
          <h3>Commercial inflection first.</h3>
          <ul>
            <li>40% leadership / GTM trigger</li>
            <li>20% ICP fit</li>
            <li>10% funding momentum</li>
            <li>20% hiring velocity</li>
            <li>10% strategic fit</li>
          </ul>
        </div>
      </aside>

      <main className="main-panel">
        <header className="hero">
          <div>
            <p className="eyebrow">Business Intelligence Workspace</p>
            <h2>Turn market signals into ranked outreach moves.</h2>
            <p className="hero-copy">
              Search live market signals, score ICP fit, map the best Bluedoor package, and export the next-action list.
            </p>
          </div>
          <div className={`status-chip ${status}`}>
            {status === 'loading' ? <Loader2 className="spin" size={16} /> : <Activity size={16} />}
            {status === 'demo' && 'Demo Data'}
            {status === 'live' && 'Live Scan'}
            {status === 'saved' && 'Saved Scan'}
            {status === 'error' && 'Needs Attention'}
            {status === 'loading' && 'Scanning'}
          </div>
        </header>

        <section id="scan" className="panel scan-panel">
          <form onSubmit={runScan}>
            <div className="form-grid top-grid">
              <label>
                Signal preset
                <select value={form.preset} onChange={(event) => applyPreset(event.target.value)}>
                  {Object.entries(presets).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Max companies
                <input type="number" min="5" max="25" value={form.limit} onChange={(event) => updateForm('limit', event.target.value)} />
              </label>
              <label>
                Admin token, optional
                <input type="password" value={form.token} placeholder="Only if SIGNAL_ADMIN_TOKEN is set" onChange={(event) => updateForm('token', event.target.value)} />
              </label>
            </div>

            <label>
              Search and analyze instruction
              <textarea value={form.query} onChange={(event) => updateForm('query', event.target.value)} rows="4" />
            </label>

            <div className="form-grid">
              <label>
                Region
                <input value={form.region} onChange={(event) => updateForm('region', event.target.value)} />
              </label>
              <label>
                Sector
                <input value={form.sector} onChange={(event) => updateForm('sector', event.target.value)} />
              </label>
              <label>
                Stage
                <input value={form.stage} onChange={(event) => updateForm('stage', event.target.value)} />
              </label>
              <label>
                Employee min
                <input type="number" value={form.employeeMin} onChange={(event) => updateForm('employeeMin', event.target.value)} />
              </label>
              <label>
                Employee max
                <input type="number" value={form.employeeMax} onChange={(event) => updateForm('employeeMax', event.target.value)} />
              </label>
            </div>

            {error && (
              <div className="error-box">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="actions-row">
              <button className="primary-button" type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                Run Signal Scan
              </button>
              <button className="secondary-button" type="button" onClick={() => downloadCsv(filteredCompanies)}>
                <Download size={18} /> Export CSV
              </button>
              <button className="secondary-button" type="button" onClick={() => setShowHistory((prev) => !prev)}>
                <History size={18} /> Saved Runs
              </button>
              <button className="ghost-button" type="button" onClick={resetDemo}>Reset Demo</button>
            </div>
          </form>

          {showHistory && (
            <div className="history-list">
              {history.length === 0 ? <p>No saved scans yet.</p> : history.map((entry) => (
                <button key={entry.id} type="button" onClick={() => loadHistory(entry)}>
                  <span>{entry.title}</span>
                  <small>{new Date(entry.saved_at).toLocaleString()}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section id="dashboard" className="metrics-grid">
          <MetricCard icon={<Building2 />} label="Companies" value={metrics.total} />
          <MetricCard icon={<Flame />} label="Hot Leads" value={metrics.hot} />
          <MetricCard icon={<TrendingUp />} label="Average Score" value={metrics.avg} />
          <MetricCard icon={<Target />} label="Leadership Signals" value={metrics.leadership} />
        </section>

        <section className="panel insight-panel">
          <div>
            <p className="eyebrow">Executive Brief</p>
            <h3>{scan?.summary?.strongest_pattern || 'No pattern yet'}</h3>
            <p>{scan?.summary?.executive_brief}</p>
          </div>
          <div className="methodology-box">
            <strong>Methodology</strong>
            <span>{scan?.meta?.methodology}</span>
          </div>
        </section>

        <section className="panel table-panel">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Ranked Accounts</p>
              <h3>{scan?.meta?.scan_name || 'Customer Signal Scan'}</h3>
            </div>
            <div className="filter-group">
              <Filter size={16} />
              {['All', 'Hot', 'Qualified', 'Watchlist'].map((item) => (
                <button key={item} className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Signal</th>
                  <th>Score</th>
                  <th>Priority</th>
                  <th>Package</th>
                  <th>Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={`${company.company}-${company.website}`} onClick={() => setSelected(company)} className={selected?.company === company.company ? 'selected-row' : ''}>
                    <td>
                      <strong>{company.company}</strong>
                      <span>{company.hq} · {company.employee_range}</span>
                    </td>
                    <td>
                      <strong>{company.signal_type}</strong>
                      <span>{company.signal_summary}</span>
                    </td>
                    <td>
                      <div className="score-cell">
                        <span className={scoreClass(Number(company.total_score))}>{company.total_score}</span>
                        <div className="mini-bar"><i style={{ width: `${Math.min(100, Number(company.total_score || 0))}%` }} /></div>
                      </div>
                    </td>
                    <td><span className={priorityClass(company.priority)}>{company.priority}</span></td>
                    <td>{company.package_map}</td>
                    <td>{company.next_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selected && (
          <section id="details" className="panel detail-panel">
            <div className="detail-header">
              <div>
                <p className="eyebrow">Account Analysis</p>
                <h3>{selected.company}</h3>
                <p>{selected.sector}</p>
              </div>
              <a className="company-link" href={selected.website} target="_blank" rel="noreferrer">
                Visit Site <ExternalLink size={16} />
              </a>
            </div>

            <div className="score-breakdown">
              <ScoreBar label="Leadership trigger" value={selected.leadership_signal_score} max={40} />
              <ScoreBar label="ICP fit" value={selected.icp_fit_score} max={20} />
              <ScoreBar label="Funding momentum" value={selected.funding_momentum_score} max={10} />
              <ScoreBar label="Hiring velocity" value={selected.hiring_velocity_score} max={20} />
              <ScoreBar label="Strategic fit" value={selected.strategic_fit_score} max={10} />
            </div>

            <div className="detail-grid">
              <DetailBlock title="Why it matters" body={selected.why_it_matters} />
              <DetailBlock title="Recommended first outreach" body={selected.recommended_first_outreach} />
              <DetailBlock title="Caveats" body={selected.caveats} />
            </div>

            <div className="evidence-list">
              <strong>Evidence</strong>
              {(selected.evidence_links || []).map((link) => (
                <a key={`${link.title}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                  {link.title || link.url} <span>{link.source_type}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreBar({ label, value, max }) {
  const percent = Math.round((Number(value || 0) / max) * 100);
  return (
    <div className="score-bar-row">
      <div>
        <span>{label}</span>
        <strong>{value}/{max}</strong>
      </div>
      <div className="score-track"><i style={{ width: `${Math.min(100, percent)}%` }} /></div>
    </div>
  );
}

function DetailBlock({ title, body }) {
  return (
    <div className="detail-block">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export default App;

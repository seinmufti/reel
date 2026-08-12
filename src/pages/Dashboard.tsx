import { Link } from 'react-router-dom'
import { primaryModules } from '../components/layout/nav'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useDemo } from '../context/DemoContext'
import { formatCurrency } from '../data/mockData'

export function Dashboard() {
  const { payablePrs, funds } = useDemo()
  const totalFunds = funds.reduce((s, f) => s + f.balance, 0)

  return (
    <div>
      <PageHeader title="REEL Operations Dashboard" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Fund balances" value={formatCurrency(totalFunds)} hint={`${funds.length} funds`} />
        <Stat label="PRs awaiting payment" value={String(payablePrs.length)} hint="From procurement" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {primaryModules.map((mod) => (
          <Link
            key={mod.to}
            to={mod.to}
            className="group rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] transition hover:border-teal/50 hover:shadow-md"
          >
            <div className="font-display text-lg font-semibold text-ink group-hover:text-teal">{mod.label}</div>
            <p className="mt-2 text-sm text-slate-soft/80">{mod.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-teal">Open module →</span>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <Panel title="Payable purchase requests">
          {payablePrs.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No approved PRs awaiting payment.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payablePrs.map((pr) => (
                <li key={pr.id} className="flex justify-between gap-3 border-b border-line/70 pb-2 last:border-0">
                  <span>
                    <Link className="font-semibold text-teal hover:underline" to="/finance">
                      {pr.number}
                    </Link>
                    <span className="text-slate-soft/80"> — {pr.title}</span>
                  </span>
                  <Link to="/procurement" className="text-slate-soft/70 hover:text-teal">
                    View PR
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-soft/70">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs text-slate-soft/70">{hint}</div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { Table, Td, Th } from '../../components/ui/Table'
import { useDemo } from '../../context/DemoContext'

export function LogisticsPage() {
  const { inventory, adjustInventory, purchaseRequests } = useDemo()
  const lowStock = inventory.filter((i) => i.quantity <= i.reorderLevel)

  return (
    <div>
      <PageHeader title="Logistics & Inventory" />

      {lowStock.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>{lowStock.length} item(s)</strong> at or below reorder level:{' '}
          {lowStock.map((i) => i.name).join(', ')}.
        </div>
      ) : null}

      <Panel title="Stock list">
        {inventory.length === 0 ? (
          <p className="text-sm text-slate-soft/70">No inventory items yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>SKU</Th>
                <Th>Item</Th>
                <Th>Location</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Reorder</Th>
                <Th>Linked PR</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const pr = purchaseRequests.find((p) => p.id === item.linkedPrId)
                const low = item.quantity <= item.reorderLevel
                return (
                  <tr key={item.id} className={low ? 'bg-amber-50/50' : undefined}>
                    <Td className="font-mono text-xs">{item.sku}</Td>
                    <Td>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-soft/70">{item.unit}</div>
                    </Td>
                    <Td>{item.location}</Td>
                    <Td className="text-right font-semibold">
                      {item.quantity}
                      {low ? (
                        <span className="ml-2">
                          <Badge tone="amber">Low</Badge>
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-right">{item.reorderLevel}</Td>
                    <Td>
                      {pr ? (
                        <Link to="/procurement" className="text-teal hover:underline">
                          {pr.number}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="space-x-2 text-right">
                      <Button variant="secondary" onClick={() => adjustInventory(item.id, 1)}>
                        Receive +1
                      </Button>
                      <Button variant="ghost" onClick={() => adjustInventory(item.id, -1)}>
                        Issue −1
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  )
}

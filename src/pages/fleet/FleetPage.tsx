import { useState, type FormEvent } from 'react'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field, inputClass } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { Table, Td, Th } from '../../components/ui/Table'
import { useDemo } from '../../context/DemoContext'

export function FleetPage() {
  const { trips, updateTripStatus, addTrip, currentUser, drivers, vehicles } = useDemo()
  const [tab, setTab] = useState<'trips' | 'vehicles' | 'drivers' | 'new'>('trips')

  const upcoming = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate))

  function handleTrip(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    addTrip({
      purpose: String(fd.get('purpose')),
      destination: String(fd.get('destination')),
      requester: String(fd.get('requester')),
      vehicleId: String(fd.get('vehicleId') || '') || undefined,
      driverId: String(fd.get('driverId') || '') || undefined,
      startDate: String(fd.get('startDate')),
      endDate: String(fd.get('endDate')),
    })
    e.currentTarget.reset()
    setTab('trips')
  }

  return (
    <div>
      <PageHeader title="Fleet Management" />

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ['trips', 'Trip requests'],
            ['vehicles', 'Vehicles'],
            ['drivers', 'Drivers'],
            ['new', 'New trip'],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} variant={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === 'trips' ? (
        <Panel title="Upcoming & recent trips">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No trip requests yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Purpose</Th>
                  <Th>Destination</Th>
                  <Th>Dates</Th>
                  <Th>Vehicle</Th>
                  <Th>Driver</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((trip) => {
                  const vehicle = vehicles.find((v) => v.id === trip.vehicleId)
                  const driver = drivers.find((d) => d.id === trip.driverId)
                  return (
                    <tr key={trip.id}>
                      <Td>
                        <div className="font-medium">{trip.purpose}</div>
                        <div className="text-xs text-slate-soft/70">{trip.requester}</div>
                      </Td>
                      <Td>{trip.destination}</Td>
                      <Td>
                        {trip.startDate}
                        {trip.endDate !== trip.startDate ? ` → ${trip.endDate}` : ''}
                      </Td>
                      <Td>{vehicle ? `${vehicle.plate}` : 'Unassigned'}</Td>
                      <Td>{driver?.name ?? 'Unassigned'}</Td>
                      <Td>
                        <Badge tone={statusTone(trip.status)}>{trip.status.replace('_', ' ')}</Badge>
                      </Td>
                      <Td className="space-x-2 text-right">
                        {trip.status === 'requested' ? (
                          <>
                            <Button onClick={() => updateTripStatus(trip.id, 'approved')}>Approve</Button>
                            <Button variant="cancel" onClick={() => updateTripStatus(trip.id, 'cancelled')}>
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {trip.status === 'approved' ? (
                          <Button onClick={() => updateTripStatus(trip.id, 'in_progress')}>Start trip</Button>
                        ) : null}
                        {trip.status === 'in_progress' ? (
                          <Button onClick={() => updateTripStatus(trip.id, 'completed')}>Complete</Button>
                        ) : null}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : null}

      {tab === 'vehicles' ? (
        <Panel title="Vehicle fleet">
          {vehicles.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No vehicles yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Plate</Th>
                  <Th>Vehicle</Th>
                  <Th>Year</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id}>
                    <Td className="font-mono text-xs font-semibold">{v.plate}</Td>
                    <Td>
                      {v.make} {v.model}
                    </Td>
                    <Td>{v.year}</Td>
                    <Td>
                      <Badge tone={statusTone(v.status)}>{v.status.replace('_', ' ')}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : null}

      {tab === 'drivers' ? (
        <Panel title="Drivers">
          {drivers.length === 0 ? (
            <p className="text-sm text-slate-soft/70">No drivers yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>License</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <Td className="font-medium">{d.name}</Td>
                    <Td className="font-mono text-xs">{d.licenseNo}</Td>
                    <Td>{d.phone}</Td>
                    <Td>
                      <Badge tone={statusTone(d.status)}>{d.status.replace('_', ' ')}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      ) : null}

      {tab === 'new' ? (
        <Panel title="Create trip request">
          <form className="grid max-w-2xl gap-4 sm:grid-cols-2" onSubmit={handleTrip}>
            <Field label="Purpose" className="sm:col-span-2">
              <input className={inputClass} name="purpose" required placeholder="Why is this trip needed?" />
            </Field>
            <Field label="Destination" className="sm:col-span-2">
              <input className={inputClass} name="destination" required />
            </Field>
            <Field label="Requester">
              <input className={inputClass} name="requester" required defaultValue={currentUser.name} />
            </Field>
            <Field label="Vehicle (optional)">
              <select className={inputClass} name="vehicleId" defaultValue="">
                <option value="">Assign later</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.make} {v.model}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Driver (optional)">
              <select className={inputClass} name="driverId" defaultValue="">
                <option value="">Assign later</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date">
              <input
                className={inputClass}
                type="date"
                name="startDate"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <Field label="End date">
              <input
                className={inputClass}
                type="date"
                name="endDate"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">Submit trip request</Button>
            </div>
          </form>
        </Panel>
      ) : null}
    </div>
  )
}

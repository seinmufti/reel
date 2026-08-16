import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Panel } from '../../components/ui/Panel'
import { Table, Td, Th } from '../../components/ui/Table'
import { useDemo } from '../../context/DemoContext'
import { formatDate } from '../../data/mockData'

function ProjectList() {
  const { projects } = useDemo()
  return (
    <div>
      <PageHeader title="Project Management" />
      {projects.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-soft/70">No projects yet.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] transition hover:border-teal/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-slate-soft/70">{project.code}</div>
                  <div className="font-display text-lg font-semibold text-ink">{project.name}</div>
                </div>
                <Badge tone={statusTone(project.status)}>{project.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-soft/80">
                {project.donor ? `Donor: ${project.donor}` : 'Internal program'}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-slate-soft/70">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-mist">
                  <div className="h-2 rounded-full bg-teal" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectDetail() {
  const { projectId } = useParams()
  const { projects, goals, tasks } = useDemo()
  const project = projects.find((p) => p.id === projectId)
  if (!project) return <Navigate to="/projects" replace />

  const projectGoals = goals.filter((g) => g.projectId === project.id)
  const projectTasks = tasks.filter((t) => t.projectId === project.id)

  return (
    <div>
      <PageHeader
        title={project.name}
        actions={
          <Link to="/projects">
            <Button variant="secondary">All projects</Button>
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium">Overall progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-mist">
          <div className="h-2.5 rounded-full bg-teal" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Goals & milestones">
          <ul className="space-y-3">
            {projectGoals.map((goal) => (
              <li key={goal.id} className="flex items-start justify-between gap-3 border-b border-line/70 pb-3 last:border-0">
                <div>
                  <div className="font-medium text-ink">{goal.title}</div>
                  <div className="text-xs text-slate-soft/70">Target {formatDate(goal.targetDate)}</div>
                </div>
                <Badge tone={goal.done ? 'emerald' : 'amber'}>{goal.done ? 'done' : 'open'}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Tasks">
          <Table>
            <thead>
              <tr>
                <Th>Task</Th>
                <Th>Assignee</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {projectTasks.map((task) => (
                <tr key={task.id}>
                  <Td className="font-medium">{task.title}</Td>
                  <Td>{task.assignee}</Td>
                  <Td>{formatDate(task.dueDate)}</Td>
                  <Td>
                    <Badge tone={statusTone(task.status)}>{task.status.replace('_', ' ')}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  )
}

export function ProjectsPage() {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path=":projectId" element={<ProjectDetail />} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}

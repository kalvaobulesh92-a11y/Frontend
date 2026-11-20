import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, Plus, Wrench, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api, { getApiError } from '../services/api'
import { useToast } from '../context/useToast'

function TaskCard({ task, role, onTransition }) {
  const [noteTransition, setNoteTransition] = useState('')
  const form = useForm({ defaultValues: { note: '' } })

  function submitNote(values) {
    onTransition(task, noteTransition, values.note)
      .then((succeeded) => {
        if (!succeeded) return
        form.reset()
        setNoteTransition('')
      })
  }

  return (
    <article className="booking-card">
      <div className="booking-card-header">
        <div>
          <span className="booking-id">Task #{task.sort_order + 1}</span>
          <h3>{task.title}</h3>
          <p>{task.status.replace('_', ' ')}</p>
        </div>
      </div>
      {task.description && <p>{task.description}</p>}
      <div className="booking-actions-right">
        {role === 'worker' && ['pending', 'changes_requested'].includes(task.status) && (
          <button type="button" className="button button-primary button-small" onClick={() => onTransition(task, 'start')}>
            <Wrench size={14} /> Start task
          </button>
        )}
        {role === 'worker' && task.status === 'in_progress' && (
          <button type="button" className="button button-primary button-small" onClick={() => setNoteTransition('submit')}>
            <CheckCircle2 size={14} /> Submit for review
          </button>
        )}
        {role === 'customer' && task.status === 'submitted' && (
          <>
            <button type="button" className="button button-primary button-small" onClick={() => onTransition(task, 'approve', 'Work approved by customer.')}>
              <CheckCircle2 size={14} /> Approve work
            </button>
            <button type="button" className="button button-outline danger-outline button-small" onClick={() => setNoteTransition('request_changes')}>
              <XCircle size={14} /> Request changes
            </button>
          </>
        )}
      </div>
      {noteTransition && (
        <form className="dashboard-form" onSubmit={form.handleSubmit(submitNote)}>
          <label className="form-field">
            <span>{noteTransition === 'submit' ? 'Completion notes' : 'Requested changes'}</span>
            <textarea rows="3" {...form.register('note', { required: 'Add a note before submitting.' })} />
            {form.formState.errors.note && <span className="field-error">{form.formState.errors.note.message}</span>}
          </label>
          <button className="button button-primary button-small" type="submit">Submit</button>
          <button className="button button-outline button-small" type="button" onClick={() => setNoteTransition('')}>Cancel</button>
        </form>
      )}
      {task.updates.length > 0 && (
        <div className="booking-notes">
          <strong>Work history</strong>
          {task.updates.map((update) => (
            <p key={update.id}>
              {update.actor_name} · {update.to_status.replace('_', ' ')}
              {update.note ? ` — ${update.note}` : ''}
              <small> · {new Date(update.created_at).toLocaleString('en-IN')}</small>
            </p>
          ))}
        </div>
      )}
    </article>
  )
}

export default function ProjectWorkspace({ role }) {
  const { showToast } = useToast()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addingProject, setAddingProject] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ defaultValues: { title: '', description: '' } })

  async function loadProjects() {
    const { data } = await api.get('/projects/')
    return data.results || data
  }

  async function reload() {
    try {
      setProjects(await loadProjects())
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    loadProjects()
      .then((items) => { if (active) setProjects(items) })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function transitionTask(task, transition, note = '') {
    try {
      await api.post(`/projects/tasks/${task.id}/transition/`, { transition, note })
      showToast(transition === 'approve' ? 'Task approved.' : transition === 'request_changes' ? 'Change request sent.' : 'Task status updated.')
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
      return false
    }
    return true
  }

  async function addTask(values) {
    setSubmitting(true)
    form.clearErrors('root')
    try {
      await api.post(`/projects/${addingProject}/tasks/`, values)
      form.reset()
      setAddingProject(null)
      showToast('Checklist task added.')
      await reload()
    } catch (requestError) {
      form.setError('root', { message: getApiError(requestError) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="container dashboard-container">
        <header className="dashboard-header">
          <span className="dashboard-icon"><BriefcaseBusiness size={22} /></span>
          <div>
            <span className="section-kicker">Project Workspace</span>
            <h1>{role === 'customer' ? 'Track your projects' : 'Manage assigned projects'}</h1>
            <p>Projects are created from accepted quotations. Work progress and customer review are recorded in an activity history.</p>
            <Link className="text-link" to="/dashboard"><ArrowLeft size={15} /> Back to dashboard</Link>
          </div>
        </header>
        {error && <div className="form-alert dashboard-alert" role="alert">{error}</div>}
        {loading ? <div className="skeleton dashboard-skeleton" /> : projects.length === 0 ? (
          <div className="empty-state"><BriefcaseBusiness size={30} /><strong>No active projects yet</strong><span>Accept a quotation to create a project and its first task.</span></div>
        ) : projects.map((project) => (
          <section className="dashboard-panel" key={project.id}>
            <div className="panel-heading">
              <div>
                <span className="booking-id">Project #{project.id} · {project.status.replace('_', ' ')}</span>
                <h2>{project.title}</h2>
                <p>{project.description}</p>
              </div>
              <span className="booking-status-badge status-pending"><Clock3 size={14} /> {project.status.replace('_', ' ')}</span>
            </div>
            <div className="booking-meta-grid">
              <div><span className="meta-label">Accepted amount</span><strong>₹{Number(project.agreement.terms_snapshot.amount).toLocaleString('en-IN')}</strong></div>
              <div><span className="meta-label">Estimated duration</span><strong>{project.agreement.terms_snapshot.estimated_days ? `${project.agreement.terms_snapshot.estimated_days} days` : 'Not specified'}</strong></div>
              <div><span className="meta-label">Accepted</span><strong>{new Date(project.agreement.accepted_at).toLocaleDateString('en-IN')}</strong></div>
            </div>
            {project.agreement.scope_snapshot.service_location && (
              <p className="booking-notes">
                Service address (shared with the agreed parties): {project.agreement.scope_snapshot.service_location.address_line1}, {
                  project.agreement.scope_snapshot.service_location.locality
                }, {project.agreement.scope_snapshot.service_location.city}
              </p>
            )}
            <div className="panel-heading">
              <div><h3>Execution checklist</h3><p>Tasks describe the execution plan; accepted agreement terms remain unchanged.</p></div>
              {project.status !== 'completed' && (
                <button type="button" className="button button-outline button-small" onClick={() => {
                  setAddingProject(project.id)
                  form.reset({ title: '', description: '' })
                }}><Plus size={15} /> Add checklist task</button>
              )}
            </div>
            {addingProject === project.id && (
              <form className="dashboard-form" onSubmit={form.handleSubmit(addTask)}>
                {form.formState.errors.root && <div className="form-alert" role="alert">{form.formState.errors.root.message}</div>}
                <label className="form-field"><span>Task title</span><input maxLength="180" {...form.register('title', { required: 'Enter a task title.' })} />{form.formState.errors.title && <span className="field-error">{form.formState.errors.title.message}</span>}</label>
                <label className="form-field"><span>Task details <small>(optional)</small></span><textarea rows="3" {...form.register('description')} /></label>
                <button type="submit" className="button button-primary button-small" disabled={submitting}>{submitting ? 'Adding…' : 'Add task'}</button>
                <button type="button" className="button button-outline button-small" onClick={() => setAddingProject(null)}>Cancel</button>
              </form>
            )}
            <div className="booking-card-list">
              {project.tasks.map((task) => (
                <TaskCard key={task.id} task={task} role={role} onTransition={transitionTask} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

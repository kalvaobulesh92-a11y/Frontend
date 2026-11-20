import { useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, ClipboardList, FileText, Plus, Send, Trash2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import api, { getApiError } from '../services/api'
import { useToast } from '../context/useToast'

function collection(response) {
  return response.data.results || response.data || []
}

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Could not load the Razorpay checkout script.'))
    document.body.appendChild(script)
  })
}

async function fetchCustomerWorkspace() {
  const [jobResponse, quotationResponse, categoryResponse, addressResponse, paymentResponse] = await Promise.all([
    api.get('/quotations/jobs/?role=customer'),
    api.get('/quotations/?role=customer'),
    api.get('/categories/'),
    api.get('/profiles/addresses/'),
    api.get('/payments/'),
  ])
  return {
    jobs: collection(jobResponse),
    quotations: collection(quotationResponse),
    categories: collection(categoryResponse),
    addresses: collection(addressResponse),
    payments: collection(paymentResponse),
  }
}

async function fetchWorkerWorkspace() {
  const [jobResponse, quotationResponse, paymentResponse] = await Promise.all([
    api.get('/quotations/jobs/?role=worker'),
    api.get('/quotations/?role=worker'),
    api.get('/payments/'),
  ])
  return {
    jobs: collection(jobResponse),
    quotations: collection(quotationResponse),
    payments: collection(paymentResponse),
  }
}

function Money({ amount }) {
  return <>₹{Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</>
}

function WorkspaceHeading({ title, description, role }) {
  return (
    <header className="dashboard-header">
      <span className="dashboard-icon"><FileText size={22} /></span>
      <div>
        <span className="section-kicker">Quotations & Agreements</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="text-link" to="/dashboard"><ArrowLeft size={15} /> Back to dashboard</Link>
        <Link className="text-link" to={role === 'worker' ? '/worker/projects' : '/customer/projects'}>
          <BriefcaseBusiness size={15} /> Project workspace
        </Link>
      </div>
    </header>
  )
}

function CustomerWorkBreakdown({ job, onChanged }) {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const breakdown = job.work_breakdown
  const editable = job.work_breakdown_editable && (!breakdown || breakdown.status === 'draft')

  async function submitTask(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const formData = new FormData(formElement)
    setBusy(true)
    try {
      await api.post('/workbreakdowns/tasks/', {
        breakdown_id: breakdown.id,
        title: formData.get('title'),
        description: formData.get('description'),
        estimated_days: formData.get('estimated_days') || null,
      })
      formElement.reset()
      showToast('Task added to the proposed work breakdown.')
      await onChanged()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function updateTask(event, task) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await api.patch(`/workbreakdowns/tasks/${task.id}/`, {
        title: formData.get('title'),
        description: formData.get('description'),
        estimated_days: formData.get('estimated_days') || null,
      })
      showToast('Work breakdown task updated.')
      await onChanged()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Remove "${task.title}" from this work breakdown?`)) return
    setBusy(true)
    try {
      await api.delete(`/workbreakdowns/tasks/${task.id}/`)
      showToast('Task removed from the proposed work breakdown.')
      await onChanged()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function postAction(action) {
    setBusy(true)
    try {
      const path = `/workbreakdowns/jobs/${job.id}/${action === 'approve' ? 'approve' : 'suggest'}/`
      await api.post(path)
      showToast(action === 'approve' ? 'Work breakdown approved and locked.' : 'Task suggestions generated.')
      await onChanged()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="worker-reply-box" aria-label="Work breakdown">
      <div className="panel-heading">
        <div>
          <strong><ClipboardList size={16} /> Work breakdown</strong>
          <p>
            {breakdown
              ? `${breakdown.status === 'approved' ? 'Approved' : 'Draft'} · revision ${breakdown.approved_revision || breakdown.revision_number}`
              : 'No task breakdown yet. Generate editable suggestions from this job.'}
          </p>
        </div>
        {editable && (!breakdown || breakdown.tasks.length === 0) && (
          <button type="button" className="button button-outline button-small" disabled={busy} onClick={() => postAction('suggest')}>
            {breakdown ? 'Generate suggestions' : 'Suggest tasks'}
          </button>
        )}
      </div>
      {breakdown?.tasks.map((task) => (
        <article className="booking-card" key={task.id}>
          {editable ? (
            <form className="dashboard-form" onSubmit={(event) => updateTask(event, task)}>
              <div className="form-grid three-columns">
                <label className="form-field"><span>Task title</span><input name="title" defaultValue={task.title} maxLength="180" required /></label>
                <label className="form-field"><span>Description</span><input name="description" defaultValue={task.description} /></label>
                <label className="form-field"><span>Estimated days</span><input name="estimated_days" type="number" min="1" max="365" defaultValue={task.estimated_days || ''} /></label>
              </div>
              <div className="booking-actions-right">
                <button type="submit" className="button button-outline button-small" disabled={busy}>Save task</button>
                <button type="button" className="button button-outline danger-outline button-small" disabled={busy} onClick={() => deleteTask(task)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </form>
          ) : (
            <>
              <strong>{task.title}</strong>
              {task.description && <p>{task.description}</p>}
              {task.estimated_days && <span className="muted-copy">{task.estimated_days} estimated days</span>}
            </>
          )}
        </article>
      ))}
      {breakdown && editable && (
        <>
          <form className="dashboard-form" onSubmit={submitTask}>
            <div className="form-grid three-columns">
              <label className="form-field"><span>New task</span><input name="title" maxLength="180" required /></label>
              <label className="form-field"><span>Description</span><input name="description" /></label>
              <label className="form-field"><span>Estimated days</span><input name="estimated_days" type="number" min="1" max="365" /></label>
            </div>
            <button type="submit" className="button button-outline button-small" disabled={busy}>
              <Plus size={14} /> Add task
            </button>
          </form>
          {breakdown.tasks.length > 0 && (
            <button type="button" className="button button-primary button-small" disabled={busy} onClick={() => postAction('approve')}>
              <CheckCircle2 size={14} /> Approve task scope
            </button>
          )}
        </>
      )}
      {breakdown && !editable && job.status !== 'open' && breakdown.status !== 'approved' && (
        <p className="muted-copy">This draft is locked because quotations have started.</p>
      )}
      {breakdown?.revisions?.length > 0 && (
        <details>
          <summary>Revision history ({breakdown.revisions.length})</summary>
          {breakdown.revisions.map((revision) => (
            <p className="booking-notes" key={revision.id}>
              Revision {revision.revision_number} · {revision.created_by_name}
              {revision.is_approved ? ' · approved' : ''}
            </p>
          ))}
        </details>
      )}
    </section>
  )
}

export function CustomerQuotationsPage() {
  const { showToast } = useToast()
  const [jobs, setJobs] = useState([])
  const [quotations, setQuotations] = useState([])
  const [categories, setCategories] = useState([])
  const [addresses, setAddresses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [agreements, setAgreements] = useState({})
  const [counteringId, setCounteringId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentBusyId, setPaymentBusyId] = useState(null)
  const [priceEstimate, setPriceEstimate] = useState(null)
  const [priceEstimateLoading, setPriceEstimateLoading] = useState(false)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const form = useForm({
    defaultValues: {
      category_id: '',
      service_id: '',
      address_id: '',
      title: '',
      description: '',
      budget_min: '',
      budget_max: '',
      preferred_date: '',
    },
  })
  const counterForm = useForm({ defaultValues: { amount: '', message: '', estimated_days: '' } })
  const selectedCategory = useWatch({ control: form.control, name: 'category_id' })
  const selectedService = useWatch({ control: form.control, name: 'service_id' })
  const selectedServices = categories.find((category) => String(category.id) === String(selectedCategory))?.services || []
  const priceEstimateKey = `${selectedCategory || ''}:${selectedService || ''}`

  async function reload() {
    try {
      const workspace = await fetchCustomerWorkspace()
      setJobs(workspace.jobs)
      setQuotations(workspace.quotations)
      setCategories(workspace.categories)
      setAddresses(workspace.addresses)
      setPayments(workspace.payments)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchCustomerWorkspace()
      .then((workspace) => {
        if (!active) return
        setJobs(workspace.jobs)
        setQuotations(workspace.quotations)
        setCategories(workspace.categories)
        setAddresses(workspace.addresses)
        setPayments(workspace.payments)
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function createJob(values) {
    setSubmitting(true)
    form.clearErrors('root')
    const payload = {
      category_id: Number(values.category_id),
      title: values.title.trim(),
      description: values.description.trim(),
    }
    if (values.service_id) payload.service_id = Number(values.service_id)
    if (values.address_id) payload.address_id = Number(values.address_id)
    if (values.budget_min !== '') payload.budget_min = values.budget_min
    if (values.budget_max !== '') payload.budget_max = values.budget_max
    if (values.preferred_date) payload.preferred_date = values.preferred_date
    try {
      await api.post('/quotations/jobs/', payload)
      form.reset()
      showToast('Job request published for worker quotations.')
      await reload()
    } catch (requestError) {
      form.setError('root', { message: getApiError(requestError) })
    } finally {
      setSubmitting(false)
    }
  }

  async function loadPriceEstimate() {
    if (!selectedCategory) return
    setPriceEstimateLoading(true)
    try {
      const params = new URLSearchParams({ category_id: selectedCategory })
      if (selectedService) params.set('service_id', selectedService)
      const { data } = await api.get(`/pricing/estimate/?${params.toString()}`)
      setPriceEstimate({ key: priceEstimateKey, data })
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    } finally {
      setPriceEstimateLoading(false)
    }
  }

  async function cancelJob(job) {
    if (!window.confirm(`Cancel "${job.title}" and close its pending quotations?`)) return
    try {
      await api.post(`/quotations/jobs/${job.id}/cancel/`)
      showToast('Job request cancelled.')
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function acceptQuotation(quotation) {
    try {
      const { data } = await api.post(`/quotations/${quotation.id}/accept/`)
      setAgreements((current) => ({ ...current, [quotation.id]: data }))
      showToast('Quotation accepted and agreement recorded.')
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function payAgreement(agreement) {
    setPaymentBusyId(agreement.id)
    try {
      const { data } = await api.post(
        '/payments/checkout/',
        { agreement_id: agreement.id },
        { headers: { 'Idempotency-Key': window.crypto.randomUUID() } },
      )
      await loadRazorpayCheckout()
      const checkout = new window.Razorpay({
        key: data.key_id,
        amount: data.order.amount,
        currency: data.order.currency,
        order_id: data.order.id,
        name: 'KaamConnect',
        description: `Accepted agreement #${agreement.id}`,
        handler: async (result) => {
          try {
            const verification = await api.post('/payments/verify/', result)
            showToast(
              verification.data.payment.status === 'succeeded'
                ? 'Payment verified by Razorpay.'
                : 'Payment is awaiting provider capture.',
            )
            await reload()
          } catch (requestError) {
            showToast(getApiError(requestError), 'error')
          }
        },
        modal: {
          ondismiss: () => setPaymentBusyId(null),
        },
      })
      checkout.on('payment.failed', () => {
        showToast('Razorpay reported a failed payment attempt.', 'error')
        reload()
      })
      checkout.open()
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    } finally {
      setPaymentBusyId(null)
    }
  }

  async function declineQuotation(quotation) {
    if (!window.confirm('Decline this quotation?')) return
    try {
      await api.post(`/quotations/${quotation.id}/decline/`)
      showToast('Quotation declined.')
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function sendCounterOffer(values) {
    const quotation = quotations.find((item) => item.id === counteringId)
    if (!quotation) return
    try {
      await api.post(`/quotations/${quotation.id}/counter/`, {
        amount: values.amount,
        message: values.message || '',
        estimated_days: values.estimated_days ? Number(values.estimated_days) : null,
      })
      counterForm.reset()
      setCounteringId(null)
      showToast('Counter-offer sent to the worker.')
      await reload()
    } catch (requestError) {
      counterForm.setError('root', { message: getApiError(requestError) })
    }
  }

  const quotationsFor = (job) => quotations.filter((quotation) => quotation.job_request === job.id)

  return (
    <div className="dashboard-page">
      <div className="container dashboard-container">
        <WorkspaceHeading
          title="Your job requests"
          description="Publish a job, compare worker quotations, negotiate terms, and accept a written agreement."
          role="customer"
        />
        {error && <div className="form-alert dashboard-alert" role="alert">{error}</div>}

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>Post a job</h2>
              <p>Worker discovery never exposes your saved address to other workers.</p>
            </div>
          </div>
          <form className="dashboard-form" onSubmit={form.handleSubmit(createJob)}>
            {form.formState.errors.root && <div className="form-alert" role="alert">{form.formState.errors.root.message}</div>}
            <div className="form-grid two-columns">
              <label className="form-field">
                <span>Service category</span>
                <select {...form.register('category_id', {
                  required: 'Choose a category.',
                  onChange: () => {
                    form.setValue('service_id', '')
                    setPriceEstimate(null)
                  },
                })}>
                  <option value="">Choose category</option>
                  {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
                {form.formState.errors.category_id && <span className="field-error">{form.formState.errors.category_id.message}</span>}
              </label>
              <label className="form-field">
                <span>Specific service <small>(optional)</small></span>
                <select disabled={!selectedCategory} {...form.register('service_id')}>
                  <option value="">Choose service</option>
                  {selectedServices.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}
                </select>
              </label>
            </div>
            <label className="form-field">
              <span>Job title</span>
              <input maxLength="180" {...form.register('title', { required: 'Enter a short job title.' })} />
              {form.formState.errors.title && <span className="field-error">{form.formState.errors.title.message}</span>}
            </label>
            <label className="form-field">
              <span>Describe the work</span>
              <textarea rows="4" {...form.register('description', { required: 'Describe the work you need.' })} />
              {form.formState.errors.description && <span className="field-error">{form.formState.errors.description.message}</span>}
            </label>
            <div className="form-grid three-columns">
              <label className="form-field">
                <span>Minimum budget (₹, optional)</span>
                <input type="number" min="0" step="0.01" {...form.register('budget_min')} />
              </label>
              <label className="form-field">
                <span>Maximum budget (₹, optional)</span>
                <input type="number" min="0" step="0.01" {...form.register('budget_max')} />
              </label>
              <label className="form-field">
                <span>Preferred date <small>(optional)</small></span>
                <input type="date" min={today} {...form.register('preferred_date')} />
              </label>
            </div>
            <label className="form-field">
              <span>Service address <small>(optional)</small></span>
              <select {...form.register('address_id')}>
                <option value="">Share after choosing a worker</option>
                {addresses.map((address) => (
                  <option value={address.id} key={address.id}>
                    {address.label} · {address.locality}, {address.city}
                  </option>
                ))}
              </select>
            </label>
            <section className="worker-reply-box" aria-label="Optional price guidance">
              <strong>Optional price guidance</strong>
              <p>Compare current worker-listed prices. This is not a guaranteed quote or completed-transaction data.</p>
              <button
                type="button"
                className="button button-outline button-small"
                disabled={!selectedCategory || priceEstimateLoading}
                onClick={loadPriceEstimate}
              >
                {priceEstimateLoading ? 'Checking listings…' : 'Show price guidance'}
              </button>
              {priceEstimate?.key === priceEstimateKey && (
                <div className="booking-card-list">
                  {priceEstimate.data.estimates.length === 0 ? (
                    <p className="muted-copy">There are not enough comparable active worker listings to show a price range.</p>
                  ) : priceEstimate.data.estimates.map((estimate) => (
                    <article className="booking-card" key={estimate.pricing_type}>
                      <strong>{estimate.pricing_type_label} listings · {estimate.sample_size} providers</strong>
                      <p>
                        Indicative middle range: ₹{Number(estimate.middle_range.low).toLocaleString('en-IN')}
                        {' – '}₹{Number(estimate.middle_range.high).toLocaleString('en-IN')}
                        {' · '}median ₹{Number(estimate.median).toLocaleString('en-IN')}
                      </p>
                      <span className="muted-copy">
                        Confidence: {estimate.confidence} · {estimate.range_method}
                      </span>
                    </article>
                  ))}
                  {priceEstimate.data.limitations.map((limitation) => (
                    <p className="muted-copy" key={limitation}>{limitation}</p>
                  ))}
                </div>
              )}
            </section>
            <button type="submit" className="button button-primary" disabled={submitting}>
              <Send size={16} /> {submitting ? 'Publishing…' : 'Publish job request'}
            </button>
          </form>
        </section>

        {loading ? <div className="skeleton dashboard-skeleton" /> : jobs.length === 0 ? (
          <div className="empty-state"><BriefcaseBusiness size={30} /><strong>No job requests yet</strong><span>Post a job above to receive worker quotations.</span></div>
        ) : jobs.map((job) => (
          <section className="dashboard-panel" key={job.id}>
            <div className="panel-heading">
              <div>
                <h2>{job.title}</h2>
                <p>{job.category_name}{job.service_name ? ` · ${job.service_name}` : ''} · {job.status.replace('_', ' ')}</p>
              </div>
              {['open', 'in_review'].includes(job.status) && (
                <button type="button" className="button button-outline button-small" onClick={() => cancelJob(job)}>Cancel request</button>
              )}
            </div>
            <p>{job.description}</p>
            <p className="muted-copy">
              Budget: {job.budget_min == null && job.budget_max == null ? 'Not specified' : `${job.budget_min == null ? '—' : `₹${job.budget_min}`} – ${job.budget_max == null ? '—' : `₹${job.budget_max}`}`}
              {job.preferred_date ? ` · Preferred date ${job.preferred_date}` : ''}
            </p>
            <CustomerWorkBreakdown job={job} onChanged={reload} />
            <div className="booking-card-list">
              {quotationsFor(job).map((quotation) => {
                const hasPendingRevision = quotation.revisions.some((revision) => revision.status === 'pending')
                const agreement = agreements[quotation.id] || quotation.agreement
                return (
                  <article className="booking-card" key={quotation.id}>
                    <div className="booking-card-header">
                      <div>
                        <span className="booking-id">Quotation #{quotation.id}</span>
                        <h3>{quotation.worker.full_name} · <Money amount={quotation.amount} /></h3>
                        <p>{quotation.estimated_days ? `${quotation.estimated_days} estimated days` : 'Duration not specified'} · {quotation.status}</p>
                      </div>
                    </div>
                    {quotation.message && <p>{quotation.message}</p>}
                    {quotation.revisions.map((revision) => (
                      <p className="booking-notes" key={revision.id}>
                        {revision.proposed_by_name} proposed ₹{Number(revision.amount).toLocaleString('en-IN')} · {revision.status}
                        {revision.message ? ` — ${revision.message}` : ''}
                      </p>
                    ))}
                    {quotation.status === 'pending' && (
                      <>
                        <div className="booking-actions-right">
                          <button type="button" className="button button-primary button-small" disabled={hasPendingRevision} onClick={() => acceptQuotation(quotation)}>
                            <CheckCircle2 size={15} /> Accept & create agreement
                          </button>
                          <button type="button" className="button button-outline danger-outline button-small" onClick={() => declineQuotation(quotation)}>
                            <XCircle size={15} /> Decline
                          </button>
                          <button
                            type="button"
                            className="button button-outline button-small"
                            disabled={hasPendingRevision}
                            onClick={() => {
                              setCounteringId(quotation.id)
                              counterForm.reset({ amount: quotation.amount, message: '', estimated_days: quotation.estimated_days || '' })
                            }}
                          >
                            Negotiate
                          </button>
                        </div>
                        {counteringId === quotation.id && (
                          <form className="dashboard-form" onSubmit={counterForm.handleSubmit(sendCounterOffer)}>
                            {counterForm.formState.errors.root && <div className="form-alert" role="alert">{counterForm.formState.errors.root.message}</div>}
                            <div className="form-grid three-columns">
                              <label className="form-field"><span>Counter amount (₹)</span><input type="number" min="0.01" step="0.01" {...counterForm.register('amount', { required: 'Enter an amount.', min: 0.01 })} /></label>
                              <label className="form-field"><span>Estimated days</span><input type="number" min="1" max="365" {...counterForm.register('estimated_days')} /></label>
                              <label className="form-field"><span>Message</span><input maxLength="5000" {...counterForm.register('message')} /></label>
                            </div>
                            <button type="submit" className="button button-primary button-small">Send counter-offer</button>
                            <button type="button" className="button button-outline button-small" onClick={() => setCounteringId(null)}>Close</button>
                          </form>
                        )}
                      </>
                    )}
                    {agreement && (
                      <div className="worker-reply-box">
                        <strong>Accepted agreement #{agreement.id}</strong>
                        <p>Agreed scope and terms are saved as a read-only snapshot for ₹{agreement.terms_snapshot.amount}.</p>
                      {(() => {
                        const agreementPayment = payments.find((payment) => payment.agreement === agreement.id)
                        return (
                          <div>
                            {agreementPayment && <p>Payment status: {agreementPayment.status}</p>}
                            {(!agreementPayment || agreementPayment.status === 'failed') && (
                              <button
                                type="button"
                                className="button button-primary button-small"
                                disabled={paymentBusyId === agreement.id}
                                onClick={() => payAgreement(agreement)}
                              >
                                {paymentBusyId === agreement.id ? 'Opening checkout…' : 'Pay securely with Razorpay'}
                              </button>
                            )}
                            {agreementPayment && ['created', 'pending'].includes(agreementPayment.status) && (
                              <button
                                type="button"
                                className="button button-outline button-small"
                                disabled={paymentBusyId === agreement.id}
                                onClick={() => payAgreement(agreement)}
                              >
                                Continue payment
                              </button>
                            )}
                          </div>
                        )
                      })()}
                        {agreement.scope_snapshot.service_location && (
                          <p>
                            Service location: {agreement.scope_snapshot.service_location.address_line1}, {
                              agreement.scope_snapshot.service_location.locality
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
              {quotationsFor(job).length === 0 && <div className="empty-state compact-empty"><strong>No quotations yet</strong><span>Workers will appear here as they respond.</span></div>}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export function WorkerQuotationsPage() {
  const { showToast } = useToast()
  const [jobs, setJobs] = useState([])
  const [quotations, setQuotations] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeJobId, setActiveJobId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ defaultValues: { amount: '', message: '', estimated_days: '' } })
  const reviseForm = useForm({ defaultValues: { amount: '', message: '', estimated_days: '' } })
  const [revisingId, setRevisingId] = useState(null)

  async function reload() {
    try {
      const workspace = await fetchWorkerWorkspace()
      setJobs(workspace.jobs)
      setQuotations(workspace.quotations)
      setPayments(workspace.payments)
    } catch (requestError) {
      setError(getApiError(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchWorkerWorkspace()
      .then((workspace) => {
        if (!active) return
        setJobs(workspace.jobs)
        setQuotations(workspace.quotations)
        setPayments(workspace.payments)
      })
      .catch((requestError) => { if (active) setError(getApiError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function sendQuotation(values) {
    setSubmitting(true)
    form.clearErrors('root')
    try {
      await api.post('/quotations/', {
        job_request_id: activeJobId,
        amount: values.amount,
        message: values.message || '',
        estimated_days: values.estimated_days ? Number(values.estimated_days) : null,
      })
      form.reset()
      setActiveJobId(null)
      showToast('Quotation submitted.')
      await reload()
    } catch (requestError) {
      form.setError('root', { message: getApiError(requestError) })
    } finally {
      setSubmitting(false)
    }
  }

  async function respondToCounter(quotation, revision, decision) {
    try {
      await api.post(`/quotations/${quotation.id}/respond-counter/`, {
        revision_id: revision.id,
        decision,
        response_message: decision === 'accept' ? 'Agreed to the counter-offer.' : 'Unable to accept these terms.',
      })
      showToast(decision === 'accept' ? 'Counter-offer accepted; the customer can now accept the quotation.' : 'Counter-offer declined.')
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  async function reviseQuotation(values) {
    const quotation = quotations.find((item) => item.id === revisingId)
    if (!quotation) return
    try {
      await api.post(`/quotations/${quotation.id}/revise/`, {
        amount: values.amount,
        message: values.message || '',
        estimated_days: values.estimated_days ? Number(values.estimated_days) : null,
      })
      reviseForm.reset()
      setRevisingId(null)
      showToast('Quotation revision sent to the customer.')
      await reload()
    } catch (requestError) {
      reviseForm.setError('root', { message: getApiError(requestError) })
    }
  }

  async function withdraw(quotation) {
    if (!window.confirm('Withdraw this quotation?')) return
    try {
      await api.post(`/quotations/${quotation.id}/withdraw/`)
      showToast('Quotation withdrawn.')
      await reload()
    } catch (requestError) {
      showToast(getApiError(requestError), 'error')
    }
  }

  return (
    <div className="dashboard-page">
      <div className="container dashboard-container">
        <WorkspaceHeading
          title="Find work & send quotations"
          description="Review open customer jobs, submit clear pricing, and respond to counter-offers."
          role="worker"
        />
        {error && <div className="form-alert dashboard-alert" role="alert">{error}</div>}
        <section className="dashboard-panel">
          <div className="panel-heading"><div><h2>Open jobs</h2><p>Customer addresses remain private until a separate agreement workflow authorizes sharing.</p></div></div>
          {loading ? <div className="skeleton dashboard-skeleton" /> : jobs.length === 0 ? (
            <div className="empty-state"><BriefcaseBusiness size={30} /><strong>No open jobs right now</strong><span>Check back later for new local work.</span></div>
          ) : jobs.map((job) => {
            const existing = quotations.some((quotation) => quotation.job_request === job.id)
            return (
              <article className="booking-card" key={job.id}>
                <div className="booking-card-header">
                  <div><span className="booking-id">{job.category_name}{job.service_name ? ` · ${job.service_name}` : ''}</span><h3>{job.title}</h3></div>
                  <span className="booking-status-badge status-pending">{job.status.replace('_', ' ')}</span>
                </div>
                <p>{job.description}</p>
                {job.work_breakdown?.status === 'approved' && (
                  <div className="worker-reply-box">
                    <strong>Customer-approved task scope · revision {job.work_breakdown.approved_revision}</strong>
                    <ul>
                      {job.work_breakdown.tasks.map((task) => <li key={`${task.sort_order}-${task.title}`}>{task.title}</li>)}
                    </ul>
                  </div>
                )}
                <p className="muted-copy">
                  Budget: {job.budget_min == null && job.budget_max == null ? 'Not specified' : `${job.budget_min == null ? '—' : `₹${job.budget_min}`} – ${job.budget_max == null ? '—' : `₹${job.budget_max}`}`}
                  {job.preferred_date ? ` · Preferred ${job.preferred_date}` : ''}
                </p>
                {existing ? <span className="muted-copy">You already submitted a quotation for this job.</span> : (
                  <button type="button" className="button button-primary button-small" onClick={() => {
                    setActiveJobId(job.id)
                    form.reset({ amount: '', message: '', estimated_days: '' })
                  }}>
                    <Send size={15} /> Submit quotation
                  </button>
                )}
                {activeJobId === job.id && (
                  <form className="dashboard-form" onSubmit={form.handleSubmit(sendQuotation)}>
                    {form.formState.errors.root && <div className="form-alert" role="alert">{form.formState.errors.root.message}</div>}
                    <div className="form-grid three-columns">
                      <label className="form-field"><span>Total price (₹)</span><input type="number" min="0.01" step="0.01" {...form.register('amount', { required: 'Enter your total price.', min: { value: 0.01, message: 'Price must be positive.' } })} />{form.formState.errors.amount && <span className="field-error">{form.formState.errors.amount.message}</span>}</label>
                      <label className="form-field"><span>Estimated days</span><input type="number" min="1" max="365" {...form.register('estimated_days')} /></label>
                      <label className="form-field"><span>Quotation details</span><input maxLength="5000" {...form.register('message')} /></label>
                    </div>
                    <button className="button button-primary button-small" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Send quotation'}</button>
                    <button className="button button-outline button-small" type="button" onClick={() => setActiveJobId(null)}>Cancel</button>
                  </form>
                )}
              </article>
            )
          })}
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading"><div><h2>Your quotations</h2><p>Track customer responses and keep negotiation terms transparent.</p></div></div>
          {quotations.length === 0 ? <div className="empty-state compact-empty"><strong>No quotations submitted</strong><span>Choose an open job above to send your first quotation.</span></div> : (
            <div className="booking-card-list">
              {quotations.map((quotation) => (
                <article className="booking-card" key={quotation.id}>
                  <div className="booking-card-header">
                    <div><span className="booking-id">Quotation #{quotation.id} · {quotation.status}</span><h3>{quotation.job.title} · ₹{Number(quotation.amount).toLocaleString('en-IN')}</h3></div>
                  </div>
                  <p>{quotation.job.description}</p>
                  {quotation.revisions.map((revision) => (
                    <div className="booking-notes" key={revision.id}>
                      <p>{revision.proposed_by_name} proposed ₹{Number(revision.amount).toLocaleString('en-IN')} · {revision.status}{revision.message ? ` — ${revision.message}` : ''}</p>
                      {revision.status === 'pending' && (
                        <div className="booking-actions-right">
                          <button type="button" className="button button-primary button-small" onClick={() => respondToCounter(quotation, revision, 'accept')}><CheckCircle2 size={14} /> Accept counter</button>
                          <button type="button" className="button button-outline button-small" onClick={() => respondToCounter(quotation, revision, 'reject')}><XCircle size={14} /> Decline counter</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {quotation.agreement && (
                    <div className="worker-reply-box">
                      <strong>Agreement accepted · ₹{quotation.agreement.terms_snapshot.amount}</strong>
                      {payments.find((payment) => payment.agreement === quotation.agreement.id) && (
                        <p>
                          Payment status: {
                            payments.find((payment) => payment.agreement === quotation.agreement.id).status
                          }
                        </p>
                      )}
                      {quotation.agreement.scope_snapshot.service_location && (
                        <p>
                          Service location: {quotation.agreement.scope_snapshot.service_location.address_line1}, {
                            quotation.agreement.scope_snapshot.service_location.locality
                          }
                        </p>
                      )}
                    </div>
                  )}
                  {quotation.status === 'pending' && (
                    <div className="booking-actions-right">
                      <button type="button" className="button button-outline button-small" onClick={() => {
                        setRevisingId(quotation.id)
                        reviseForm.reset({ amount: quotation.amount, message: quotation.message, estimated_days: quotation.estimated_days || '' })
                      }}>Revise quotation</button>
                      <button type="button" className="button button-outline danger-outline button-small" onClick={() => withdraw(quotation)}>Withdraw</button>
                    </div>
                  )}
                  {revisingId === quotation.id && (
                    <form className="dashboard-form" onSubmit={reviseForm.handleSubmit(reviseQuotation)}>
                      {reviseForm.formState.errors.root && <div className="form-alert" role="alert">{reviseForm.formState.errors.root.message}</div>}
                      <div className="form-grid three-columns">
                        <label className="form-field"><span>Updated price (₹)</span><input type="number" min="0.01" step="0.01" {...reviseForm.register('amount', { required: 'Enter your updated price.', min: 0.01 })} /></label>
                        <label className="form-field"><span>Estimated days</span><input type="number" min="1" max="365" {...reviseForm.register('estimated_days')} /></label>
                        <label className="form-field"><span>Details</span><input maxLength="5000" {...reviseForm.register('message')} /></label>
                      </div>
                      <button type="submit" className="button button-primary button-small">Send revision</button>
                      <button type="button" className="button button-outline button-small" onClick={() => setRevisingId(null)}>Cancel</button>
                    </form>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default CustomerQuotationsPage

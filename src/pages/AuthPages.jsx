import { useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import { getApiError } from '../services/api'
import { dashboardPathForUser } from '../utils/authRouting.js'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-decoration"><span /><span /><span /></div>
      <section className="auth-card">
        <Link className="brand auth-brand" to="/">
          <span className="brand-mark"><BriefcaseBusiness size={19} /></span>
          <span>kaam<span>connect</span></span>
        </Link>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
        <div className="auth-footer">{footer}</div>
        <div className="auth-safe"><ShieldCheck size={15} /> Your account details are protected.</div>
      </section>
    </div>
  )
}

function PasswordInput({ register, name, label, error, autoComplete, options }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="form-field">
      <span>{label}</span>
      <span className="password-field">
        <input type={visible ? 'text' : 'password'} autoComplete={autoComplete} {...register(name, options)} />
        <button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((state) => !state)}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  if (user) return <Navigate to={dashboardPathForUser(user)} replace />

  async function onSubmit(values) {
    setSubmitting(true)
    setServerError('')
    try {
      const currentUser = await login(values)
      showToast(`Welcome back, ${currentUser.full_name.split(' ')[0]}.`)
      navigate(location.state?.from || dashboardPathForUser(currentUser), { replace: true })
    } catch (error) {
      setServerError(getApiError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to find local professionals and manage your account."
      footer={<>New to KaamConnect? <Link to="/register">Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <div className="form-alert" role="alert">{serverError}</div>}
        <label className="form-field">
          <span>Email address</span>
          <input type="email" autoComplete="email" placeholder="you@example.com" {...register('email', { required: 'Enter your email address.' })} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>
        <PasswordInput register={register} name="password" label="Password" autoComplete="current-password" error={errors.password?.message} options={{ required: 'Enter your password.' }} />
        <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'} {!submitting && <ArrowRight size={17} />}
        </button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { user, register: createAccount } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    defaultValues: { account_type: searchParams.get('worker') === 'true' ? 'worker' : 'customer' },
  })

  if (user) return <Navigate to={dashboardPathForUser(user)} replace />

  async function onSubmit(values) {
    setSubmitting(true)
    setServerError('')
    try {
      const currentUser = await createAccount(values)
      showToast('Your account is ready.')
      navigate(currentUser.is_worker ? '/worker/dashboard' : '/dashboard', { replace: true })
    } catch (error) {
      setServerError(getApiError(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for finding help and growing your local work."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <div className="form-alert" role="alert">{serverError}</div>}
        <label className="form-field">
          <span>Full name</span>
          <input autoComplete="name" placeholder="Your name" {...register('full_name', { required: 'Enter your name.', maxLength: { value: 150, message: 'Keep your name under 150 characters.' } })} />
          {errors.full_name && <span className="field-error">{errors.full_name.message}</span>}
        </label>
        <label className="form-field">
          <span>Username</span>
          <input autoComplete="username" placeholder="Choose a username" {...register('username', {
            required: 'Choose a username.',
            minLength: { value: 3, message: 'Use at least 3 characters.' },
            maxLength: { value: 30, message: 'Keep your username under 30 characters.' },
            pattern: { value: /^[A-Za-z0-9._-]+$/, message: 'Use letters, numbers, dots, underscores or hyphens.' },
          })} />
          {errors.username && <span className="field-error">{errors.username.message}</span>}
        </label>
        <label className="form-field">
          <span>Email address</span>
          <input type="email" autoComplete="email" placeholder="you@example.com" {...register('email', { required: 'Enter your email address.' })} />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>
        <label className="form-field">
          <span>Phone number</span>
          <input type="tel" autoComplete="tel" placeholder="10-digit mobile number" {...register('phone', { required: 'Enter your phone number.', minLength: { value: 10, message: 'Enter a valid phone number.' }, maxLength: { value: 15, message: 'Enter a valid phone number.' } })} />
          {errors.phone && <span className="field-error">{errors.phone.message}</span>}
        </label>
        <PasswordInput
          register={register}
          name="password"
          label="Create password"
          autoComplete="new-password"
          error={errors.password?.message}
          options={{ required: 'Create a password.', minLength: { value: 8, message: 'Use at least 8 characters.' } }}
        />
        <PasswordInput
          register={register}
          name="password2"
          label="Confirm password"
          autoComplete="new-password"
          error={errors.password2?.message}
          options={{ required: 'Confirm your password.', validate: (value) => value === getValues('password') || 'Passwords do not match.' }}
        />
        <label className="form-field">
          <span>How will you use KaamConnect?</span>
          <select {...register('account_type', { required: 'Choose an account type.' })}>
            <option value="customer">Customer</option>
            <option value="worker">Worker</option>
            <option value="both">Customer + Worker</option>
          </select>
          {errors.account_type && <span className="field-error">{errors.account_type.message}</span>}
        </label>
        <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'} {!submitting && <ArrowRight size={17} />}
        </button>
      </form>
    </AuthShell>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api, apiErrorMessage } from '../../api/client'
import catalogUrl from '../../assets/product-catalog.png'
import { ErrorState, Field } from '../../components/ui'
import { useAuth } from '../../store/AuthContext'
import type { ApiResponse, User } from '../../types/api'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must have at least 2 characters'),
    email: z.email('Enter a valid email'),
    password: z
      .string()
      .min(10, 'Use at least 10 characters')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[0-9]/, 'Include a number')
      .regex(/[^A-Za-z0-9]/, 'Include a symbol'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>

export function LoginPage() {
  const { user, setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (user) return <Navigate to="/products" replace />
  const submit = async (values: LoginValues) => {
    setError('')
    try {
      const response = await api.post<
        ApiResponse<{ user: User; accessToken: string }>
      >('/auth/login', values)
      setSession(response.data.data.accessToken, response.data.data.user)
      const from = (location.state as { from?: string } | null)?.from ?? '/products'
      navigate(from, { replace: true })
    } catch (submitError) {
      setError(apiErrorMessage(submitError))
    }
  }
  return (
    <AuthPanel
      title="Welcome back"
      detail="Sign in to continue with checkout and order history."
      alternative={<span>New here? <Link to="/register">Create an account</Link></span>}
    >
      <form onSubmit={handleSubmit(submit)} className="form-stack">
        {error ? <ErrorState message={error} /> : null}
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <button className="primary-button full" disabled={isSubmitting}>
          <LockKeyhole size={17} /> {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </AuthPanel>
  )
}

export function RegisterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  if (user) return <Navigate to="/products" replace />

  const submit = async ({ confirmPassword: _confirm, ...values }: RegisterValues) => {
    void _confirm
    setError('')
    try {
      await api.post('/auth/register', values)
      navigate('/login', { replace: true })
    } catch (submitError) {
      setError(apiErrorMessage(submitError))
    }
  }
  return (
    <AuthPanel
      title="Create your account"
      detail="Register to place orders and track verified payments."
      alternative={<span>Already registered? <Link to="/login">Sign in</Link></span>}
    >
      <form onSubmit={handleSubmit(submit)} className="form-stack">
        {error ? <ErrorState message={error} /> : null}
        <Field label="Full name" error={errors.name?.message}>
          <input autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <input type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        <button className="primary-button full" disabled={isSubmitting}>
          <UserRound size={17} /> {isSubmitting ? 'Creating...' : 'Create account'}
        </button>
      </form>
    </AuthPanel>
  )
}

function AuthPanel({
  title,
  detail,
  alternative,
  children,
}: {
  title: string
  detail: string
  alternative: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      <section className="auth-form-panel">
        <div className="auth-heading">
          <span className="eyebrow">Raco account</span>
          <h1>{title}</h1>
          <p>{detail}</p>
        </div>
        {children}
        <div className="auth-alternative">{alternative} <ArrowRight size={15} /></div>
      </section>
      <div className="auth-image" style={{ backgroundImage: `url(${catalogUrl})` }} />
    </div>
  )
}

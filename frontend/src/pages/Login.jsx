import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'

const Login = ({ onAuthenticated }) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const email = event.target.email.value
    const password = event.target.password.value

    setStatus('loading')
    setError('')
    try {
      const response = await axios.post(
        'http://localhost:3000/api/auth/login',
        { email, password },
        { withCredentials: true }
      )
      onAuthenticated(response.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'The circle could not be reached. Is the server running?')
      setStatus('error')
    }
  }

  const loading = status === 'loading'

  return (
    <AuthLayout
      mode="login"
      eyebrow="The circle awaits"
      title="Log in"
      description="Return to the dark. Your conversations never left."
      footerText="No pact yet?"
      footerLabel="Create an account"
      footerTo="/register"
      status={status}
      error={error}
    >
      <form className="hx-form" onSubmit={handleSubmit} onChange={() => status === 'error' && setStatus('idle')}>
        <label htmlFor="login-email">
          Email
          <input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label htmlFor="login-password">
          Password
          <input id="login-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        </label>
        <button className="hx-button" type="submit" disabled={loading}>
          <span>{loading ? 'Summoning…' : 'Log in'}</span>
        </button>
      </form>
    </AuthLayout>
  )
}

export default Login

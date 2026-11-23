import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'

const Register = ({ onAuthenticated }) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const email = event.target.email.value
    const password = event.target.password.value
    const firstName = event.target.firstName.value
    const lastName = event.target.lastName.value

    setStatus('loading')
    setError('')
    try {
      const response = await axios.post(
        'http://localhost:3000/api/auth/register',
        { fullName: { firstName, lastName }, email, password },
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
      mode="register"
      eyebrow="Bind your soul"
      title="Create account"
      description="A few details and the pact is sealed."
      footerText="Already bound?"
      footerLabel="Log in"
      footerTo="/login"
      status={status}
      error={error}
    >
      <form className="hx-form" onSubmit={handleSubmit} onChange={() => status === 'error' && setStatus('idle')}>
        <div className="hx-name-row">
          <label htmlFor="register-first-name">
            First name
            <input id="register-first-name" name="firstName" type="text" placeholder="First name" autoComplete="given-name" required />
          </label>
          <label htmlFor="register-last-name">
            Last name
            <input id="register-last-name" name="lastName" type="text" placeholder="Last name" autoComplete="family-name" required />
          </label>
        </div>
        <label htmlFor="register-email">
          Email
          <input id="register-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label htmlFor="register-password">
          Password
          <input id="register-password" name="password" type="password" placeholder="Create a password" autoComplete="new-password" required />
        </label>
        <button className="hx-button" type="submit" disabled={loading}>
          <span>{loading ? 'Sealing the pact…' : 'Create account'}</span>
        </button>
      </form>
    </AuthLayout>
  )
}

export default Register

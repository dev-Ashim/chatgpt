import AuthLayout from '../components/AuthLayout'

const Register = () => {
  return (
    <AuthLayout
      eyebrow="Join ChatSpace"
      title="Create your account"
      description="A few details and you are ready to connect."
      footerText="Already have an account?"
      footerLabel="Log in"
      footerTo="/login"
    >
      <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
        <div className="form-name-row">
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
        <button className="button" type="submit">Create account</button>
      </form>
    </AuthLayout>
  )
}

export default Register
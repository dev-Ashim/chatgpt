import AuthLayout from '../components/AuthLayout'
import axios from 'axios'



const Login = () => {
    const handleSubmit = async (event) => {
  event.preventDefault();

  const email = event.target.email.value;
  const password = event.target.password.value;

  try {
    const response = await axios.post(
      "http://localhost:3000/api/auth/login",
      { email, password },
      { withCredentials: true }
    );

    console.log(response.data);
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
};
  return (

      
   
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in"
      description="Enter your details to pick up where you left off."
      footerText="New to ChatSpace?"
      footerLabel="Create an account"
      footerTo="/register"
    >
         <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">
          Email
          <input id="login-email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label htmlFor="login-password">
          Password
          <input id="login-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
        </label>
        <button className="button" type="submit">Log in</button>
      </form>
    </AuthLayout>
  )
}

export default Login
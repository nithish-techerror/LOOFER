
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Login_page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/api/users/login/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('Login Success:', data);

        alert('Login successful!');

        // Email + password correct
        navigate('/home');
      } else {
        console.log('Login Failed:', data);

        alert(data.message || 'Invalid email or password');

        // Stay on login page
      }
    } catch (error) {
      console.error('Error:', error);

      alert('Django server connect aagala');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <h1>Login</h1>

        <form
          className="login-form"
          onSubmit={handleLogin}
        >
          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />
          </div>

          <button type="submit">
            Login
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login_page;


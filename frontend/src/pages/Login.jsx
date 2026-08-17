import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Film, Clapperboard, LogIn, UserPlus, AlertCircle, CheckCircle2, Key, User, Mail } from 'lucide-react';

const Login = ({ defaultRegister = false }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(defaultRegister);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const result = await register(username.trim(), password, email.trim());
        if (result.success) {
          setSuccessMessage(result.message || 'Registration successful. Please sign in with your credentials.');
          setIsRegisterMode(false);
          setPassword('');
          setError('');
        } else {
          setError(result.error);
        }
      } else {
        const result = await login(username.trim(), password);
        if (result.success) {
          navigate('/watchlist');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (demoUsername) => {
    setUsername(demoUsername);
    setPassword('password123');
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Clapperboard size={32} className="auth-icon" />
          </div>
          <h1 className="auth-title">Watchlist App</h1>
          <p className="auth-subtitle">
            Track, rate, and discover your favorite movies and TV shows
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(false);
              setError('');
              setSuccessMessage('');
            }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(true);
              setError('');
              setSuccessMessage('');
            }}
          >
            <UserPlus size={16} />
            <span>Register</span>
          </button>
        </div>

        {error && (
          <div className="alert-box error" role="alert">
            <AlertCircle size={18} className="alert-icon" />
            <div className="alert-message">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="alert-box success" role="alert">
            <CheckCircle2 size={18} className="alert-icon" />
            <div className="alert-message">{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-icon-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="email">Email (Optional)</label>
              <div className="input-icon-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrapper">
              <Key size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-loading">
                <span className="mini-spinner"></span>
                {isRegisterMode ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="demo-accounts-box">
          <p className="demo-title">Quick Demo Users (Pre-seeded):</p>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleDemoLogin('alice')}
              title="Fill credentials for User A"
            >
              User A: <strong>alice</strong>
            </button>
            <button
              type="button"
              className="btn-demo"
              onClick={() => handleDemoLogin('bob')}
              title="Fill credentials for User B"
            >
              User B: <strong>bob</strong>
            </button>
          </div>
          <p className="demo-hint">Default password: <code>password123</code></p>
        </div>
      </div>
    </div>
  );
};

export default Login;

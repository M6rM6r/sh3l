import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { setUser } from '../store/slices/userSlice';
import { apiBaseUrl } from '../config/env';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #0d0d1a 0%, #1a0533 50%, #0d1a33 100%);
`;

const Card = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 32px;

  .brain-icon {
    font-size: 56px;
    display: block;
    margin-bottom: 8px;
  }

  h1 {
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, #7c3aed, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }

  p {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin: 4px 0 0;
  }
`;

const Title = styled.h2`
  text-align: center;
  font-size: 22px;
  color: #fff;
  margin: 0 0 28px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    font-weight: 500;
  }
`;

const Input = styled.input`
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    outline: none;
    border-color: #7c3aed;
    background: rgba(124, 58, 237, 0.08);
  }
`;

const Button = styled(motion.button)`
  margin-top: 8px;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.p`
  color: #f87171;
  font-size: 14px;
  text-align: center;
  margin: 0;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
`;

const PasswordHint = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  margin: 0;
`;

const Footer = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 20px 0 0;

  a {
    color: #7c3aed;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const API_URL = apiBaseUrl || 'http://localhost:8000';

const Register: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? 'Registration failed');
      }

      const data = await res.json();
      localStorage.setItem('authToken', data.access_token);

      dispatch(setUser({
        id: String(data.user_id ?? ''),
        username,
        email,
        cognitiveProfile: { memory: 50, speed: 50, attention: 50, flexibility: 50, problemSolving: 50 },
        isAuthenticated: true,
        streak: 0,
        totalSessions: 0,
      }));

      navigate('/onboarding', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Logo>
          <span className="brain-icon">🧠</span>
          <h1>YGY Brain</h1>
          <p>Your cognitive training journey starts here</p>
        </Logo>

        <Title>Create an account</Title>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMsg>{error}</ErrorMsg>}

          <InputGroup>
            <label htmlFor="username">Username</label>
            <Input
              id="username"
              type="text"
              placeholder="choose a unique username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
            />
          </InputGroup>

          <InputGroup>
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </InputGroup>

          <InputGroup>
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <PasswordHint>At least 8 characters</PasswordHint>
          </InputGroup>

          <Button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? 'Creating account…' : 'Get Started'}
          </Button>
        </Form>

        <Footer>
          Already have an account? <Link to="/login">Sign in</Link>
        </Footer>
      </Card>
    </Container>
  );
};

export default Register;

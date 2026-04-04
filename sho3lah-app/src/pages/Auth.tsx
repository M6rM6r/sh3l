import styled from 'styled-components';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { loginSuccess, registerSuccess } from '../store/slices/authSlice';

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
`;

const AuthCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  
  .logo {
    text-align: center;
    margin-bottom: 30px;
    
    .flame {
      width: 60px;
      height: 80px;
      background: linear-gradient(to top, #ff6b35, #f7931e, #ffd700);
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      margin: 0 auto 15px;
      box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
    }
    
    h1 {
      font-size: 32px;
      color: #ffd700;
      font-weight: 800;
    }
  }
  
  h2 {
    text-align: center;
    margin-bottom: 30px;
    font-size: 22px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Input = styled.input`
  padding: 15px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 16px;
  font-family: inherit;
  
  &::placeholder {
    color: #a0a0a0;
  }
  
  &:focus {
    outline: none;
    border-color: #ff6b35;
  }
`;

const Button = styled.button`
  padding: 16px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 107, 53, 0.4);
  }
`;

const Toggle = styled.p`
  text-align: center;
  margin-top: 20px;
  color: #a0a0a0;
  
  button {
    background: none;
    border: none;
    color: #ffd700;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
    font-size: inherit;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Auth = () => {
  const dispatch = useDispatch();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock auth - in production this would call an API
    const mockUser = {
      id: '1',
      name: formData.name || formData.email.split('@')[0],
      email: formData.email,
    };
    
    if (isLogin) {
      dispatch(loginSuccess({ user: mockUser, token: 'mock-token' }));
    } else {
      dispatch(registerSuccess({ user: mockUser, token: 'mock-token' }));
    }
  };

  return (
    <AuthContainer>
      <AuthCard
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="logo">
          <div className="flame" />
          <h1>شعلة</h1>
        </div>
        
        <h2>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h2>
        
        <Form onSubmit={handleSubmit}>
          {!isLogin && (
            <Input
              type="text"
              placeholder="الاسم"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          )}
          <Input
            type="email"
            placeholder="البريد الإلكتروني"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="كلمة المرور"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Button type="submit">
            {isLogin ? 'دخول' : 'إنشاء'}
          </Button>
        </Form>
        
        <Toggle>
          {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'سجل الآن' : 'سجل الدخول'}
          </button>
        </Toggle>
      </AuthCard>
    </AuthContainer>
  );
};

export default Auth;

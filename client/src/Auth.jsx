import React, { useState } from 'react';
import axios from 'axios';
import { Wallet, ArrowRight, UserPlus, Lock } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/auth';

const Auth = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isRegister ? '/register' : '/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      
      // Save token and notify parent
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.token);
      
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden p-8">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-brand-500 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
            <Wallet className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">D/C Manager</h1>
          <p className="text-gray-500">Keep track of your debts & credits.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white focus:border-brand-500 outline-none transition-colors"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white focus:border-brand-500 outline-none transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white focus:border-brand-500 outline-none transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 mt-4"
          >
            {isRegister ? <UserPlus size={20} /> : <Lock size={20} />}
            {isRegister ? 'Create Account' : 'Login to Dashboard'}
          </button>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default Auth;
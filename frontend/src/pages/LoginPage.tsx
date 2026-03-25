import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, User, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, isLoading, error, clearError, registerSuccessMessage, clearRegisterMessage } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
    }
  };

  const toggleLoginMode = () => {
    setIsLogin(!isLogin);
    clearError();
    clearRegisterMessage();
    setName('');
    setEmail('');
    setPassword('');
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isLogin ? '欢迎回来' : '创建账户'}
            </h1>
            <p className="text-gray-500 mt-2">
              {isLogin ? '登录以继续使用' : '注册开始使用'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  姓名
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="请输入姓名"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="请输入邮箱"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {registerSuccessMessage && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                <CheckCircle size={20} />
                <span className="text-sm">{registerSuccessMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isLogin ? '登录中...' : '注册中...'}</span>
                </div>
              ) : (
                <span>{isLogin ? '登录' : '注册'}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={toggleLoginMode}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500">
              <p>提示：第一个注册的用户将自动成为管理员</p>
              <p className="mt-1">新注册用户需要管理员审核后才能登录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

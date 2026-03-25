import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Mail, Lock, Save, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUserProfile, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccess(false);

    if (password && password !== confirmPassword) {
      useAuthStore.setState({ error: '两次输入的密码不一致' });
      return;
    }

    try {
      const updateData: any = {};
      if (name !== user?.name) updateData.name = name;
      if (avatar !== user?.avatar) updateData.avatar = avatar;
      if (password) updateData.password = password;

      if (Object.keys(updateData).length > 0) {
        await updateUserProfile(updateData);
        setSuccess(true);
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-4 mb-8">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-500">{user.email}</p>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
              user.role === 'admin' 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {user.role === 'admin' ? '管理员' : '普通用户'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">邮箱不可修改</p>
          </div>

          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-2">
              头像 URL（可选）
            </label>
            <input
              id="avatar"
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入头像图片 URL"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">修改密码</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  新密码
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="留空则不修改密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  确认新密码
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="请再次输入新密码"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl">
              <Check size={20} />
              <span className="text-sm">个人信息更新成功！</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>保存更改</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

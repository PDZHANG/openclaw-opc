import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Users, Shield, User, AlertCircle, CheckCircle, XCircle, Loader2, Plus, Mail, Lock, UserPlus, Save, X, Clock } from 'lucide-react';
import { fetchAllUsers, updateUserRole, createUser, approveUser } from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Human } from '../types';

export default function UserManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const { data: users, isLoading } = useQuery('users', fetchAllUsers);

  const updateRoleMutation = useMutation(
    ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => updateUserRole(userId, role),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setError(null);
      },
      onError: (err: any) => {
        setError(err.message || '更新失败');
      }
    }
  );

  const createUserMutation = useMutation(
    ({ name, email, password, role }: { name: string; email: string; password: string; role: 'admin' | 'user' }) => 
      createUser(name, email, password, role),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setError(null);
        setShowCreateModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
      },
      onError: (err: any) => {
        setError(err.message || '创建用户失败');
      }
    }
  );

  const approveUserMutation = useMutation(
    ({ userId, isApproved }: { userId: string; isApproved: boolean }) => 
      approveUser(userId, isApproved),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        setError(null);
      },
      onError: (err: any) => {
        setError(err.message || '审核用户失败');
      }
    }
  );

  const handleUpdateRole = (userId: string, role: 'admin' | 'user') => {
    if (userId === user?.id) return;
    updateRoleMutation.mutate({ userId, role });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createUserMutation.mutate({ name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole });
  };

  const handleApproveUser = (userId: string, isApproved: boolean) => {
    approveUserMutation.mutate({ userId, isApproved });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">用户管理</h1>
              <p className="text-sm text-gray-500">管理所有用户和权限设置</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>创建用户</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={40} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {users?.map((u: Human) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white font-medium text-lg">
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{u.name}</h3>
                      {u.id === user?.id && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          当前用户
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {u.role === 'admin' ? (
                      <>
                        <Shield size={16} className="text-amber-600" />
                        <span className="text-amber-700">管理员</span>
                      </>
                    ) : (
                      <>
                        <User size={16} className="text-gray-600" />
                        <span className="text-gray-700">普通用户</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {u.isApproved ? (
                      <>
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-green-700">已审核</span>
                      </>
                    ) : (
                      <>
                        <Clock size={16} className="text-yellow-600" />
                        <span className="text-yellow-700">待审核</span>
                      </>
                    )}
                  </div>
                  {u.id !== user?.id && (
                    <>
                      <button
                        onClick={() => handleApproveUser(u.id, !u.isApproved)}
                        disabled={approveUserMutation.isLoading}
                        className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={u.isApproved ? '取消审核' : '通过审核'}
                      >
                        {u.isApproved ? (
                          <XCircle size={18} className="text-gray-500 hover:text-red-500" />
                        ) : (
                          <CheckCircle size={18} className="text-gray-500 hover:text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleUpdateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                        disabled={updateRoleMutation.isLoading}
                        className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={u.role === 'admin' ? '降级为普通用户' : '升级为管理员'}
                      >
                        {u.role === 'admin' ? (
                          <XCircle size={18} className="text-gray-500 hover:text-red-500" />
                        ) : (
                          <CheckCircle size={18} className="text-gray-500 hover:text-green-500" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserPlus size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">创建新用户</h2>
                  <p className="text-sm text-gray-500">添加一个新的系统用户</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label htmlFor="newUserName" className="block text-sm font-medium text-gray-700 mb-2">
                  姓名
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="newUserName"
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="请输入姓名"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="newUserEmail"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="请输入邮箱"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="newUserPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="newUserPassword"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="请输入密码"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="newUserRole" className="block text-sm font-medium text-gray-700 mb-2">
                  角色
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={newUserRole === 'user'}
                      onChange={() => setNewUserRole('user')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">普通用户</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={newUserRole === 'admin'}
                      onChange={() => setNewUserRole('admin')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">管理员</span>
                  </label>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createUserMutation.isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>创建中...</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>创建用户</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

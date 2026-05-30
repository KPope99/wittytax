import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

interface ManagedUser {
  id: string;
  email: string;
  companyName: string;
  role: string;
  group: string;
  createdAt: string;
}

function token() {
  return localStorage.getItem('auth_token') || '';
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`,
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Request failed' };
    return { success: true, data };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await apiRequest<{ users: ManagedUser[] }>('/admin/users');
    if (res.success && res.data) {
      setUsers(res.data.users);
    } else {
      setError(res.error || 'Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUser = async (id: string, field: 'role' | 'group', value: string) => {
    setUpdating(id + field);
    setError('');
    setSuccess('');
    const res = await apiRequest<{ user: ManagedUser }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value }),
    });
    if (res.success && res.data) {
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data!.user : u)));
      setSuccess(`${field === 'group' ? 'Group' : 'Role'} updated successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res.error || 'Update failed');
    }
    setUpdating(null);
  };

  const badgeClass = (val: string) => {
    if (val === 'premium') return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    if (val === 'admin') return 'bg-purple-100 text-purple-800 border border-purple-300';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">User Management</h3>
          <p className="text-xs text-gray-500 mt-0.5">Assign Premium group access or Admin roles</p>
        </div>
        <button onClick={loadUsers} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading users...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Group</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-3 px-3">
                    <div className="font-medium text-gray-800">{u.companyName}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(u.group)}`}>
                        {u.group}
                      </span>
                      <select
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white disabled:opacity-50"
                        value={u.group}
                        disabled={updating === u.id + 'group'}
                        onChange={(e) => updateUser(u.id, 'group', e.target.value)}
                      >
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass(u.role)}`}>
                        {u.role}
                      </span>
                      <select
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white disabled:opacity-50"
                        value={u.role}
                        disabled={updating === u.id + 'role'}
                        onChange={(e) => updateUser(u.id, 'role', e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

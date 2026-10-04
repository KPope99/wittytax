import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

interface Entitlement {
  id: string;
  partnerId: string;
  matchType: string;
  matchValue: string;
  grantedGroup: string;
  validFrom: string;
  validUntil: string;
  status: string;
  createdAt: string;
}

interface IngestResult {
  batchId: string;
  processed: number;
  errors: { row: number; reason: string }[];
  reconciliation: { checked: number; granted: number };
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

const statusBadgeClass = (status: string) => {
  if (status === 'active') return 'bg-green-100 text-green-800 border border-green-300';
  if (status === 'revoked') return 'bg-red-100 text-red-700 border border-red-300';
  return 'bg-gray-100 text-gray-600 border border-gray-200'; // expired
};

const PartnerEntitlements: React.FC = () => {
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ingest form
  const [partnerId, setPartnerId] = useState('');
  const [validityYears, setValidityYears] = useState(3);
  const [matchType, setMatchType] = useState<'email' | 'company_reg_number' | 'loan_account_number'>('email');
  const [bulkValues, setBulkValues] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [lastIngest, setLastIngest] = useState<IngestResult | null>(null);

  // Filter + row-level actions
  const [partnerFilter, setPartnerFilter] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<'reconcile' | 'expire' | null>(null);

  const loadEntitlements = useCallback(async () => {
    setLoading(true);
    setError('');
    const query = partnerFilter ? `?partnerId=${encodeURIComponent(partnerFilter)}` : '';
    const res = await apiRequest<{ entitlements: Entitlement[] }>(`/admin/entitlements${query}`);
    if (res.success && res.data) {
      setEntitlements(res.data.entitlements);
    } else {
      setError(res.error || 'Failed to load entitlements');
    }
    setLoading(false);
  }, [partnerFilter]);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

  const flash = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleIngest = async () => {
    setError('');
    const entries = bulkValues
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((matchValue) => ({ matchType, matchValue }));

    if (!partnerId.trim()) {
      setError('Partner ID is required (e.g. "BOI")');
      return;
    }
    if (entries.length === 0) {
      setError('Enter at least one identifier, one per line');
      return;
    }

    setIngesting(true);
    const res = await apiRequest<IngestResult>('/admin/entitlements/ingest', {
      method: 'POST',
      body: JSON.stringify({ partnerId: partnerId.trim(), entries, validityYears }),
    });
    setIngesting(false);

    if (res.success && res.data) {
      setLastIngest(res.data);
      setBulkValues('');
      flash(
        `Ingested ${res.data.processed} ${res.data.processed === 1 ? 'entry' : 'entries'} — ` +
        `${res.data.reconciliation.granted} existing user${res.data.reconciliation.granted === 1 ? '' : 's'} upgraded immediately`
      );
      loadEntitlements();
    } else {
      setError(res.error || 'Ingest failed');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this entitlement? Any user currently granted access through it will be downgraded immediately.')) {
      return;
    }
    setRevokingId(id);
    setError('');
    const res = await apiRequest<{ downgradedUsers: number }>(`/admin/entitlements/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Revoked via admin panel' }),
    });
    setRevokingId(null);
    if (res.success && res.data) {
      flash(`Revoked — ${res.data.downgradedUsers} user${res.data.downgradedUsers === 1 ? '' : 's'} downgraded`);
      loadEntitlements();
    } else {
      setError(res.error || 'Revoke failed');
    }
  };

  const runJob = async (job: 'reconcile' | 'expire') => {
    setRunningJob(job);
    setError('');
    const endpoint = job === 'reconcile' ? '/admin/entitlements/reconcile' : '/admin/entitlements/expire-check';
    const res = await apiRequest<{ checked?: number; granted?: number; expiredEntitlements?: number; downgradedUsers?: number }>(endpoint, {
      method: 'POST',
    });
    setRunningJob(null);
    if (res.success && res.data) {
      if (job === 'reconcile') {
        flash(`Reconcile complete — checked ${res.data.checked}, granted ${res.data.granted}`);
      } else {
        flash(`Expiry check complete — ${res.data.expiredEntitlements} expired, ${res.data.downgradedUsers} downgraded`);
      }
      loadEntitlements();
    } else {
      setError(res.error || 'Job failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-800">Partner Entitlements</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Grant premium access to a partner's members (e.g. a bank's SME loan clients) — existing accounts are upgraded
          immediately, and anyone who signs up later with a matching identifier is upgraded automatically.
        </p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      {/* Ingest form */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-700">Add a Partner List</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Partner ID</label>
            <input
              type="text"
              placeholder="e.g. BOI"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Match Type</label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as typeof matchType)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="email">Email</option>
              <option value="company_reg_number">Company Reg. Number</option>
              <option value="loan_account_number">Loan Account Number</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Validity (years)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={validityYears}
              onChange={(e) => setValidityYears(Number(e.target.value) || 1)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Identifiers — one per line
          </label>
          <textarea
            rows={5}
            placeholder={'business1@example.com\nbusiness2@example.com'}
            value={bulkValues}
            onChange={(e) => setBulkValues(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleIngest}
          disabled={ingesting}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ingesting ? 'Ingesting…' : 'Ingest List'}
        </button>

        {lastIngest && lastIngest.errors.length > 0 && (
          <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            {lastIngest.errors.length} row{lastIngest.errors.length === 1 ? '' : 's'} skipped:{' '}
            {lastIngest.errors.map((e) => `Row ${e.row + 1}: ${e.reason}`).join('; ')}
          </div>
        )}
      </div>

      {/* Manual job triggers */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => runJob('reconcile')}
          disabled={runningJob !== null}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {runningJob === 'reconcile' ? 'Running…' : 'Run Reconcile Now'}
        </button>
        <button
          onClick={() => runJob('expire')}
          disabled={runningJob !== null}
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {runningJob === 'expire' ? 'Running…' : 'Run Expiry Check Now'}
        </button>
        <span className="text-xs text-gray-400">(Expiry also runs automatically every 6 hours)</span>
      </div>

      {/* Entitlements table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">Entitlements</h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by Partner ID..."
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button onClick={loadEntitlements} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading entitlements...</div>
        ) : entitlements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No entitlements yet — add a partner list above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Identifier</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid Until</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entitlements.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-800">{e.partnerId}</td>
                    <td className="py-3 px-3">
                      <div className="text-gray-800">{e.matchValue}</div>
                      <div className="text-xs text-gray-400">{e.matchType}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500">
                      {new Date(e.validUntil).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {e.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(e.id)}
                          disabled={revokingId === e.id}
                          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                        >
                          {revokingId === e.id ? 'Revoking…' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerEntitlements;

import { useState, type FormEvent } from 'react';
import { Rocket, ChevronDown, Save, X, Check } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';

const NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function ProfileSelector() {
  const profiles = useLabStore((s) => s.profiles);
  const services = useLabStore((s) => s.services);
  const activeProfile = useLabStore((s) => s.activeProfile);
  const sendCommand = useLabStore((s) => s.sendCommand);

  const profileEntries = Object.entries(profiles);
  const [selected, setSelected] = useState(profileEntries[0]?.[0] || '');
  const [mode, setMode] = useState<'list' | 'save'>('list');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const runningIds = [...services.values()]
    .filter((s) => s.state === 'running')
    .map((s) => s.id);
  const canSave = runningIds.length > 0;

  if (profileEntries.length === 0 && !canSave) return null;

  const handleLaunch = () => {
    if (selected) {
      sendCommand({ type: 'START_PROFILE', payload: { profile: selected } });
    }
  };

  const openSaveForm = () => {
    setName('');
    setDescription('');
    setError(null);
    setMode('save');
  };

  const closeSaveForm = () => {
    setMode('list');
    setError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!NAME_PATTERN.test(name)) {
      setError('Name must be 1–64 chars: letters, digits, hyphen, underscore');
      return;
    }
    if (profiles[name] && !window.confirm(`Profile "${name}" already exists. Overwrite?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
          services: runningIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }
      setSelected(name);
      closeSaveForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'save') {
    return (
      <form
        onSubmit={handleSave}
        className="flex items-center gap-2 bg-bg/50 p-1 rounded-lg border border-border"
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="profile-name"
          maxLength={64}
          className="bg-surface-raised border border-border rounded-md px-3 py-1.5 type-label text-text outline-none focus:border-brand-blue/50 transition-colors min-w-[160px] font-mono"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="description (optional)"
          maxLength={200}
          className="bg-surface-raised border border-border rounded-md px-3 py-1.5 type-label text-text outline-none focus:border-brand-blue/50 transition-colors min-w-[200px]"
        />
        <span className="type-label text-text-dim px-1">
          {runningIds.length} running
        </span>
        {error && (
          <span className="type-label text-state-error px-2" role="alert">
            {error}
          </span>
        )}
        <button
          type="submit"
          disabled={submitting || !name}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-blue text-bg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold"
        >
          <Check className="h-3.5 w-3.5" />
          <span className="type-nav">SAVE</span>
        </button>
        <button
          type="button"
          onClick={closeSaveForm}
          disabled={submitting}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-text-dim hover:text-text hover:bg-surface-raised transition-colors"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-bg/50 p-1 rounded-lg border border-border">
      {profileEntries.length > 0 && (
        <>
          <div className="relative flex items-center">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="appearance-none bg-surface-raised border border-border rounded-md px-3 py-1.5 pr-8 type-label text-text outline-none focus:border-brand-blue/50 transition-colors cursor-pointer min-w-[140px]"
            >
              {profileEntries.map(([profileName, profile]) => (
                <option key={profileName} value={profileName}>
                  {profileName.toUpperCase()} ({profile.services.length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-text-dim pointer-events-none" />
          </div>

          <button
            onClick={handleLaunch}
            disabled={activeProfile === selected}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all font-bold ${
              activeProfile === selected
                ? 'bg-state-running/20 text-state-running border border-state-running/30 cursor-default'
                : 'bg-brand-blue text-bg hover:brightness-110 shadow-lg shadow-brand-blue/10 active:scale-95'
            }`}
          >
            <Rocket className={`h-4 w-4 ${activeProfile === selected ? '' : 'animate-pulse'}`} />
            <span className="type-nav">LAUNCH</span>
          </button>
        </>
      )}

      <button
        onClick={openSaveForm}
        disabled={!canSave}
        title={canSave ? `Save ${runningIds.length} running service(s) as a profile` : 'No services running'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-text-dim hover:text-text hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Save running as profile"
      >
        <Save className="h-4 w-4" />
        <span className="type-nav">SAVE</span>
      </button>
    </div>
  );
}

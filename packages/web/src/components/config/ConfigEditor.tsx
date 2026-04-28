import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ChevronRight, Activity, Terminal, ShieldAlert, LayoutDashboard, Settings, X } from 'lucide-react';
import { useLabStore } from '@/store/useLabStore';
import type { Config, ServiceConfig } from '@bridge/shared';

export function ConfigEditor() {
  const config = useLabStore((s) => s.config);
  const setError = useLabStore((s) => s.setError);
  const [localConfig, setLocalConfig] = useState<Config | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(config)));
    }
  }, [config]);

  if (!localConfig) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="type-label text-text-dim animate-pulse">LOADING CONFIGURATION...</div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save configuration');
      }
      
      // Success will be handled by the CONFIG_RELOADED event via WebSocket
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateService = (id: string, updates: Partial<ServiceConfig>) => {
    setLocalConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        services: {
          ...prev.services,
          [id]: { ...prev.services[id], ...updates },
        },
      };
    });
  };

  const addService = () => {
    const newId = `service-${Date.now()}`;
    const newService: ServiceConfig = {
      name: 'New Service',
      cwd: './',
      command: 'node',
      args: ['index.js'],
      healthCheck: {
        url: 'http://localhost:8080/health',
        intervalMs: 5000,
        timeoutMs: 3000,
      },
      ports: { main: 8080 },
      env: {},
      dependencies: [],
    };

    setLocalConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        services: {
          ...prev.services,
          [newId]: newService,
        },
      };
    });
    setSelectedServiceId(newId);
  };

  const deleteService = (id: string) => {
    if (!confirm(`Are you sure you want to delete service "${id}"?`)) return;
    
    setLocalConfig((prev) => {
      if (!prev) return null;
      const nextServices = { ...prev.services };
      delete nextServices[id];
      return { ...prev, services: nextServices };
    });
    if (selectedServiceId === id) setSelectedServiceId(null);
  };

  const selectedService = selectedServiceId ? localConfig.services[selectedServiceId] : null;

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* Sidebar: Service List */}
      <div className="flex w-64 flex-col border-r border-border bg-surface/30">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="type-subhead text-text uppercase">Services</h2>
          <button
            onClick={addService}
            className="p-1 hover:bg-surface-raised rounded-md text-brand-blue transition-colors"
            title="Add Service"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.entries(localConfig.services).map(([id, svc]) => (
            <button
              key={id}
              onClick={() => setSelectedServiceId(id)}
              className={`flex w-full items-center justify-between px-4 py-3 transition-colors border-b border-border/50 ${
                selectedServiceId === id ? 'bg-surface-raised border-l-2 border-l-brand-blue' : 'hover:bg-surface/50'
              }`}
            >
              <div className="flex flex-col items-start overflow-hidden">
                <span className={`type-label truncate ${selectedServiceId === id ? 'text-text' : 'text-text-dim'}`}>
                  {svc.name}
                </span>
                <span className="type-timestamp text-text-dim/60 truncate">{id}</span>
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${selectedServiceId === id ? 'text-brand-blue' : 'text-text-dim/30'}`} />
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue/10 border border-brand-blue/30 px-4 py-2.5 type-label text-brand-blue hover:bg-brand-blue/20 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>

      {/* Main Content: Editor Form */}
      <div className="flex-1 overflow-y-auto pr-6">
        {selectedService && selectedServiceId ? (
          <div className="max-w-3xl py-4 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Meta */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="type-breadcrumb text-brand-blue mb-1">SERVICE CONFIGURATION</div>
                <h3 className="type-heading text-text">{selectedService.name}</h3>
              </div>
              <button
                onClick={() => deleteService(selectedServiceId)}
                className="flex items-center gap-2 type-link text-state-crashed hover:bg-state-crashed/10 px-3 py-1.5 rounded-md border border-state-crashed/20 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                DELETE SERVICE
              </button>
            </div>

            {/* General Info */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 type-label text-text-muted border-b border-border/50 pb-2">
                <LayoutDashboard className="h-4 w-4" />
                GENERAL
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="type-tag text-text-dim block">SERVICE ID</label>
                  <input
                    type="text"
                    value={selectedServiceId}
                    disabled
                    className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 type-data text-text-dim opacity-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="type-tag text-text-dim block">DISPLAY NAME</label>
                  <input
                    type="text"
                    value={selectedService.name}
                    onChange={(e) => updateService(selectedServiceId, { name: e.target.value })}
                    className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors"
                  />
                </div>
              </div>
            </section>

            {/* Execution */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 type-label text-text-muted border-b border-border/50 pb-2">
                <Terminal className="h-4 w-4" />
                EXECUTION
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="type-tag text-text-dim block">WORKING DIRECTORY (CWD)</label>
                  <input
                    type="text"
                    value={selectedService.cwd}
                    onChange={(e) => updateService(selectedServiceId, { cwd: e.target.value })}
                    className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors font-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-1.5">
                    <label className="type-tag text-text-dim block">COMMAND</label>
                    <input
                      type="text"
                      value={selectedService.command}
                      onChange={(e) => updateService(selectedServiceId, { command: e.target.value })}
                      className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors font-mono"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="type-tag text-text-dim block">ARGUMENTS (SPACE SEPARATED)</label>
                    <input
                      type="text"
                      value={selectedService.args.join(' ')}
                      onChange={(e) => updateService(selectedServiceId, { args: e.target.value.split(/\s+/).filter(Boolean) })}
                      className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="type-tag text-text-dim block">READY PATTERN (REGEX)</label>
                  <input
                    type="text"
                    value={selectedService.readyPattern || ''}
                    onChange={(e) => updateService(selectedServiceId, { readyPattern: e.target.value })}
                    placeholder="e.g. Server started on port .*"
                    className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Health Check */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 type-label text-text-muted border-b border-border/50 pb-2">
                <Activity className="h-4 w-4" />
                HEALTH MONITOR
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="type-tag text-text-dim block">HEALTH CHECK URL</label>
                  <input
                    type="text"
                    value={selectedService.healthCheck.url}
                    onChange={(e) => updateService(selectedServiceId, { 
                      healthCheck: { ...selectedService.healthCheck, url: e.target.value } 
                    })}
                    className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="type-tag text-text-dim block">INTERVAL (MS)</label>
                    <input
                      type="number"
                      value={selectedService.healthCheck.intervalMs}
                      onChange={(e) => updateService(selectedServiceId, { 
                        healthCheck: { ...selectedService.healthCheck, intervalMs: parseInt(e.target.value) || 5000 } 
                      })}
                      className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="type-tag text-text-dim block">TIMEOUT (MS)</label>
                    <input
                      type="number"
                      value={selectedService.healthCheck.timeoutMs}
                      onChange={(e) => updateService(selectedServiceId, { 
                        healthCheck: { ...selectedService.healthCheck, timeoutMs: parseInt(e.target.value) || 3000 } 
                      })}
                      className="w-full bg-surface border border-border focus:border-brand-blue outline-none rounded-md px-3 py-2 type-data text-text transition-colors"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Networking & Deps */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 type-label text-text-muted border-b border-border/50 pb-2">
                <ShieldAlert className="h-4 w-4" />
                SYSTEM & DEPENDENCIES
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="type-tag text-text-dim block">DEPENDS ON</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-bg/50 border border-border rounded-md min-h-[42px]">
                    {Object.keys(localConfig.services).filter(id => id !== selectedServiceId).map(id => (
                      <button
                        key={id}
                        onClick={() => {
                          const deps = selectedService.dependencies.includes(id)
                            ? selectedService.dependencies.filter(d => d !== id)
                            : [...selectedService.dependencies, id];
                          updateService(selectedServiceId, { dependencies: deps });
                        }}
                        className={`type-tag px-2 py-0.5 rounded transition-all ${
                          selectedService.dependencies.includes(id)
                            ? 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
                            : 'bg-surface-raised text-text-dim border border-border hover:border-text-dim/50'
                        }`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="type-tag text-text-dim block">PORTS</label>
                    {Object.keys(selectedService.ports).length > 0 && (
                      <button
                        onClick={() => updateService(selectedServiceId, { ports: {} })}
                        className="type-link text-state-crashed hover:underline"
                      >
                        CLEAR ALL
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(selectedService.ports).map(([name, port]) => (
                      <div key={name} className="flex gap-2">
                        <input
                          type="text"
                          value={name}
                          disabled
                          className="w-1/3 bg-surface-raised border border-border rounded-md px-2 py-1 type-data text-text-dim opacity-50"
                        />
                        <input
                          type="number"
                          value={port}
                          onChange={(e) => updateService(selectedServiceId, {
                            ports: { ...selectedService.ports, [name]: parseInt(e.target.value) || 0 }
                          })}
                          className="flex-1 bg-surface border border-border rounded-md px-2 py-1 type-data text-text"
                        />
                        <button
                          onClick={() => {
                            const nextPorts = { ...selectedService.ports };
                            delete nextPorts[name];
                            updateService(selectedServiceId, { ports: nextPorts });
                          }}
                          className="p-1 text-text-dim hover:text-state-crashed transition-colors"
                          title="Remove Port"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const portName = prompt('Enter port name (e.g. http, api, ws):');
                        if (portName) {
                          updateService(selectedServiceId, {
                            ports: { ...selectedService.ports, [portName]: 8080 }
                          });
                        }
                      }}
                      className="flex items-center gap-1 type-link text-brand-blue hover:underline mt-1"
                    >
                      <Plus className="h-3 w-3" /> ADD PORT
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-surface-raised flex items-center justify-center border border-border shadow-inner">
              <Settings className="h-8 w-8 text-text-dim" />
            </div>
            <div>
              <h3 className="type-heading text-text">Configuration Editor</h3>
              <p className="type-body text-text-dim max-w-sm mt-2">
                Select a service from the list to modify its execution parameters, health checks, and dependencies.
              </p>
            </div>
            <button
              onClick={addService}
              className="type-link flex items-center gap-2 bg-brand-blue text-bg px-6 py-2 rounded-lg hover:brightness-110 transition-all font-bold"
            >
              <Plus className="h-4 w-4" />
              CREATE NEW SERVICE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import type { Config } from '@inferno-lab/shared';
import type { ProcessManager } from './process-manager.js';

export class Orchestrator {
  private config: Config;
  private processManager: ProcessManager;
  private activeProfile: string | null = null;

  constructor(config: Config, processManager: ProcessManager) {
    this.config = config;
    this.processManager = processManager;
  }

  getActiveProfile(): string | null {
    return this.activeProfile;
  }

  async startProfile(profileName: string): Promise<void> {
    const profile = this.config.profiles[profileName];
    if (!profile) throw new Error(`Unknown profile: ${profileName}`);

    const sorted = this.topoSort(profile.services);
    this.activeProfile = profileName;

    for (const id of sorted) {
      await this.processManager.start(id);
      await this.processManager.waitForReady(id);
    }
  }

  async stopProfile(profileName: string): Promise<void> {
    const profile = this.config.profiles[profileName];
    if (!profile) throw new Error(`Unknown profile: ${profileName}`);

    const sorted = this.topoSort(profile.services).reverse();
    for (const id of sorted) {
      await this.processManager.stop(id);
    }

    this.activeProfile = null;
  }

  /** Topological sort — dependencies come first. */
  private topoSort(serviceIds: string[]): string[] {
    const idSet = new Set(serviceIds);
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const svc = this.config.services[id];
      if (!svc) throw new Error(`Service "${id}" not found in config`);

      for (const dep of svc.dependencies) {
        if (!idSet.has(dep)) {
          throw new Error(
            `Service "${id}" depends on "${dep}" which is not in profile [${serviceIds.join(', ')}]`,
          );
        }
        visit(dep);
      }

      result.push(id);
    };

    for (const id of serviceIds) visit(id);
    return result;
  }
}

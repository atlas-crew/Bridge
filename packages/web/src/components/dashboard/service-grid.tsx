import { useLabStore } from '@/store/useLabStore';
import { ServiceCard } from './service-card';

export function ServiceGrid() {
  const services = useLabStore((s) => s.services);

  if (services.size === 0) {
    return (
      <div className="flex items-center justify-center py-16 type-body text-text-muted">
        No services configured
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...services.values()].map((svc) => (
        <ServiceCard key={svc.id} service={svc} />
      ))}
    </div>
  );
}

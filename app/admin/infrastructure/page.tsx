import { createZoneWithHub, updateZoneGeometry } from '@/app/admin/actions';
import { ZoneHexEditor } from '@/components/maps/zone-hex-editor';
import { fetchAdminOverview } from '@/lib/admin-ops';

export default async function InfrastructurePage() {
  const overview = await fetchAdminOverview();

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800/40 bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Infrastructure</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage delivery zones and hub locations. Each zone is a hexagonal service area.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Zone Map with interactive hex editor */}
        <section className="rounded-2xl border border-slate-800/50 bg-[#0a0f1a]/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/40">
            <h2 className="text-sm font-semibold text-slate-100">Zone Map</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a zone hexagon to select it, or drag the center marker to reposition. All {overview.zones.length} zones are shown.
            </p>
          </div>
          <div className="p-1">
            <ZoneHexEditor
              zones={overview.zones}
              hubs={overview.hubs}
              markers={overview.mapMarkers}
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Zone Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Zone Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Edit zone geometry, label, and hub position.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overview.zones.map((zone) => {
                const zoneHub = overview.hubs.find((h) => h.zoneId === zone.zoneId);
                const zoneDrones = overview.drones.filter((d) => d.currentHubId && zoneHub && d.currentHubId === zoneHub.hubId);
                const zoneSellers = overview.sellers.filter((s) => s.zoneId === zone.zoneId);

                return (
                  <form
                    key={zone.zoneId}
                    action={updateZoneGeometry}
                    className="rounded-xl border border-slate-800/40 bg-[#080d17] p-4 transition-all hover:border-slate-700/50 duration-200"
                  >
                    <input type="hidden" name="zoneId" value={zone.zoneId} />

                    {/* Zone header */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sm font-bold text-sky-400">
                          Z{zone.zoneId}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{zone.label}</div>
                          <div className="text-[11px] text-slate-500">
                            Hub {zone.hubId ?? 'pending'} · {(zone.radiusMeters / 1000).toFixed(1)} km radius
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-slate-500">{zoneDrones.length} 🚁</span>
                        <span className="text-[10px] text-slate-500">{zoneSellers.length} 🏪</span>
                      </div>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-600 mb-1">Label</label>
                        <input
                          name="label"
                          defaultValue={zone.label}
                          className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-600 mb-1">Center Lat</label>
                          <input
                            name="centerLat"
                            type="number"
                            step="0.0001"
                            defaultValue={zone.center.lat}
                            className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-600 mb-1">Center Lng</label>
                          <input
                            name="centerLng"
                            type="number"
                            step="0.0001"
                            defaultValue={zone.center.lng}
                            className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-600 mb-1">Radius (km)</label>
                        <input
                          name="radiusKm"
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="25"
                          defaultValue={(zone.radiusMeters / 1000).toFixed(1)}
                          className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-600 mb-1">Hub Lat</label>
                          <input
                            name="hubLat"
                            type="number"
                            step="0.0001"
                            defaultValue={zone.hubPosition?.lat ?? zone.center.lat}
                            className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-600 mb-1">Hub Lng</label>
                          <input
                            name="hubLng"
                            type="number"
                            step="0.0001"
                            defaultValue={zone.hubPosition?.lng ?? zone.center.lng}
                            className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <button className="mt-4 w-full rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-3 py-2.5 text-sm font-semibold text-white hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-500/15 active:scale-[0.98]">
                      Save Changes
                    </button>
                  </form>
                );
              })}
            </div>
          </section>

          {/* Create New Zone */}
          <section className="h-fit sticky top-8 space-y-6">
            <div className="rounded-2xl border border-slate-800/50 bg-[#0a0f1a]/60">
              <div className="px-5 py-4 border-b border-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-100">Create New Zone</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add a new hexagonal delivery zone with a hub.</p>
              </div>
              <form action={createZoneWithHub} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Zone Label</label>
                  <input
                    name="label"
                    required
                    placeholder="e.g. Gurgaon Sector 29"
                    className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Center Lat</label>
                    <input
                      name="centerLat"
                      type="number"
                      step="0.0001"
                      required
                      placeholder="28.4595"
                      className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Center Lng</label>
                    <input
                      name="centerLng"
                      type="number"
                      step="0.0001"
                      required
                      placeholder="77.0266"
                      className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Radius (km)</label>
                  <input
                    name="radiusKm"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="25"
                    defaultValue="5"
                    className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Hub Lat</label>
                    <input
                      name="hubLat"
                      type="number"
                      step="0.0001"
                      required
                      placeholder="Same as center"
                      className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Hub Lng</label>
                    <input
                      name="hubLng"
                      type="number"
                      step="0.0001"
                      required
                      placeholder="Same as center"
                      className="w-full rounded-lg border border-slate-700/50 bg-[#0c1220] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/15 active:scale-[0.98] mt-2">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Create Zone &amp; Hub
                  </span>
                </button>
              </form>
            </div>

            {/* Hub Summary */}
            <div className="rounded-2xl border border-slate-800/50 bg-[#0a0f1a]/60">
              <div className="px-5 py-4 border-b border-slate-800/40">
                <h2 className="text-sm font-semibold text-slate-100">Hub Summary</h2>
                <p className="text-xs text-slate-500 mt-0.5">{overview.hubs.length} hubs active</p>
              </div>
              <div className="divide-y divide-slate-800/30">
                {overview.hubs.map((hub) => {
                  const zone = overview.zones.find((z) => z.zoneId === hub.zoneId);
                  const droneCount = overview.drones.filter((d) => d.currentHubId === hub.hubId).length;
                  return (
                    <div key={hub.hubId} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-200">{hub.label}</div>
                        <div className="text-[11px] text-slate-500">
                          {zone?.label ?? `Zone ${hub.zoneId}`} · {droneCount} drones
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {hub.position.lat.toFixed(4)}, {hub.position.lng.toFixed(4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

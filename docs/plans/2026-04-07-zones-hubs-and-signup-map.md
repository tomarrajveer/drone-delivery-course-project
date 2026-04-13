# Zones, Hubs, and Signup Map Implementation Plan

> **For Hermes:** Execute this in small verified slices. No mystery meat changes.

**Goal:** Replace vague zone placeholders with 5 editable demo hex zones and matching hubs, move current sellers into valid zones, and switch signup to a map-first zone-aware flow.

**Architecture:** Keep the current schema. Store structured zone geometry metadata inside `zones.boundary_coordinates_ref` as JSON, keep hub coordinates in `hub_location_zone`, and expose edit actions from the admin page. Centralize geometry parsing/generation so seller/admin/signup views all use the same zone truth.

**Tech Stack:** Next.js app router, Supabase JS, React, Leaflet/react-leaflet.

---

## Slice 1: Fix current obvious issue
- Fix the admin page JSX quote lint failure.
- Re-run lint to confirm the known failure is gone before adding more surface area.

## Slice 2: Add shared zone geometry utilities
- Extend geo helpers with:
  - hexagon generation from center + radius
  - polygon containment check
  - safe parsing/serialization for zone metadata stored in `boundary_coordinates_ref`
- Support fallback parsing for old plain strings so existing rows don’t instantly explode.

## Slice 3: Add a live data seeding script
- Create a script that:
  - upserts 5 Delhi/NCR demo zones as 5 km hexagons
  - creates/updates 5 matching hubs
  - moves current sellers into valid demo-zone points
  - cleans the obviously bogus demo order coordinate so maps stop zooming to Mars
- Run it against the current Supabase project.

## Slice 4: Make zone data real in frontend/server helpers
- Update `fetchZones`, seller profile loading, admin overview loading, and seller map loading to use parsed zone metadata instead of vague derived circles whenever zone metadata exists.
- Keep fallback behavior for any older garbage rows.

## Slice 5: Make the map render real hexagons
- Update Leaflet map primitives to render polygons for zone boundaries.
- Keep route/marker behavior intact.

## Slice 6: Admin zone/hub management
- Add admin zone cards/forms with editable:
  - zone label
  - center lat/lng
  - radius km
  - hub lat/lng
- Save via server actions that rewrite zone JSON and hub point rows.
- Show the updated geometry immediately on the admin map.

## Slice 7: Signup map flow
- Replace raw latitude/longitude signup entry with a map picker.
- Detect which zone contains the chosen shop location.
- Show the detected zone to the user.
- Warn/block submit if the point falls outside every zone.

## Slice 8: Consistency pass for seller profile
- Reuse the same zone-detection logic for profile editing so a seller can’t save nonsense coordinates later.

## Slice 9: Verification
- Run:
  - `npm run lint`
  - `npm run build`
- Verify in browser:
  - `/admin` shows 5 zones + hubs on the map
  - admin edit updates zone/hub geometry
  - `/auth/register` allows map-based signup only inside zones
  - existing sellers load with valid zone labels and sane maps

## Notes
- Keep the schema unchanged unless absolutely forced; current environment has table access but not a comfy migration pipeline.
- Use JSON in `boundary_coordinates_ref` because the live DB is barebones and this is the least stupid way to move fast without lying.

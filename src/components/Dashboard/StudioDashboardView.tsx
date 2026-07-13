import type {
  Activity,
  Asset,
  Candidate,
  Capture,
  CreativeExecution,
  Identity,
  KnowledgeEntry,
  ObjectRef,
  PlannedTrack,
  Project,
  Relationship,
  Release,
  StudioResource,
} from "../../types";
import { findDiscoveries } from "../../hooks/discoveryEngine";
import { findOpportunities } from "../../hooks/opportunityEngine";
import { DISCOVERY_TYPE_META } from "../../hooks/discoveryEngine";
import { OPPORTUNITY_TYPE_META } from "../../hooks/opportunityEngine";
import { buildChiefObservations } from "../../hooks/chief";
import type { DiscoveryContext } from "../../hooks/relationshipDiscovery";
import { resolveObjectRef } from "../../hooks/relationshipDiscovery";
import { formatRelativeTime } from "../Activity/ActivityItem";
import "./Dashboard.css";

interface StudioDashboardViewProps {
  identity: Identity;
  identities: Identity[];
  projects: Project[];
  knowledgeEntries: KnowledgeEntry[];
  assets: Asset[];
  releases: Release[];
  captures: Capture[];
  relationships: Relationship[];
  activities: Activity[];
  plannedTracks: PlannedTrack[];
  candidates: Candidate[];
  executions: CreativeExecution[];
  studioResources: StudioResource[];
  onOpenObject: (ref: ObjectRef) => void;
  onOpenAlbumProduction: (projectId: string) => void;
  onOpenTrackWorkspace: (track: PlannedTrack) => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function StudioDashboardView({
  identity,
  identities,
  projects,
  knowledgeEntries,
  assets,
  releases,
  captures,
  relationships,
  activities,
  plannedTracks,
  candidates,
  executions,
  studioResources,
  onOpenObject,
  onOpenAlbumProduction,
  onOpenTrackWorkspace,
}: StudioDashboardViewProps) {
  const discoveryContext: DiscoveryContext = {
    identities,
    projects,
    knowledgeEntries,
    assets,
    releases,
    captures,
    relationships,
  };

  // ── Current Album ─────────────────────────────────────────────────────────
  // Most recently created Album project — the one most likely still active.
  const currentAlbum = [...projects]
    .filter((p) => p.type === "Album")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  const albumTracks = currentAlbum
    ? plannedTracks.filter((t) => t.projectId === currentAlbum.id)
    : [];

  const albumExecIds = new Set(
    currentAlbum
      ? executions.filter((e) => e.projectId === currentAlbum.id).map((e) => e.id)
      : [],
  );
  const albumCandidates = candidates.filter((c) => albumExecIds.has(c.executionId));
  const currentBestCount = albumCandidates.filter((c) => c.isCurrentBest).length;
  const albumVersionCount = albumCandidates.filter((c) => c.isAlbumVersion).length;

  // ── Continue Working ───────────────────────────────────────────────────────
  // Most recently created unfinished track — skips finished tracks so the
  // creator is always pointed at something still in progress.
  const lastTrack = [...plannedTracks]
    .filter((t) => !t.completedAt)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  const lastTrackProject = lastTrack
    ? (projects.find((p) => p.id === lastTrack.projectId) ?? null)
    : null;

  // ── Today's Progress ──────────────────────────────────────────────────────
  // Zero new logic — count existing data by whether it was created today.
  const todayResources = studioResources.filter((r) => isToday(r.createdAt)).length;
  const todayCandidates = candidates.filter((c) => isToday(c.createdAt)).length;
  const todayApproved = candidates.filter(
    (c) => c.status === "Approved" && isToday(c.createdAt),
  ).length;
  const todayExecutions = executions.filter((e) => isToday(e.createdAt)).length;
  const todayActivity = activities.filter((a) => isToday(a.timestamp));
  const hasAnyTodayProgress =
    todayResources > 0 || todayCandidates > 0 || todayApproved > 0 || todayExecutions > 0 || todayActivity.length > 0;

  // ── Chief's Recommendation ────────────────────────────────────────────────
  // Chief's own top observation — completely unmodified engine call.
  const chiefObservations = buildChiefObservations(
    findDiscoveries(discoveryContext),
    findOpportunities(discoveryContext),
  );
  const topObservation = chiefObservations[0] ?? null;

  // ── Recent Activity ───────────────────────────────────────────────────────
  const recentActivity = activities.slice(0, 5);

  return (
    <section className="section-view studio-dashboard">
      {/* Greeting */}
      <div className="dashboard-greeting">
        <h2 className="dashboard-greeting-text">
          {greeting()}, {identity.name}.
        </h2>
      </div>

      {/* Current Album */}
      {currentAlbum && (
        <div className="dashboard-card">
          <p className="dashboard-card-eyebrow">🎵 Current Album</p>
          <h3 className="dashboard-card-title">{currentAlbum.name}</h3>
          <div className="dashboard-card-stats">
            <span>{albumTracks.length} planned {albumTracks.length === 1 ? "track" : "tracks"}</span>
            {currentBestCount > 0 && (
              <span>{currentBestCount} current {currentBestCount === 1 ? "best" : "bests"}</span>
            )}
            {albumVersionCount > 0 && (
              <span>{albumVersionCount} album {albumVersionCount === 1 ? "version" : "versions"}</span>
            )}
          </div>
          <button
            className="dashboard-card-action"
            onClick={() => onOpenAlbumProduction(currentAlbum.id)}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Continue Working */}
      {lastTrack && (
        <div className="dashboard-card">
          <p className="dashboard-card-eyebrow">📍 Continue Working</p>
          <h3 className="dashboard-card-title">{lastTrack.title}</h3>
          {lastTrackProject && (
            <p className="dashboard-card-meta">{lastTrackProject.name}</p>
          )}
          <p className="dashboard-card-meta">
            Last active {formatRelativeTime(lastTrack.createdAt)}
          </p>
          <button
            className="dashboard-card-action"
            onClick={() => onOpenTrackWorkspace(lastTrack)}
          >
            Resume →
          </button>
        </div>
      )}

      {/* Today's Progress */}
      <div className="dashboard-card">
        <p className="dashboard-card-eyebrow">🟢 Today&apos;s Progress</p>
        {!hasAnyTodayProgress ? (
          <p className="dashboard-card-meta">A quiet day so far.</p>
        ) : (
          <ul className="dashboard-progress-list">
            {todayResources > 0 && (
              <li>Imported {todayResources} {todayResources === 1 ? "recording" : "recordings"}</li>
            )}
            {todayExecutions > 0 && (
              <li>Generated {todayExecutions} {todayExecutions === 1 ? "execution" : "executions"}</li>
            )}
            {todayCandidates > 0 && (
              <li>Added {todayCandidates} {todayCandidates === 1 ? "candidate" : "candidates"}</li>
            )}
            {todayApproved > 0 && (
              <li>Approved {todayApproved} {todayApproved === 1 ? "candidate" : "candidates"}</li>
            )}
            {todayActivity.map((a) => (
              <li key={a.id}>{a.title}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Chief's Recommendation */}
      {topObservation && (
        <div className="dashboard-card dashboard-card--chief">
          <p className="dashboard-card-eyebrow">💡 Chief&apos;s Recommendation</p>
          <p className="dashboard-card-body">
            {topObservation.kind === "discovery"
              ? topObservation.perspective.text
              : topObservation.text}
          </p>
          {(() => {
            const objects =
              topObservation.kind === "discovery"
                ? topObservation.discovery.objects
                : topObservation.opportunity.objects;
            return objects.slice(0, 2).map((ref) => {
              const resolved = resolveObjectRef(ref, discoveryContext);
              if (!resolved) return null;
              return (
                <button
                  key={`${ref.type}-${ref.id}`}
                  className="dashboard-object-link"
                  onClick={() => onOpenObject(ref)}
                >
                  {resolved.icon} {resolved.label} →
                </button>
              );
            });
          })()}
          {topObservation.kind === "discovery" && (
            <div className="dashboard-card-badge-row">
              <span className={`badge discovery-type-badge discovery-type-${topObservation.discovery.type}`}>
                {DISCOVERY_TYPE_META[topObservation.discovery.type].icon}{" "}
                {DISCOVERY_TYPE_META[topObservation.discovery.type].label}
              </span>
            </div>
          )}
          {topObservation.kind === "opportunity" && (
            <div className="dashboard-card-badge-row">
              <span className={`badge opportunity-type-badge opportunity-type-${topObservation.opportunity.type}`}>
                {OPPORTUNITY_TYPE_META[topObservation.opportunity.type].icon}{" "}
                {OPPORTUNITY_TYPE_META[topObservation.opportunity.type].label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="dashboard-card">
          <p className="dashboard-card-eyebrow">Recent Activity</p>
          <ul className="dashboard-activity-list">
            {recentActivity.map((activity) => {
              const ref: ObjectRef = {
                type: activity.relatedObjectType,
                id: activity.relatedObjectId,
              };
              const resolved =
                ref.type === "identity" ? null : resolveObjectRef(ref, discoveryContext);
              return (
                <li key={activity.id} className="dashboard-activity-item">
                  <span className="dashboard-activity-title">{activity.title}</span>
                  {resolved && (
                    <button
                      className="dashboard-object-link"
                      onClick={() => onOpenObject(ref)}
                    >
                      {resolved.icon} {resolved.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!currentAlbum && !lastTrack && recentActivity.length === 0 && !topObservation && (
        <div className="section-empty">
          <p className="section-empty-title">The studio is ready.</p>
          <p className="section-empty-subtitle">
            Create a project and start planning tracks — the dashboard will reflect your work.
          </p>
        </div>
      )}
    </section>
  );
}

export default StudioDashboardView;

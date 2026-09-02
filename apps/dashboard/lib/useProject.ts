"use client";

import { useEffect, useState } from "react";
import { api, getToken } from "./api";

export interface ProjectInfo {
  id: string;
  name: string;
  projectToken: string;
  repoFullName: string | null;
  installationId: number | null;
  maxDiffPixelRatio: number;
  autoAcceptFirstBuild: boolean;
  a11yEnabled: boolean;
}

interface Me {
  id: string;
  email: string;
  name: string;
}

/** Module-level cache so the TopBar breadcrumb and pages share one fetch per
 *  project. Subscribers re-render on prime/invalidate. */
const projects = new Map<string, ProjectInfo>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function primeProject(project: ProjectInfo): void {
  projects.set(project.id, project);
  notify();
}

export function invalidateProject(id: string): void {
  projects.delete(id);
  notify();
}

function useCacheVersion(): void {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

export function useProject(id: string | undefined): ProjectInfo | null {
  useCacheVersion();
  const cached = id ? projects.get(id) : undefined;
  const missing = !!id && cached === undefined;
  useEffect(() => {
    if (!id || !missing) return;
    let alive = true;
    void api<ProjectInfo>(`/projects/${id}`)
      .then((project) => {
        if (alive) primeProject(project);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id, missing]);
  return cached ?? null;
}

let me: Me | null = null;

export function useMe(): Me | null {
  useCacheVersion();
  useEffect(() => {
    // Signed-out visitors (e.g. the login page) must not probe /me — the 401
    // handling would bounce the page.
    if (me || getToken() === null) return;
    let alive = true;
    void api<Me>("/me")
      .then((user) => {
        if (!alive) return;
        me = user;
        notify();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return me;
}

export function clearSessionCache(): void {
  projects.clear();
  me = null;
  notify();
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@soroush.tech/design-system/Button";
import { Card } from "@soroush.tech/design-system/Card";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Grid } from "@soroush.tech/design-system/Grid";
import { LinearProgress } from "@soroush.tech/design-system/LinearProgress";
import { TextInput } from "@soroush.tech/design-system/TextInput";
import { Typography } from "@soroush.tech/design-system/Typography";
import { NavLink, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";

interface ProjectRow {
  id: string;
  name: string;
  repoFullName: string | null;
  buildCount: number;
  latestBuild: { id: string; number: number; status: string } | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");

  const load = () => api<ProjectRow[]>("/projects").then(setProjects).catch(() => undefined);
  useEffect(() => {
    void load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    await api("/projects", {
      method: "POST",
      body: JSON.stringify({ name, repoFullName: repo || undefined }),
    });
    setName("");
    setRepo("");
    await load();
  }

  if (!projects) return <LinearProgress />;

  return (
    <Flex gap={3}>
      <Typography variant="h3">Projects</Typography>

      <Grid gridTemplateColumns="repeat(auto-fill, minmax(240px, 1fr))" gap={1.5}>
        {projects.map((p) => (
          <NavLink key={p.id} href={`/projects/${p.id}`}>
            <Card variant="interactive" height="100%">
              <Flex flexDirection="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="h6" color="initial" noWrap>
                  {p.name}
                </Typography>
                {p.latestBuild && <StatusBadge status={p.latestBuild.status} />}
              </Flex>
              <Typography variant="body2" color="secondary" mt={1}>
                {p.repoFullName ?? "no repo linked"} · {p.buildCount} builds
              </Typography>
            </Card>
          </NavLink>
        ))}
        {projects.length === 0 && (
          <Typography variant="body2" color="secondary">
            No projects yet — create one below.
          </Typography>
        )}
      </Grid>

      <Card variant="bracketBox" title="New project" maxWidth="480px">
        <Flex as="form" onSubmit={createProject} gap={1.5} mt={1}>
          <TextInput
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextInput
            placeholder="github repo (owner/name, optional)"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            fullWidth
          />
          <Button type="submit">Create</Button>
        </Flex>
      </Card>
    </Flex>
  );
}

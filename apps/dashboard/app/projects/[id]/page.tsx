"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@soroush.tech/design-system/Button";
import { Flex } from "@soroush.tech/design-system/Flex";
import { LinearProgress } from "@soroush.tech/design-system/LinearProgress";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@soroush.tech/design-system/Table";
import { Typography } from "@soroush.tech/design-system/Typography";
import { NavLink, StatusBadge, TokenCode } from "@/components/ui";
import { api } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  projectToken: string;
  repoFullName: string | null;
  installationId: number | null;
}

interface BuildRow {
  id: string;
  number: number;
  status: string;
  branch: string;
  commitSha: string;
  changedCount: number;
  newCount: number;
  storyCount: number;
  createdAt: string;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    void api<Project>(`/projects/${id}`).then(setProject).catch(() => undefined);
    void api<BuildRow[]>(`/projects/${id}/builds`).then(setBuilds).catch(() => undefined);
  }, [id]);

  if (!project || !builds) return <LinearProgress />;

  return (
    <Flex gap={2}>
      <Typography variant="body2">
        <NavLink href="/">← projects</NavLink>
      </Typography>

      <Flex flexDirection="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h3">{project.name}</Typography>
        <Button variant="outlined" size="sm" onClick={() => setShowToken((v) => !v)}>
          {showToken ? "Hide token" : "Show project token"}
        </Button>
      </Flex>
      {showToken && (
        <Typography variant="body2">
          <TokenCode>{project.projectToken}</TokenCode>
        </Typography>
      )}
      <Typography variant="body2" color="secondary">
        {project.repoFullName ?? "no repo linked"} ·{" "}
        {project.installationId ? "GitHub App installed" : "GitHub App not installed"}
      </Typography>

      <TableContainer>
        <Table size="sm">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>status</TableCell>
              <TableCell>branch</TableCell>
              <TableCell>commit</TableCell>
              <TableCell>changes</TableCell>
              <TableCell>when</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {builds.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <NavLink href={`/builds/${b.id}`}>#{b.number}</NavLink>
                </TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell>{b.branch}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="secondary" fontFamily="mono">
                    {b.commitSha.slice(0, 8)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="secondary">
                    {b.changedCount} changed / {b.newCount} new / {b.storyCount} total
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="secondary">
                    {new Date(b.createdAt).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {builds.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="secondary">
                    No builds yet — run the DiffChroma action or `pnpm simulate`.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Flex>
  );
}

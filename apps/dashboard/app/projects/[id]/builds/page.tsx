"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { NavLink, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";

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

export default function BuildsPage() {
  const { id } = useParams<{ id: string }>();
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);

  useEffect(() => {
    void api<BuildRow[]>(`/projects/${id}/builds`).then(setBuilds).catch(() => undefined);
  }, [id]);

  if (!builds) return <LinearProgress />;

  return (
    <Flex gap={2}>
      <Typography variant="h3">Builds</Typography>

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
                  <NavLink href={`/projects/${id}/builds/${b.id}`}>#{b.number}</NavLink>
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

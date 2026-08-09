"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@soroush.tech/design-system/Card";
import { LinearProgress } from "@soroush.tech/design-system/LinearProgress";
import { Typography } from "@soroush.tech/design-system/Typography";
import { Main } from "@/components/chrome/Main";
import { NavLink } from "@/components/ui";
import { api } from "@/lib/api";

/** Legacy route kept alive forever: GitHub Check Runs and PR comments embed
 *  /builds/:id permanently. Resolves the owning project, then forwards to the
 *  canonical nested route. */
export default function LegacyBuildRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    void api<{ project: { id: string } }>(`/builds/${id}`)
      .then((build) => {
        if (alive) router.replace(`/projects/${build.project.id}/builds/${id}`);
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [id, router]);

  if (notFound) {
    return (
      <Main>
        <Card variant="bracketBox" title="Build not found" maxWidth="480px" mx="auto" mt={8}>
          <Typography variant="body2" color="secondary" mt={1}>
            This build no longer exists or belongs to another account.{" "}
            <NavLink href="/">Go to projects</NavLink>
          </Typography>
        </Card>
      </Main>
    );
  }
  return (
    <Main>
      <LinearProgress />
    </Main>
  );
}

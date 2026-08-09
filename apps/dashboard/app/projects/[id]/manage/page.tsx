"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "@soroush.tech/design-system";
import { Button } from "@soroush.tech/design-system/Button";
import { Flex } from "@soroush.tech/design-system/Flex";
import { SettingRowsSkeleton, StatStripSkeleton } from "@/components/Skeletons";
import { Switch } from "@soroush.tech/design-system/Switch";
import { TextInput } from "@soroush.tech/design-system/TextInput";
import { Typography } from "@soroush.tech/design-system/Typography";
import { PageCard } from "@/components/PageCard";
import { PageHeader } from "@/components/PageHeader";
import { SectionLabel } from "@/components/SectionLabel";
import { SettingCard, SettingGroup } from "@/components/SettingCard";
import { StatStrip } from "@/components/StatStrip";
import { TabNav } from "@/components/TabNav";
import { NavLink, TokenCode } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { primeProject, useProject, type ProjectInfo } from "@/lib/useProject";

const Content = styled("div")({
  marginTop: "30px",
  marginBottom: "3rem",
  display: "flex",
  flexDirection: "column",
  gap: "3rem",
});

const Group = styled("section")({
  "& > h3": { marginBottom: "12px" },
});

interface Usage {
  month: string;
  snapshotsThisMonth: number;
  visualThisMonth: number;
  a11yThisMonth: number;
  buildsThisMonth: number;
  componentCount: number;
}

const TABS = [
  { key: "automate", label: "Automate" },
  { key: "configure", label: "Configure" },
];

const ENABLED = { label: "Enabled", tone: "success" as const };
const DISABLED = { label: "Disabled", tone: "warning" as const };

export default function ManagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "configure" ? "configure" : "automate";

  const project = useProject(id);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [thresholdDraft, setThresholdDraft] = useState<string | null>(null);

  useEffect(() => {
    void api<Usage>(`/projects/${id}/usage`).then(setUsage).catch(() => undefined);
  }, [id]);

  async function patch(field: string, data: Partial<ProjectInfo>) {
    setBusy(field);
    setError(null);
    try {
      const updated = await api<ProjectInfo>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      primeProject(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "update failed");
    } finally {
      setBusy(null);
    }
  }

  function copyToken() {
    if (!project) return;
    void navigator.clipboard.writeText(project.projectToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!project) {
    return (
      <>
        <PageHeader title="Manage" />
        <Content>
          <SettingGroup>
            <SettingRowsSkeleton />
          </SettingGroup>
        </Content>
      </>
    );
  }

  const githubAppUrl = process.env.NEXT_PUBLIC_GITHUB_APP_URL;
  const name = nameDraft ?? project.name;
  const threshold = thresholdDraft ?? String(project.maxDiffPixelRatio);

  return (
    <>
      <PageHeader title="Manage" />

      <TabNav
        tabs={TABS}
        active={tab}
        onChange={(key) =>
          router.replace(`/projects/${id}/manage?tab=${key}`, { scroll: false })
        }
        label="Manage sections"
      />

      {error && (
        <Typography variant="body2" color="error" mt={2}>
          {error}
        </Typography>
      )}

      {tab === "automate" && (
        <Content>
          <Group>
            <SectionLabel>Continuous integration</SectionLabel>
            <SettingGroup>
              <SettingCard
                icon="hub"
                title="GitHub App"
                status={project.installationId ? { label: "Installed", tone: "success" } : DISABLED}
                description={
                  project.installationId
                    ? `Build statuses are posted to ${project.repoFullName ?? "your repository"} as check runs.`
                    : "Install the GitHub App to post build statuses to pull requests as check runs."
                }
                action={
                  project.installationId && project.repoFullName ? (
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => window.open(`https://github.com/${project.repoFullName}`, "_blank")}
                    >
                      View repository
                    </Button>
                  ) : githubAppUrl ? (
                    <Button size="sm" onClick={() => window.open(githubAppUrl, "_blank")}>
                      Install
                    </Button>
                  ) : (
                    <Typography variant="caption" color="secondary">
                      Set NEXT_PUBLIC_GITHUB_APP_URL to enable install
                    </Typography>
                  )
                }
              />
              <SettingCard
                icon="lock"
                title="Project token"
                description="Authenticates uploads from CI and the simulate script. Keep it secret."
                action={
                  <Flex flexDirection="row" gap={1}>
                    <Button variant="outlined" size="sm" onClick={() => setShowToken((v) => !v)}>
                      {showToken ? "Hide" : "Reveal"}
                    </Button>
                    <Button variant="outlined" size="sm" onClick={copyToken}>
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </Flex>
                }
              >
                {showToken && (
                  <Typography variant="body2" mt={1}>
                    <TokenCode>{project.projectToken}</TokenCode>
                  </Typography>
                )}
              </SettingCard>
              <SettingCard
                icon="speed"
                title="Auto-accept first build"
                status={project.autoAcceptFirstBuild ? ENABLED : DISABLED}
                description="Automatically approve every snapshot of a project's first build so it becomes the initial baseline."
                action={
                  <Switch
                    checked={project.autoAcceptFirstBuild}
                    disabled={busy === "autoAccept"}
                    onChange={(e) => void patch("autoAccept", { autoAcceptFirstBuild: e.target.checked })}
                    aria-label="Auto-accept first build"
                  />
                }
              />
            </SettingGroup>
          </Group>

          <Group>
            <SectionLabel>Usage</SectionLabel>
            <PageCard>
              {usage ? (
                <Flex gap={1.5}>
                  <StatStrip
                    primary={{ label: `Snapshots in ${usage.month}`, value: usage.snapshotsThisMonth }}
                    items={[
                      { label: "Visual", value: usage.visualThisMonth },
                      { label: "Accessibility", value: usage.a11yThisMonth },
                      { label: "Builds", value: usage.buildsThisMonth },
                      { label: "Components", value: usage.componentCount },
                    ]}
                  />
                  <Typography variant="caption">
                    <NavLink href={`/projects/${id}/builds`}>View builds</NavLink>
                  </Typography>
                </Flex>
              ) : (
                <StatStripSkeleton />
              )}
            </PageCard>
          </Group>
        </Content>
      )}

      {tab === "configure" && (
        <Content>
          <SettingGroup>
            <SettingCard
              icon="edit_note"
              title="Project name"
              description="Shown across the dashboard and in GitHub check runs."
              action={
                <Button
                  size="sm"
                  disabled={busy === "name" || name.trim() === "" || name === project.name}
                  onClick={() => void patch("name", { name: name.trim() })}
                >
                  Save
                </Button>
              }
            >
              <TextInput
                value={name}
                onChange={(e) => setNameDraft(e.target.value)}
                maxWidth="320px"
                size="sm"
                aria-label="Project name"
              />
            </SettingCard>
            <SettingCard
              icon="visibility"
              title="Visual tests"
              status={ENABLED}
              description="Every build screenshots each story and compares it with the accepted baseline. The diff threshold is the fraction of pixels (0–1) allowed to differ before a story counts as changed."
              action={
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={busy === "threshold" || threshold === String(project.maxDiffPixelRatio)}
                  onClick={() => {
                    const value = Number(threshold);
                    if (Number.isFinite(value) && value >= 0 && value <= 1) {
                      void patch("threshold", { maxDiffPixelRatio: value });
                      setThresholdDraft(null);
                    } else {
                      setError("diff threshold must be between 0 and 1");
                    }
                  }}
                >
                  Save threshold
                </Button>
              }
            >
              <TextInput
                value={threshold}
                onChange={(e) => setThresholdDraft(e.target.value)}
                maxWidth="120px"
                size="sm"
                aria-label="Diff threshold (0 to 1)"
              />
            </SettingCard>
            <SettingCard
              icon="checklist"
              title="Accessibility tests"
              status={project.a11yEnabled ? ENABLED : DISABLED}
              description={
                <>
                  Run an axe audit for every story on each build to track accessibility violations
                  over time. Results appear on the{" "}
                  <NavLink href={`/projects/${id}/a11y`}>Accessibility page</NavLink>.
                </>
              }
              action={
                <Switch
                  checked={project.a11yEnabled}
                  disabled={busy === "a11y"}
                  onChange={(e) => void patch("a11y", { a11yEnabled: e.target.checked })}
                  aria-label="Accessibility tests"
                />
              }
            />
          </SettingGroup>
        </Content>
      )}
    </>
  );
}

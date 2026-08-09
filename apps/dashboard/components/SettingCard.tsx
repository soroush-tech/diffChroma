"use client";

import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";
import { Card } from "@soroush.tech/design-system/Card";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Icon, type IconName } from "@soroush.tech/design-system/Icon";
import { Link } from "@soroush.tech/design-system/Link";
import { Typography } from "@soroush.tech/design-system/Typography";

const Row = styled("section")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: "16px",
  padding: "24px",
  borderBottom: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  "&:last-of-type": { borderBottom: "none" },
}));

const StatusWord = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: PaletteColor }>(({ theme, tone }) => ({
  fontWeight: theme.fontWeights.normal,
  color: theme.palette[tone].main,
}));

export interface SettingStatus {
  label: string;
  tone: PaletteColor;
}

/** One setting row: icon | title+status+description(+children) | right action. */
export function SettingCard({
  icon,
  title,
  status,
  description,
  learnMoreHref,
  action,
  children,
}: {
  icon: IconName;
  title: string;
  status?: SettingStatus;
  description: React.ReactNode;
  learnMoreHref?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Row>
      <Flex flexShrink={0} pt={0.5}>
        <Icon name={icon} size="2rem" color="secondary" />
      </Flex>
      <Flex gap={0.5} maxWidth="600px" flexGrow={1} minWidth="240px">
        <Typography variant="body1" fontWeight="bold" as="h4" m={0}>
          {title}
          {status && (
            <>
              {": "}
              <StatusWord tone={status.tone}>{status.label}</StatusWord>
            </>
          )}
        </Typography>
        <Typography variant="body2" color="secondary">
          {description}{" "}
          {learnMoreHref && (
            <Link href={learnMoreHref} target="_blank" rel="noreferrer">
              Learn more
            </Link>
          )}
        </Typography>
        {children}
      </Flex>
      {action && (
        <Flex flexDirection="row" alignItems="flex-start" justifyContent="flex-end" ml="auto">
          {action}
        </Flex>
      )}
    </Row>
  );
}

/** Card that stacks SettingCard rows with hairline separators. */
export function SettingGroup({ children }: { children: React.ReactNode }) {
  return <Card p={0}>{children}</Card>;
}

"use client";

import { styled } from "@soroush.tech/design-system";
import type { PaletteColor } from "@soroush.tech/design-system";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Icon, type IconName } from "@soroush.tech/design-system/Icon";
import { Link } from "@soroush.tech/design-system/Link";
import { PageCard } from "./PageCard";

const Row = styled("section")(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  padding: "20px",
  borderBottom: `${theme.borderWidths.thin} solid ${theme.border.default}`,
  "&:last-of-type": { borderBottom: "none" },
  "@media (min-width: 800px)": { padding: "30px" },
}));

const IconBox = styled("div")({
  width: "48px",
  height: "48px",
  flexShrink: 0,
  marginRight: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const Body = styled("div")({
  flex: "1 1 240px",
  maxWidth: "600px",
  paddingRight: "30px",
  fontSize: "14px",
  lineHeight: "20px",
});

const TitleRow = styled("h4")(({ theme }) => ({
  margin: "0 0 0.125rem",
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: theme.fontWeights.bold,
  color: theme.text.initial,
}));

const StatusWord = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone: PaletteColor }>(({ theme, tone }) => ({
  fontWeight: theme.fontWeights.normal,
  color: theme.palette[tone].main,
}));

const Description = styled("p")(({ theme }) => ({
  margin: 0,
  color: theme.text.secondary,
}));

const Actions = styled("div")({
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "1rem",
  width: "100%",
  "@media (min-width: 800px)": {
    flex: "0 1 auto",
    width: "auto",
    marginTop: 0,
    marginLeft: "auto",
  },
});

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
      <IconBox>
        <Icon name={icon} size="2rem" color="secondary" />
      </IconBox>
      <Body>
        <TitleRow>
          {title}
          {status && (
            <>
              {": "}
              <StatusWord tone={status.tone}>{status.label}</StatusWord>
            </>
          )}
        </TitleRow>
        <Description>
          {description}{" "}
          {learnMoreHref && (
            <Link href={learnMoreHref} target="_blank" rel="noreferrer">
              Learn more
            </Link>
          )}
        </Description>
        {children && <Flex mt={1}>{children}</Flex>}
      </Body>
      {action && <Actions>{action}</Actions>}
    </Row>
  );
}

/** Card that stacks SettingCard rows with hairline separators. */
export function SettingGroup({ children }: { children: React.ReactNode }) {
  return <PageCard flush>{children}</PageCard>;
}

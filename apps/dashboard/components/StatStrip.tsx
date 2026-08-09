"use client";

import { styled } from "@soroush.tech/design-system";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Typography } from "@soroush.tech/design-system/Typography";

const Divider = styled("div")(({ theme }) => ({
  alignSelf: "stretch",
  width: "1px",
  backgroundColor: theme.border.default,
}));

export interface StatItem {
  label: string;
  value: React.ReactNode;
}

/** Hero number + divider + row of secondary stats (usage card, summaries). */
export function StatStrip({ primary, items }: { primary: StatItem; items: StatItem[] }) {
  return (
    <Flex flexDirection="row" alignItems="center" flexWrap="wrap" gap={3}>
      <Flex gap={0.5}>
        <Typography variant="h3" as="div">
          {primary.value}
        </Typography>
        <Typography variant="body2" color="secondary">
          {primary.label}
        </Typography>
      </Flex>
      {items.length > 0 && <Divider />}
      {items.map((item) => (
        <Flex key={item.label} gap={0.5}>
          <Typography variant="h5" as="div">
            {item.value}
          </Typography>
          <Typography variant="caption" color="secondary">
            {item.label}
          </Typography>
        </Flex>
      ))}
    </Flex>
  );
}

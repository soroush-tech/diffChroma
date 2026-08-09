"use client";

import { styled } from "@soroush.tech/design-system";
import { Icon } from "@soroush.tech/design-system/Icon";
import { TextInput } from "@soroush.tech/design-system/TextInput";

const Wrap = styled("div")({
  position: "relative",
  width: "100%",
  maxWidth: "320px",
});

const Magnifier = styled(Icon)({
  position: "absolute",
  left: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
});

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <Wrap>
      <Magnifier name="zoom_in" color="secondary" size="1rem" />
      <TextInput
        aria-label={label ?? placeholder ?? "Search"}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        fullWidth
        pl={4}
        size="sm"
      />
    </Wrap>
  );
}

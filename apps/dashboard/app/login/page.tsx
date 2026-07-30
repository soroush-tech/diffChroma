"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@soroush.tech/design-system/Button";
import { Card } from "@soroush.tech/design-system/Card";
import { Flex } from "@soroush.tech/design-system/Flex";
import { TextInput } from "@soroush.tech/design-system/TextInput";
import { Typography } from "@soroush.tech/design-system/Typography";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="bracketBox" title="Sign in" maxWidth="380px" mx="auto" mt={8}>
      <Flex as="form" onSubmit={submit} gap={1.5} mt={1}>
        <TextInput
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
        />
        <TextInput
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
        <Button type="submit" loading={busy} fullWidth>
          Sign in
        </Button>
      </Flex>
    </Card>
  );
}

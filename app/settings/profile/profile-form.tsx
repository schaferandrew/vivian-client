"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FieldErrorText, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  applyThemeToDocument,
  THEME_STORAGE_KEY,
  isThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().max(255, "Name is too long.").optional(),
  email: z.string().trim().email("Enter a valid email address."),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: {
    name: string;
    email: string;
  };
}

const THEME_CHOICES: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Bright backgrounds",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light friendly",
    Icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device",
    Icon: Monitor,
  },
];

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          current_password: values.currentPassword,
          new_password: values.newPassword,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Failed to update profile");
      }

      setSuccess("Profile updated successfully.");
      reset(values); // Update form dirty state
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme = isThemePreference(storedTheme) ? storedTheme : "system";

    setThemePreference(nextTheme);
    applyThemeToDocument(nextTheme);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (themePreference === "system") {
        applyThemeToDocument("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [themePreference]);

  const handleThemePreferenceChange = (nextTheme: ThemePreference) => {
    setThemePreference(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyThemeToDocument(nextTheme);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Change your identity and sign-in details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField htmlFor="profile-name" label="Name" error={errors.name?.message}>
              <Input
                id="profile-name"
                placeholder="Your name"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby="profile-name-error"
                {...register("name")}
              />
            </FormField>

            <FormField htmlFor="profile-email" label="Email" error={errors.email?.message}>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby="profile-email-error"
                {...register("email")}
                required
              />
            </FormField>

            <FormField
              htmlFor="profile-current-password"
              label="Current password"
              error={errors.currentPassword?.message}
            >
              <Input
                id="profile-current-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.currentPassword ? "true" : "false"}
                aria-describedby="profile-current-password-error"
                {...register("currentPassword")}
              />
            </FormField>

            <FormField
              htmlFor="profile-new-password"
              label="New password"
              error={errors.newPassword?.message}
            >
              <Input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.newPassword ? "true" : "false"}
                aria-describedby="profile-new-password-error"
                {...register("newPassword")}
              />
            </FormField>

            {error && <FieldErrorText id="profile-error" message={error} />}
            {success && (
              <p className="text-sm text-[var(--success-600)]">{success}</p>
            )}

            <Button type="submit" loading={isLoading} loadingText="Saving...">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how Vivian looks on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Theme</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {THEME_CHOICES.map(({ value, label, description, Icon }) => {
              const isActive = themePreference === value;

              return (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => handleThemePreferenceChange(value)}
                  className={cn(
                    "h-auto justify-start gap-3 px-3 py-3 text-left",
                    isActive
                      ? "border-[var(--primary-300)] bg-[var(--primary-50)] text-[var(--primary-900)] hover:bg-[var(--primary-100)] dark:border-[var(--primary-700)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-50)] dark:hover:bg-[var(--primary-800)]"
                      : "border-[var(--neutral-300)] hover:border-[var(--neutral-400)] dark:border-[var(--neutral-700)] dark:hover:border-[var(--neutral-600)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{label}</div>
                    <div
                      className={cn(
                        "text-xs",
                        isActive ? "text-[var(--primary-700)] dark:text-[var(--primary-300)]" : "text-muted-foreground"
                      )}
                    >
                      {description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            This preference is saved locally for this browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of your account on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

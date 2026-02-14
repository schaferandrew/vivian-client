import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Use your Vivian account credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <FormField htmlFor="email" label="Email">
            <Input id="email" type="email" disabled placeholder="Loading..." />
          </FormField>
          <FormField htmlFor="password" label="Password (optional)">
            <Input id="password" type="password" disabled placeholder="Loading..." />
          </FormField>
          <Button className="w-full" disabled>
            Loading...
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
